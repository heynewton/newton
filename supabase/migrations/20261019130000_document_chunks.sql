-- Search over a boat's manuals (#13): pgvector, a `document_chunks` table with one row per
-- chunk of a document's text, and `search_document_chunks()` for the closest chunks to a
-- question.
--
-- Chunks are derived from a document: indexing (packages/indexing) deletes a document's chunks
-- and inserts new ones, so there is no update. Each chunk keeps its page, for citing the source,
-- and the model that embedded it, so the boat can be re-embedded with another model later
-- (docs/decisions/0004-embeddings.md). Search runs as the caller, so row-level security keeps it
-- to the caller's own boats.

create extension if not exists vector with schema extensions;

-- Table -------------------------------------------------------------------------------------

create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  boat_id uuid not null references public.boats (id) on delete cascade,
  document_id uuid not null,
  -- Page in the PDF, from 1. A chunk never spans two pages.
  page integer not null check (page >= 1),
  -- Order of the chunk within the document, from 0.
  chunk_index integer not null check (chunk_index >= 0),
  content text not null check (length(content) > 0),
  -- 1024 dimensions: voyage-4 by default, and also mistral-embed and bge-m3 (see the decision).
  embedding extensions.vector(1024) not null,
  -- The model that made `embedding`, for example 'voyage-4'. Search only compares a question
  -- with chunks from the same model.
  embedding_model text not null check (length(embedding_model) between 1 and 100),
  created_at timestamptz not null default now(),
  -- (document, boat) together, like the records tables, so a chunk's boat is its document's.
  foreign key (document_id, boat_id) references public.documents (id, boat_id) on delete cascade,
  unique (document_id, chunk_index)
);

create index document_chunks_boat_id_idx on public.document_chunks (boat_id);
create index document_chunks_embedding_idx
  on public.document_chunks using hnsw (embedding extensions.vector_cosine_ops);

-- Privileges --------------------------------------------------------------------------------

revoke all on public.document_chunks from anon, authenticated, service_role;

grant select, insert, delete on public.document_chunks to authenticated;
-- The indexing job runs as the server (service role), like email-in: it reads the document and
-- replaces its chunks. Hosted projects don't grant new tables to service_role on their own.
grant select, insert, delete on public.document_chunks to service_role;
grant select on public.documents to service_role;

-- Row-level security ------------------------------------------------------------------------

alter table public.document_chunks enable row level security;

create policy "document chunks: members see"
  on public.document_chunks for select to authenticated
  using (public.can_read_boat(boat_id));

create policy "document chunks: writers add"
  on public.document_chunks for insert to authenticated
  with check (public.can_write_boat(boat_id));

-- Re-indexing removes the old chunks; they are derived data, so any writer may.
create policy "document chunks: writers remove"
  on public.document_chunks for delete to authenticated
  using (public.can_write_boat(boat_id));

-- Search ------------------------------------------------------------------------------------

-- The `match_count` chunks closest to a question's embedding, from the caller's own boats (or one
-- of them), made by the same model. Returns the document's name and dates, so an answer can say
-- where it comes from and how fresh it is.
--
-- Security invoker: the caller's row-level security applies to both tables, and the explicit
-- can_read_boat() check keeps it so even if a policy changes.
create function public.search_document_chunks(
  query_embedding extensions.vector(1024),
  model text,
  match_count integer default 5,
  only_boat_id uuid default null
)
returns table (
  chunk_id uuid,
  boat_id uuid,
  document_id uuid,
  filename text,
  document_received_at timestamptz,
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
  select
    c.id,
    c.boat_id,
    c.document_id,
    d.filename,
    d.received_at,
    c.page,
    c.content,
    c.created_at,
    1 - (c.embedding operator(extensions.<=>) query_embedding)
  from public.document_chunks c
  join public.documents d on d.id = c.document_id and d.boat_id = c.boat_id
  where public.can_read_boat(c.boat_id)
    and (only_boat_id is null or c.boat_id = only_boat_id)
    and c.embedding_model = model
  order by c.embedding operator(extensions.<=>) query_embedding, c.id
  limit least(greatest(coalesce(match_count, 5), 1), 50)
$$;

revoke execute on function public.search_document_chunks(extensions.vector, text, integer, uuid)
  from public, anon;
grant execute on function public.search_document_chunks(extensions.vector, text, integer, uuid)
  to authenticated;
