-- Deleting a boat (#115): only owners, files before rows, nothing left. Run with `npm run db:test`.
--
-- The people and boats from setup/tenancy.psql:
--   Ada:  owner of Kestrel, read-only on Petrel
--   Ben:  owner of Petrel, co-owner of Kestrel
--   Cleo: crew on Kestrel
--   Dev:  on no boat
--
-- Files are rows in storage.objects here. The web app removes them with the Storage API, which
-- deletes the same rows as the signed-in person, under the bucket's delete policy; the test does
-- that delete directly, as Ada, with the setting the Storage API itself uses to allow it.

begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

\ir setup/tenancy.psql

-- Two files and their rows on each boat, plus a stray file on Kestrel with no documents row.
insert into storage.objects (bucket_id, name) values
  ('documents', '10000000-0000-0000-0000-000000000001/insurance.pdf'),
  ('documents', '10000000-0000-0000-0000-000000000001/email/abc/0-invoice.pdf'),
  ('documents', '10000000-0000-0000-0000-000000000001/stray.pdf'),
  ('documents', '10000000-0000-0000-0000-000000000002/insurance.pdf'),
  ('documents', '10000000-0000-0000-0000-000000000002/manual.pdf');

insert into public.documents (boat_id, storage_path, source) values
  ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001/insurance.pdf', 'upload'),
  ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001/email/abc/0-invoice.pdf', 'email'),
  ('10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002/insurance.pdf', 'upload'),
  ('10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002/manual.pdf', 'upload');

insert into public.renewals (boat_id, kind, title, expires_on) values
  ('10000000-0000-0000-0000-000000000001', 'insurance', 'Kestrel insurance', '2027-04-01'),
  ('10000000-0000-0000-0000-000000000002', 'insurance', 'Petrel insurance', '2027-05-01');

-- Who may not delete Kestrel -------------------------------------------------------------------

select pg_temp.sign_in_as('ben@example.test');
select throws_ok($$ select public.begin_boat_deletion('10000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'a co-owner cannot start deleting the boat');
select throws_ok($$ select public.delete_boat('10000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'a co-owner cannot delete the boat');

select pg_temp.sign_in_as('cleo@example.test');
select throws_ok($$ select public.begin_boat_deletion('10000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'crew cannot start deleting the boat');
select throws_ok($$ select public.delete_boat('10000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'crew cannot delete the boat');

select pg_temp.sign_in_as('ada@example.test');
select throws_ok($$ select public.begin_boat_deletion('10000000-0000-0000-0000-000000000002') $$,
  '42501', null, 'a read-only member cannot start deleting the boat (Ada on Petrel)');
select throws_ok($$ select public.delete_boat('10000000-0000-0000-0000-000000000002') $$,
  '42501', null, 'a read-only member cannot delete the boat');

select pg_temp.sign_in_as('dev@example.test');
select throws_ok($$ select public.begin_boat_deletion('10000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'a person on no boat cannot start deleting it');

reset role;
set local role anon;
select throws_ok($$ select public.begin_boat_deletion('10000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'signed-out visitors cannot start deleting a boat');

-- Even the owner can't skip the steps ----------------------------------------------------------

select pg_temp.sign_in_as('ada@example.test');
select throws_ok($$ delete from public.boats where id = '10000000-0000-0000-0000-000000000001' $$,
  '42501', null, 'an owner cannot delete the boat row directly, which would leave its files');
select throws_ok($$ select public.delete_boat('10000000-0000-0000-0000-000000000001') $$,
  '55000', 'start deleting the boat first', 'delete_boat refuses a boat not marked as being deleted');

-- Ada deletes Kestrel: mark and list ---------------------------------------------------------

select results_eq(
  $$ select public.begin_boat_deletion('10000000-0000-0000-0000-000000000001') $$,
  $$ values ('10000000-0000-0000-0000-000000000001/email/abc/0-invoice.pdf'),
            ('10000000-0000-0000-0000-000000000001/insurance.pdf'),
            ('10000000-0000-0000-0000-000000000001/stray.pdf') $$,
  'starting lists every file in the boat''s folder, with or without a row, and only that boat''s'
);
select isnt(
  (select deleting_since from public.boats where id = '10000000-0000-0000-0000-000000000001'),
  null, 'the boat is marked as being deleted'
);
select is(public.can_write_boat('10000000-0000-0000-0000-000000000001'), false,
  'nobody can write to a boat being deleted, owner included');

select pg_temp.sign_in_as('cleo@example.test');
select throws_ok(
  $$ insert into public.renewals (boat_id, kind, title, expires_on)
     values ('10000000-0000-0000-0000-000000000001', 'other', 'Late', '2027-01-01') $$,
  '42501', null, 'crew cannot add a record to a boat being deleted');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('documents', '10000000-0000-0000-0000-000000000001/late.pdf') $$,
  '42501', null, 'crew cannot add a file to a boat being deleted');
select is(
  (select count(*)::int from public.documents where boat_id = '10000000-0000-0000-0000-000000000001'),
  2, 'members still see the boat''s rows while it is being deleted'
);

-- Files first: delete_boat refuses while any is left -----------------------------------------

select pg_temp.sign_in_as('ada@example.test');
select set_config('storage.allow_delete_query', 'true', true);
delete from storage.objects where name in (
  '10000000-0000-0000-0000-000000000001/insurance.pdf',
  '10000000-0000-0000-0000-000000000001/email/abc/0-invoice.pdf');

select throws_ok($$ select public.delete_boat('10000000-0000-0000-0000-000000000001') $$,
  '55000', 'the boat still has files in storage', 'delete_boat refuses while a file is left');

select results_eq(
  $$ select public.begin_boat_deletion('10000000-0000-0000-0000-000000000001') $$,
  $$ values ('10000000-0000-0000-0000-000000000001/stray.pdf') $$,
  'starting again lists only the files still left'
);

delete from storage.objects where name = '10000000-0000-0000-0000-000000000001/stray.pdf';

-- Then rows ----------------------------------------------------------------------------------

select is(
  public.delete_boat('10000000-0000-0000-0000-000000000001'),
  jsonb_build_object(
    'documents', 2, 'document_chunks', 0, 'renewals', 1, 'maintenance_items', 0, 'expenses', 0,
    'inbound_emails', 0, 'reminders_sent', 0, 'memberships', 3
  ),
  'delete_boat deletes the boat and reports how many rows of each kind went'
);

reset role;
select is_empty(
  $$ select id from public.boats where id = '10000000-0000-0000-0000-000000000001'
     union all select boat_id from public.memberships where boat_id = '10000000-0000-0000-0000-000000000001'
     union all select boat_id from public.documents where boat_id = '10000000-0000-0000-0000-000000000001'
     union all select boat_id from public.renewals where boat_id = '10000000-0000-0000-0000-000000000001' $$,
  'nothing of the boat is left in the database'
);
select is_empty(
  $$ select name from storage.objects where name like '10000000-0000-0000-0000-000000000001/%' $$,
  'nothing of the boat is left in storage'
);

-- Petrel is untouched ------------------------------------------------------------------------

select results_eq(
  $$ select (select count(*)::int from public.documents where boat_id = '10000000-0000-0000-0000-000000000002'),
            (select count(*)::int from public.renewals where boat_id = '10000000-0000-0000-0000-000000000002'),
            (select count(*)::int from public.memberships where boat_id = '10000000-0000-0000-0000-000000000002'),
            (select count(*)::int from storage.objects where name like '10000000-0000-0000-0000-000000000002/%') $$,
  $$ values (2, 1, 2, 2) $$,
  'another boat keeps its rows, members and files'
);
select is(
  (select deleting_since from public.boats where id = '10000000-0000-0000-0000-000000000002'),
  null, 'another boat is not marked as being deleted'
);

-- Once it's gone, Ada isn't its owner any more, so nothing more can be done to it.
select pg_temp.sign_in_as('ada@example.test');
select throws_ok($$ select public.begin_boat_deletion('10000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'a deleted boat has no owners left to run it again');

select * from finish();
rollback;
