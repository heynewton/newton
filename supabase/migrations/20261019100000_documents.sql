-- Per-boat document store (#8): a private Storage bucket with one folder per boat, and a
-- `documents` table with one row per stored file.
--
-- Files live at `documents/<boat_id>/<anything>`. The folder is the tenant boundary for files,
-- the same way `boat_id` is for rows, and both are enforced by row-level security using the
-- roles from the tenancy migration: members read; owners, co-owners and crew add; owners and
-- co-owners delete; read-only members only read.
--
-- Later issues hang off this table: email-in (#10) adds rows with source 'email', extraction
-- (#11) sets `type`, and maintenance, renewals and expenses (#9) point at `documents (id)`.

-- Table -------------------------------------------------------------------------------------

create type public.document_source as enum ('email', 'upload');

-- What a document is. 'unsorted' until extraction (#11) or a person classifies it.
create type public.document_type as enum (
  'unsorted',
  'email',
  'invoice',
  'receipt',
  'insurance',
  'registration',
  'manual',
  'contract',
  'survey',
  'other'
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  boat_id uuid not null references public.boats (id) on delete cascade,
  -- Path inside the `documents` bucket. Always starts with the boat's folder.
  storage_path text not null unique
    check (split_part(storage_path, '/', 1) = boat_id::text and length(storage_path) > 37),
  type public.document_type not null default 'unsorted',
  source public.document_source not null,
  -- When the file reached Newton (the email's arrival, or the upload).
  received_at timestamptz not null default now(),
  -- As sent or uploaded, for showing and downloading.
  filename text check (length(filename) between 1 and 255),
  content_type text,
  size_bytes bigint check (size_bytes >= 0),
  -- Who added it, for the audit trail. Null for server jobs (email-in runs without a person).
  added_by uuid default public.current_person_id() references public.people (id) on delete set null,
  created_at timestamptz not null default now()
);

create index documents_boat_id_received_at_idx on public.documents (boat_id, received_at desc);

-- Privileges --------------------------------------------------------------------------------

revoke all on public.documents from anon, authenticated;

grant select, delete on public.documents to authenticated;
-- The ID can be chosen by the client, so a file's path can include it before the row exists.
grant insert (id, boat_id, storage_path, type, source, received_at, filename, content_type, size_bytes)
  on public.documents to authenticated;
-- Where a file lives and who added it don't change; what it is and its name can be corrected.
grant update (type, filename) on public.documents to authenticated;

-- Row-level security ------------------------------------------------------------------------

alter table public.documents enable row level security;

create policy "documents: members see"
  on public.documents for select to authenticated
  using (public.can_read_boat(boat_id));

create policy "documents: writers add"
  on public.documents for insert to authenticated
  with check (public.can_write_boat(boat_id));

create policy "documents: writers correct"
  on public.documents for update to authenticated
  using (public.can_write_boat(boat_id))
  with check (public.can_write_boat(boat_id));

create policy "documents: owners and co-owners delete"
  on public.documents for delete to authenticated
  using (public.my_role_on(boat_id) in ('owner', 'co_owner'));

-- Storage -----------------------------------------------------------------------------------

-- Private: files are only reachable through the policies below (or signed URLs made under them).
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false);

-- The boat a stored file belongs to: the first folder of its path, or null if that isn't a
-- boat ID. Null means no policy matches, so a file outside a boat folder can't be written.
create function public.boat_id_from_storage_path(path text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when split_part(path, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and position('/' in path) > 0
    then split_part(path, '/', 1)::uuid
  end
$$;

-- Files can be read, added and deleted, not overwritten: a stored document is evidence, and a
-- correction is a new file. So there is no update policy.
create policy "documents bucket: members read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'documents'
    and public.can_read_boat(public.boat_id_from_storage_path(name))
  );

create policy "documents bucket: writers add"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documents'
    and public.can_write_boat(public.boat_id_from_storage_path(name))
  );

create policy "documents bucket: owners and co-owners delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'documents'
    and public.my_role_on(public.boat_id_from_storage_path(name)) in ('owner', 'co_owner')
  );
