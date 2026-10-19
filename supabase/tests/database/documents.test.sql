-- Row-level security for the document store (#8): the `documents` table and the `documents`
-- Storage bucket. Run with `npm run db:test`.
--
-- The people and boats come from setup/tenancy.psql:
--   Ada:  owner of Kestrel, read-only on Petrel
--   Ben:  owner of Petrel, co-owner of Kestrel
--   Cleo: crew on Kestrel
--   Dev:  on no boat

begin;
create extension if not exists pgtap with schema extensions;
select plan(32);

-- Setup, as the database owner -------------------------------------------------------------

\ir setup/tenancy.psql

-- The Storage API sets this before deleting; direct deletes are refused without it.
set local storage.allow_delete_query = 'true';

-- One file and one document on each boat.
insert into storage.objects (bucket_id, name) values
  ('documents', '10000000-0000-0000-0000-000000000001/survey.pdf'),
  ('documents', '10000000-0000-0000-0000-000000000002/insurance.pdf');

insert into public.documents (id, boat_id, storage_path, type, source, filename) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000001/survey.pdf', 'survey', 'upload', 'survey.pdf'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002',
   '10000000-0000-0000-0000-000000000002/insurance.pdf', 'insurance', 'email', 'insurance.pdf');

select results_eq(
  'select public from storage.buckets where id = ''documents''',
  $$ values (false) $$,
  'the documents bucket exists and is private'
);

select throws_ok(
  $$ insert into public.documents (boat_id, storage_path, source)
     values ('10000000-0000-0000-0000-000000000001',
             '10000000-0000-0000-0000-000000000002/elsewhere.pdf', 'upload') $$,
  '23514',
  null,
  'a document''s path must be in its own boat''s folder'
);

select is(
  public.boat_id_from_storage_path('not-a-boat/file.pdf'),
  null,
  'a path outside a boat folder belongs to no boat'
);

-- Ada: owner of Kestrel, read-only on Petrel -----------------------------------------------

select pg_temp.sign_in_as('ada@example.test');

select results_eq(
  'select filename from public.documents order by filename',
  $$ values ('insurance.pdf'), ('survey.pdf') $$,
  'a member sees the documents of each of their boats'
);

select results_eq(
  'select name from storage.objects where bucket_id = ''documents'' order by name',
  $$ values ('10000000-0000-0000-0000-000000000001/survey.pdf'),
            ('10000000-0000-0000-0000-000000000002/insurance.pdf') $$,
  'a member reads the files of each of their boats'
);

select lives_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('documents', '10000000-0000-0000-0000-000000000001/owner-upload.pdf') $$,
  'an owner can upload a file to their boat'
);

select lives_ok(
  $$ insert into public.documents (boat_id, storage_path, source, filename)
     values ('10000000-0000-0000-0000-000000000001',
             '10000000-0000-0000-0000-000000000001/owner-upload.pdf', 'upload', 'owner-upload.pdf') $$,
  'an owner can add a document to their boat'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('documents', '10000000-0000-0000-0000-000000000002/read-only-upload.pdf') $$,
  '42501',
  null,
  'read-only cannot upload a file'
);

select throws_ok(
  $$ insert into public.documents (boat_id, storage_path, source)
     values ('10000000-0000-0000-0000-000000000002',
             '10000000-0000-0000-0000-000000000002/insurance.pdf', 'upload') $$,
  '42501',
  null,
  'read-only cannot add a document'
);

update public.documents set type = 'other' where id = '20000000-0000-0000-0000-000000000002';
delete from public.documents where id = '20000000-0000-0000-0000-000000000002';
delete from storage.objects where name = '10000000-0000-0000-0000-000000000002/insurance.pdf';
reset role;
select results_eq(
  $$ select d.type::text, (select count(*)::int from storage.objects o where o.name = d.storage_path)
     from public.documents d where d.id = '20000000-0000-0000-0000-000000000002' $$,
  $$ values ('insurance'::text, 1) $$,
  'read-only cannot change, delete or remove the file of a document'
);

-- Cleo: crew on Kestrel --------------------------------------------------------------------

select pg_temp.sign_in_as('cleo@example.test');

select results_eq(
  'select filename from public.documents order by filename',
  $$ values ('owner-upload.pdf'), ('survey.pdf') $$,
  'crew sees only their boat''s documents'
);

select results_eq(
  'select name from storage.objects where bucket_id = ''documents'' order by name',
  $$ values ('10000000-0000-0000-0000-000000000001/owner-upload.pdf'),
            ('10000000-0000-0000-0000-000000000001/survey.pdf') $$,
  'crew reads only their boat''s files'
);

select is_empty(
  $$ select id from public.documents where boat_id = '10000000-0000-0000-0000-000000000002' $$,
  'asking for another boat''s documents by ID returns nothing'
);

select lives_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('documents', '10000000-0000-0000-0000-000000000001/receipts/crew-receipt.jpg') $$,
  'crew can upload a file to their boat, in a subfolder too'
);

