-- Owner-written boat procedures, indexed alongside manual excerpts (#21).

create table public.boat_procedures (
  id uuid primary key default gen_random_uuid(),
  boat_id uuid not null references public.boats (id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 120),
  content text not null check (length(trim(content)) between 1 and 12000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, boat_id)
);

create index boat_procedures_boat_id_idx on public.boat_procedures (boat_id);

create function public.set_boat_procedure_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger boat_procedures_updated_at
  before update on public.boat_procedures
  for each row execute function public.set_boat_procedure_updated_at();

revoke all on public.boat_procedures from anon, authenticated, service_role;
grant select, insert, update, delete on public.boat_procedures to authenticated;

alter table public.boat_procedures enable row level security;

create policy "boat procedures: members see"
  on public.boat_procedures for select to authenticated
  using (public.can_read_boat(boat_id));

create policy "boat procedures: owners and co-owners add"
  on public.boat_procedures for insert to authenticated
  with check (public.my_role_on(boat_id) in ('owner', 'co_owner'));

create policy "boat procedures: owners and co-owners edit"
  on public.boat_procedures for update to authenticated
  using (public.my_role_on(boat_id) in ('owner', 'co_owner'))
  with check (public.my_role_on(boat_id) in ('owner', 'co_owner'));

create policy "boat procedures: owners and co-owners delete"
  on public.boat_procedures for delete to authenticated
  using (public.my_role_on(boat_id) in ('owner', 'co_owner'));

create table public.procedure_chunks (
  id uuid primary key default gen_random_uuid(),
  boat_id uuid not null references public.boats (id) on delete cascade,
  procedure_id uuid not null,
  chunk_index integer not null check (chunk_index >= 0),
  content text not null check (length(content) > 0),
  embedding extensions.vector(1024) not null,
  embedding_model text not null check (length(embedding_model) between 1 and 100),
  created_at timestamptz not null default now(),
  foreign key (procedure_id, boat_id) references public.boat_procedures (id, boat_id) on delete cascade,
  unique (procedure_id, chunk_index)
);

create index procedure_chunks_boat_id_idx on public.procedure_chunks (boat_id);
create index procedure_chunks_embedding_idx
  on public.procedure_chunks using hnsw (embedding extensions.vector_cosine_ops);

revoke all on public.procedure_chunks from anon, authenticated, service_role;
grant select, insert, delete on public.procedure_chunks to authenticated;
-- Trusted indexing jobs use the service role, matching `document_chunks`.
grant select, insert, delete on public.procedure_chunks to service_role;

alter table public.procedure_chunks enable row level security;

create policy "procedure chunks: members see"
  on public.procedure_chunks for select to authenticated
  using (public.can_read_boat(boat_id));

create policy "procedure chunks: owners and co-owners add"
  on public.procedure_chunks for insert to authenticated
  with check (public.my_role_on(boat_id) in ('owner', 'co_owner'));

create policy "procedure chunks: owners and co-owners remove"
  on public.procedure_chunks for delete to authenticated
  using (public.my_role_on(boat_id) in ('owner', 'co_owner'));

-- Save the editable procedure and its derived chunks together, so a failed embedding or write
-- never leaves a procedure with stale search results.
create function public.save_boat_procedure(
  target_boat_id uuid,
  target_procedure_id uuid,
  procedure_title text,
  procedure_content text,
  chunks_to_store jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved_id uuid;
begin
  if jsonb_typeof(chunks_to_store) is distinct from 'array' then
    raise exception 'Procedure chunks must be an array' using errcode = '22023';
  end if;
  if jsonb_array_length(chunks_to_store) = 0 then
    raise exception 'A procedure must have at least one indexed chunk' using errcode = '22023';
  end if;

  if target_procedure_id is null then
    insert into public.boat_procedures (boat_id, title, content)
    values (target_boat_id, procedure_title, procedure_content)
    returning id into saved_id;
  else
    update public.boat_procedures
      set title = procedure_title, content = procedure_content
      where id = target_procedure_id and boat_id = target_boat_id
      returning id into saved_id;
    if saved_id is null then
      raise exception 'Procedure not found or not writable' using errcode = '42501';
    end if;
  end if;

  delete from public.procedure_chunks
  where procedure_id = saved_id and boat_id = target_boat_id;

  insert into public.procedure_chunks (boat_id, procedure_id, chunk_index, content, embedding, embedding_model)
  select target_boat_id, saved_id, chunk_index, content, embedding::extensions.vector(1024), embedding_model
  from jsonb_to_recordset(chunks_to_store) as chunk(
    chunk_index integer,
    content text,
    embedding text,
    embedding_model text
  );

  return saved_id;
end;
$$;

revoke execute on function public.save_boat_procedure(uuid, uuid, text, text, jsonb)
  from public, anon;
grant execute on function public.save_boat_procedure(uuid, uuid, text, text, jsonb)
  to authenticated;

-- Search manuals and owner-written procedures in one boat-scoped result set. The source columns
-- are mutually exclusive so the answering code can cite the right name and freshness date.
drop function public.search_document_chunks(extensions.vector, text, integer, uuid);

create function public.search_document_chunks(
  query_embedding extensions.vector(1024),
  model text,
  match_count integer default 5,
  only_boat_id uuid default null
)
returns table (
  chunk_id uuid,
  boat_id uuid,
  source_type text,
  document_id uuid,
  procedure_id uuid,
  filename text,
  procedure_title text,
  document_received_at timestamptz,
  procedure_updated_at timestamptz,
  page integer,
  content text,
  indexed_at timestamptz,
  similarity double precision
)
language sql
stable
security invoker
set search_path = ''
as $$
  with matches as (
    select
      c.id as chunk_id,
      c.boat_id,
      'document'::text as source_type,
      c.document_id,
      null::uuid as procedure_id,
      d.filename,
      null::text as procedure_title,
      d.received_at as document_received_at,
      null::timestamptz as procedure_updated_at,
      c.page,
      c.content,
      c.created_at as indexed_at,
      1 - (c.embedding operator(extensions.<=>) query_embedding) as similarity
    from public.document_chunks c
    join public.documents d on d.id = c.document_id and d.boat_id = c.boat_id
    where public.can_read_boat(c.boat_id)
      and (only_boat_id is null or c.boat_id = only_boat_id)
      and c.embedding_model = model

    union all

    select
      c.id as chunk_id,
      c.boat_id,
      'procedure'::text as source_type,
      null::uuid as document_id,
      c.procedure_id,
      null::text as filename,
      p.title as procedure_title,
      null::timestamptz as document_received_at,
      p.updated_at as procedure_updated_at,
      null::integer as page,
      c.content,
      c.created_at as indexed_at,
      1 - (c.embedding operator(extensions.<=>) query_embedding) as similarity
    from public.procedure_chunks c
    join public.boat_procedures p on p.id = c.procedure_id and p.boat_id = c.boat_id
    where public.can_read_boat(c.boat_id)
      and (only_boat_id is null or c.boat_id = only_boat_id)
      and c.embedding_model = model
  )
  select *
  from matches
  order by similarity desc, chunk_id
  limit least(greatest(coalesce(match_count, 5), 1), 50)
$$;

revoke execute on function public.search_document_chunks(extensions.vector, text, integer, uuid)
  from public, anon;
grant execute on function public.search_document_chunks(extensions.vector, text, integer, uuid)
  to authenticated;
