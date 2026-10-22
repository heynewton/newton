alter table public.documents
  alter column storage_path drop not null,
  add column drive_file_id text,
  add column source_url text,
  add column source_modified_at timestamptz;

alter table public.documents
  drop constraint documents_storage_path_check,
  add constraint documents_storage_path_check
    check (
      (source = 'drive' and storage_path is null and drive_file_id is not null and source_url is not null)
      or
      (source <> 'drive' and storage_path is not null and drive_file_id is null and source_url is null
       and split_part(storage_path, '/', 1) = boat_id::text and length(storage_path) > 37)
    ),
  add constraint documents_drive_file_id_check
    check (drive_file_id is null or length(drive_file_id) between 1 and 200),
  add constraint documents_source_url_check
    check (source_url is null or length(source_url) <= 2048);

create unique index documents_boat_drive_file_id_idx
  on public.documents (boat_id, drive_file_id)
  where drive_file_id is not null;

grant delete on public.documents to service_role;

comment on column public.documents.storage_path is
  'Null for Google Drive imports: Newton processes file bytes in memory and does not store a copy.';
comment on column public.documents.drive_file_id is
  'The source file ID in Google Drive; used to make a one-time folder import idempotent.';
comment on column public.documents.source_modified_at is
  'Google Drive modification time when the document was imported.';
