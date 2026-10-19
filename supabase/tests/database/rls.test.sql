-- Row-level security for boats, people and memberships (#5). Run with `npm run db:test`.
--
-- The people and boats come from setup/tenancy.psql:
--   Ada:  owner of Kestrel, read-only on Petrel
--   Ben:  owner of Petrel, co-owner of Kestrel
--   Cleo: crew on Kestrel
--   Dev:  on no boat

begin;
create extension if not exists pgtap with schema extensions;
select plan(26);

-- Setup, as the database owner -------------------------------------------------------------

\ir setup/tenancy.psql

select is(
  (select count(*)::int from public.people where auth_subject like '00000000-0000-0000-0000-00000000000_'),
  4,
  'every new auth user gets a person'
);

select isnt(
  (select id::text from public.people where email = 'ada@example.test'),
  '00000000-0000-0000-0000-00000000000a',
  'people.id is Newton''s own ID, not the auth provider''s'
);

-- Ada: on two boats, read-only on one ------------------------------------------------------

select pg_temp.sign_in_as('ada@example.test');

select is(
  public.current_person_id(),
  (select id from public.people where email = 'ada@example.test'),
  'current_person_id() resolves the signed-in person'
);

select results_eq(
  'select name from public.boats order by name',
  $$ values ('Kestrel'), ('Petrel') $$,
  'a person on two boats sees both'
);

select is(
  (select count(*)::int from public.memberships where person_id = public.current_person_id()),
  2,
  'a person can have memberships on several boats'
);

select is(public.can_write_boat('10000000-0000-0000-0000-000000000001'), true, 'an owner can write');
select is(public.can_write_boat('10000000-0000-0000-0000-000000000002'), false, 'read-only cannot write');

update public.boats set name = 'Renamed by read-only' where name = 'Petrel';
select is(
  (select count(*)::int from public.boats where name = 'Petrel'),
  1,
  'read-only cannot rename the boat'
);

select throws_ok(
  $$ insert into public.memberships (boat_id, person_id, role)
     select '10000000-0000-0000-0000-000000000002', id, 'crew' from person_ids
     where email = 'cleo@example.test' $$,
  '42501',
  null,
  'read-only cannot add members'
);

delete from public.boats where name = 'Petrel';
select is(
  (select count(*)::int from public.boats where name = 'Petrel'),
  1,
  'read-only cannot delete the boat'
);

select throws_ok(
  'insert into public.boats (name) values (''Sneaky'')',
  '42501',
  null,
  'boats are not inserted directly'
);

update public.boats set name = 'Kestrel II' where name = 'Kestrel';
select is(
  (select count(*)::int from public.boats where name = 'Kestrel II'),
  1,
  'an owner can rename the boat'
);
update public.boats set name = 'Kestrel' where name = 'Kestrel II';

select results_eq(
  'select email from public.people order by email',
  $$ values ('ada@example.test'), ('ben@example.test'), ('cleo@example.test') $$,
  'a person sees the people they share a boat with, not others'
);

select throws_ok(
  'select auth_subject from public.people',
  '42501',
  null,
  'auth_subject cannot be read through the API'
);

select throws_ok(
  'update public.people set auth_subject = ''someone-else'' where id = public.current_person_id()',
  '42501',
  null,
  'auth_subject cannot be changed through the API'
);

update public.people set display_name = 'Ada' where id = public.current_person_id();
update public.people set display_name = 'Not Ben' where email = 'ben@example.test';
reset role;
select results_eq(
  'select email, display_name from public.people where email in (''ada@example.test'', ''ben@example.test'') order by email',
  $$ values ('ada@example.test'::text, 'Ada'::text), ('ben@example.test', null) $$,
  'a person can edit their own name and nobody else''s'
);

-- Ben: co-owner on Kestrel -----------------------------------------------------------------

select pg_temp.sign_in_as('ben@example.test');

update public.boats set name = 'Kestrel (co-owner edit)' where name = 'Kestrel';
select is(
  (select count(*)::int from public.boats where name = 'Kestrel (co-owner edit)'),
  1,
  'a co-owner can rename the boat'
);
update public.boats set name = 'Kestrel' where name = 'Kestrel (co-owner edit)';

select throws_ok(
  $$ insert into public.memberships (boat_id, person_id, role)
     select '10000000-0000-0000-0000-000000000001', id, 'crew' from person_ids
     where email = 'dev@example.test' $$,
  '42501',
  null,
  'a co-owner cannot add members'
);

delete from public.memberships
where boat_id = '10000000-0000-0000-0000-000000000001'
  and person_id = (select id from public.people where email = 'cleo@example.test');
select is(
  (select count(*)::int from public.memberships where boat_id = '10000000-0000-0000-0000-000000000001'),
  3,
  'a co-owner cannot remove members'
);

-- Cleo: crew on Kestrel --------------------------------------------------------------------

select pg_temp.sign_in_as('cleo@example.test');

select results_eq('select name from public.boats', $$ values ('Kestrel') $$, 'crew sees only their boat');
select is(public.can_write_boat('10000000-0000-0000-0000-000000000001'), true, 'crew can write records');

update public.boats set name = 'Crew edit' where name = 'Kestrel';
select is(
  (select count(*)::int from public.boats where name = 'Crew edit'),
  0,
  'crew cannot rename the boat'
);

-- Dev: on no boat --------------------------------------------------------------------------

select pg_temp.sign_in_as('dev@example.test');

select is_empty('select id from public.boats', 'a person on no boat sees no boats');
select is_empty('select boat_id from public.memberships', 'a person on no boat sees no memberships');

-- Signed out -------------------------------------------------------------------------------

reset role;
set local role anon;
select throws_ok('select id from public.boats', '42501', null, 'signed-out visitors cannot read boats');
select throws_ok('select id from public.people', '42501', null, 'signed-out visitors cannot read people');

select * from finish();
rollback;
