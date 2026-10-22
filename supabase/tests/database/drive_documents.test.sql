-- Google Drive documents keep source metadata, not a copied file. Run with `npm run db:test`.

begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

\ir setup/tenancy.psql

insert into public.documents (
  id, boat_id, storage_path, source, drive_file_id, source_url, source_modified_at,
  filename, content_type, size_bytes
) values (
  '20000000-0000-0000-0000-000000000111',
  '10000000-0000-0000-0000-000000000001',
  null,
  'drive',
  'drive-file-111',
  'https://drive.google.com/open?id=drive-file-111',
  '2026-10-21T10:00:00Z',
  'manual.pdf',
  'application/pdf',
  1024
);

select is_null(
  (select storage_path from public.documents where id = '20000000-0000-0000-0000-000000000111'),
  'a Drive document has no stored file path'
);

select is(
  (select count(*)::int from storage.objects where bucket_id = 'documents' and name like '%drive-file-111%'),
  0,
  'a Drive import creates no Storage object'
);

select pg_temp.sign_in_as('ada@example.test');

select results_eq(
  $$ select source::text, drive_file_id, source_url
     from public.documents where id = '20000000-0000-0000-0000-000000000111' $$,
  $$ values ('drive'::text, 'drive-file-111', 'https://drive.google.com/open?id=drive-file-111') $$,
  'a boat member can read Drive source metadata under RLS'
);

select pg_temp.sign_in_as('dev@example.test');

select is_empty(
  $$ select id from public.documents where id = '20000000-0000-0000-0000-000000000111' $$,
  'a person outside the boat cannot read the imported document'
);

select * from finish();
rollback;
