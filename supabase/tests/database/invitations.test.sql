-- Owners and co-owners invite people to a boat by email. Run with `npm run db:test`.
--
-- The people and boats come from setup/tenancy.psql:
--   Ada:  owner of Kestrel, read-only on Petrel
--   Ben:  owner of Petrel, co-owner of Kestrel
--   Cleo: crew on Kestrel
--   Dev:  on no boat

begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

-- Setup, as the database owner -------------------------------------------------------------

\ir setup/tenancy.psql

-- A co-owner invites ------------------------------------------------------------------------

select pg_temp.sign_in_as('ben@example.test');

select is(
  public.invite_to_boat('10000000-0000-0000-0000-000000000001', '  Nia@Example.TEST ', 'co_owner'),
  'invited',
  'a co-owner invites someone who has never signed in'
);

select results_eq(
  'select email, role::text from public.invitations',
  $$ values ('nia@example.test', 'co_owner') $$,
  'the invitation waits, with the email trimmed and lowercase'
);

select is(
  public.invite_to_boat('10000000-0000-0000-0000-000000000001', 'nia@example.test', 'crew'),
  'invited',
  'inviting the same address again'
);

select results_eq(
  'select email, role::text from public.invitations',
  $$ values ('nia@example.test', 'crew') $$,
  '... keeps one invitation, with the new role'
);

select is(
  public.invite_to_boat('10000000-0000-0000-0000-000000000001', 'DEV@example.test', 'co_owner'),
  'added',
  'a co-owner invites someone who already has a person'
);

select is(
  (select role::text from public.memberships
   where boat_id = '10000000-0000-0000-0000-000000000001'
     and person_id = (select id from person_ids where email = 'dev@example.test')),
  'co_owner',
  '... who is on the boat at once, with the role they were invited as'
);

select is(
  public.invite_to_boat('10000000-0000-0000-0000-000000000001', 'cleo@example.test', 'co_owner'),
  'already_on_boat',
  'inviting someone already on the boat changes nothing'
);

select is(
  (select role::text from public.memberships
   where boat_id = '10000000-0000-0000-0000-000000000001'
     and person_id = (select id from person_ids where email = 'cleo@example.test')),
  'crew',
  '... not even their role'
);

select throws_ok(
  $$ select public.invite_to_boat('10000000-0000-0000-0000-000000000001', 'eve@example.test', 'owner') $$,
  '22023',
  null,
  'nobody can be invited as owner'
);

select throws_ok(
  $$ select public.invite_to_boat('10000000-0000-0000-0000-000000000001', 'not an email', 'crew') $$,
  '22023',
  null,
  'an invitation needs an email address'
);

select throws_ok(
  $$ insert into public.invitations (boat_id, email, role)
     values ('10000000-0000-0000-0000-000000000001', 'eve@example.test', 'crew') $$,
  '42501',
  null,
  'invitations can only be made through invite_to_boat()'
);

-- Who else can invite, see and cancel ---------------------------------------------------------

select pg_temp.sign_in_as('cleo@example.test');

select throws_ok(
  $$ select public.invite_to_boat('10000000-0000-0000-0000-000000000001', 'eve@example.test', 'crew') $$,
  '42501',
  null,
  'crew cannot invite'
);

select is((select count(*)::int from public.invitations), 0, 'crew cannot see invitations');

delete from public.invitations;

select pg_temp.sign_in_as('ada@example.test');

select throws_ok(
  $$ select public.invite_to_boat('10000000-0000-0000-0000-000000000002', 'eve@example.test', 'crew') $$,
  '42501',
  null,
  'read-only members cannot invite'
);

select is(
  (select count(*)::int from public.invitations),
  1,
  'an owner sees the boat''s invitations, and crew could not cancel one'
);

select pg_temp.sign_in_as('dev@example.test');

select is(
  public.invite_to_boat('10000000-0000-0000-0000-000000000001', 'eve@example.test', 'read_only'),
  'invited',
  'a co-owner who was just invited can invite in turn'
);

delete from public.invitations where email = 'eve@example.test';

select results_eq(
  'select email from public.invitations',
  $$ values ('nia@example.test') $$,
  'a co-owner cancels an invitation'
);

-- Accepting ---------------------------------------------------------------------------------

reset role;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000e', 'Nia@example.test');

select is(
  (select m.role::text from public.memberships m join public.people p on p.id = m.person_id
   where m.boat_id = '10000000-0000-0000-0000-000000000001' and p.email = 'Nia@example.test'),
  'crew',
  'signing in for the first time with an invited email puts the person on the boat'
);

select is((select count(*)::int from public.invitations), 0, '... and uses up the invitation');

select pg_temp.sign_in_as('ben@example.test');
do $$ begin perform public.invite_to_boat('10000000-0000-0000-0000-000000000002', 'cleo.new@example.test', 'crew'); end $$;

reset role;
update auth.users set email = 'cleo.new@example.test' where id = '00000000-0000-0000-0000-00000000000c';

select is(
  (select role::text from public.memberships
   where boat_id = '10000000-0000-0000-0000-000000000002'
     and person_id = (select id from person_ids where email = 'cleo@example.test')),
  'crew',
  'changing your sign-in email to an invited one accepts the invitation'
);

-- Limits ------------------------------------------------------------------------------------

insert into public.invitations (boat_id, email, role)
select '10000000-0000-0000-0000-000000000002', 'guest' || n || '@example.test', 'crew'
from generate_series(1, 20) n;

select pg_temp.sign_in_as('ben@example.test');

select throws_ok(
  $$ select public.invite_to_boat('10000000-0000-0000-0000-000000000002', 'one.more@example.test', 'crew') $$,
  '54000',
  null,
  'at most 20 invitations wait on a boat'
);

select is(
  public.invite_to_boat('10000000-0000-0000-0000-000000000002', 'guest1@example.test', 'read_only'),
  'invited',
  '... but one of them can still be changed'
);

reset role;
update public.boats set deleting_since = now() where id = '10000000-0000-0000-0000-000000000001';
select pg_temp.sign_in_as('ben@example.test');

select throws_ok(
  $$ select public.invite_to_boat('10000000-0000-0000-0000-000000000001', 'eve@example.test', 'crew') $$,
  '55000',
  null,
  'nobody can be invited to a boat being deleted'
);

reset role;
delete from public.boats where id = '10000000-0000-0000-0000-000000000002';

select is(
  (select count(*)::int from public.invitations),
  0,
  'a boat''s invitations go with it'
);

select * from finish();
rollback;