select lives_ok(
  $$ insert into public.documents (id, boat_id, storage_path, source, filename, content_type, size_bytes)
     values ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001',
             '10000000-0000-0000-0000-000000000001/receipts/crew-receipt.jpg', 'upload',
             'crew-receipt.jpg', 'image/jpeg', 48213) $$,
  'crew can add a document to their boat'
);

select results_eq(
  $$ select type::text, received_at is not null, added_by = public.current_person_id()
     from public.documents where id = '20000000-0000-0000-0000-000000000003' $$,
  $$ values ('unsorted'::text, true, true) $$,
  'a new document is unsorted, dated now and records who added it'
);

select throws_ok(
  $$ insert into public.documents (boat_id, storage_path, source, added_by)
     values ('10000000-0000-0000-0000-000000000001',
             '10000000-0000-0000-0000-000000000001/forged.pdf', 'upload',
             (select id from person_ids where email = 'ben@example.test')) $$,
  '42501',
  null,
  'nobody can add a document in someone else''s name'
);

update public.documents set type = 'receipt' where id = '20000000-0000-0000-0000-000000000003';
select results_eq(
  $$ select type::text from public.documents where id = '20000000-0000-0000-0000-000000000003' $$,
  $$ values ('receipt'::text) $$,
  'crew can correct what a document is'
);

select throws_ok(
  $$ update public.documents set storage_path = '10000000-0000-0000-0000-000000000001/moved.jpg'
     where id = '20000000-0000-0000-0000-000000000003' $$,
  '42501',
  null,
  'a document''s path cannot be changed'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('documents', '10000000-0000-0000-0000-000000000002/crew-on-wrong-boat.pdf') $$,
  '42501',
  null,
  'crew cannot upload to a boat they are not on'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('documents', 'loose.pdf') $$,
  '42501',
  null,
  'a file cannot be uploaded outside a boat folder'
);

update storage.objects set name = '10000000-0000-0000-0000-000000000001/overwritten.pdf'
where name = '10000000-0000-0000-0000-000000000001/survey.pdf';
delete from public.documents where id = '20000000-0000-0000-0000-000000000001';
delete from storage.objects where name = '10000000-0000-0000-0000-000000000001/survey.pdf';
reset role;
select results_eq(
  $$ select (select count(*)::int from public.documents where id = '20000000-0000-0000-0000-000000000001'),
            (select count(*)::int from storage.objects where name = '10000000-0000-0000-0000-000000000001/survey.pdf') $$,
  $$ values (1, 1) $$,
  'crew cannot delete documents or files, and files cannot be renamed or overwritten'
);

-- Ben: co-owner on Kestrel -----------------------------------------------------------------

select pg_temp.sign_in_as('ben@example.test');

delete from public.documents where id = '20000000-0000-0000-0000-000000000001';
delete from storage.objects where name = '10000000-0000-0000-0000-000000000001/survey.pdf';
reset role;
select results_eq(
  $$ select (select count(*)::int from public.documents where id = '20000000-0000-0000-0000-000000000001'),
            (select count(*)::int from storage.objects where name = '10000000-0000-0000-0000-000000000001/survey.pdf') $$,
  $$ values (0, 0) $$,
  'a co-owner can delete a document and its file'
);

-- Dev: on no boat --------------------------------------------------------------------------

select pg_temp.sign_in_as('dev@example.test');

select is_empty('select id from public.documents', 'a person on no boat sees no documents');
select is_empty(
  'select name from storage.objects where bucket_id = ''documents''',
  'a person on no boat reads no files'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('documents', '10000000-0000-0000-0000-000000000001/stranger.pdf') $$,
  '42501',
  null,
  'a person on no boat cannot upload a file'
);

select throws_ok(
  $$ insert into public.documents (boat_id, storage_path, source)
     values ('10000000-0000-0000-0000-000000000001',
             '10000000-0000-0000-0000-000000000001/stranger.pdf', 'upload') $$,
  '42501',
  null,
  'a person on no boat cannot add a document'
);

-- Removing a boat removes its documents ----------------------------------------------------

reset role;
delete from public.memberships where boat_id = '10000000-0000-0000-0000-000000000002';
delete from public.boats where id = '10000000-0000-0000-0000-000000000002';
select is_empty(
  $$ select id from public.documents where boat_id = '10000000-0000-0000-0000-000000000002' $$,
  'deleting a boat deletes its document rows'
);

-- A person who leaves keeps their documents on the boat, without their name on them.
delete from public.people where email = 'cleo@example.test';
select results_eq(
  $$ select added_by from public.documents where id = '20000000-0000-0000-0000-000000000003' $$,
  $$ values (null::uuid) $$,
  'deleting a person keeps the documents they added'
);

-- Signed out -------------------------------------------------------------------------------

set local role anon;
select throws_ok('select id from public.documents', '42501', null, 'signed-out visitors cannot read documents');
select is_empty(
  'select name from storage.objects where bucket_id = ''documents''',
  'signed-out visitors read no files'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('documents', '10000000-0000-0000-0000-000000000001/anon.pdf') $$,
  '42501',
  null,
  'signed-out visitors cannot upload a file'
);

select * from finish();
rollback;
