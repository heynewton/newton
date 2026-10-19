-- Creating a boat (#32): the boat and its owner membership in one call. Run with `npm run db:test`.
--
-- Three made-up people:
--   Ada:  owns Kestrel
--   Ben:  on no boat yet, creates his first
--   Cleo: on no boat

begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

-- Setup, as the database owner -------------------------------------------------------------

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'ada@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.test'),
  ('00000000-0000-0000-0000-00000000000c', 'cleo@example.test');

insert into public.boats (id, name) values ('10000000-0000-0000-0000-000000000001', 'Kestrel');
insert into public.memberships (boat_id, person_id, role)
select '10000000-0000-0000-0000-000000000001', id, 'owner'
from public.people where email = 'ada@example.test';

create temp table person_ids as select email, id from public.people;
grant select on person_ids to authenticated;

-- Holds the new boat's ID between statements.
create temp table created (boat_id uuid);
grant select, insert on created to authenticated;

create function pg_temp.sign_in_as(email text) returns void language plpgsql as $$
begin
  reset role;
  perform set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', (select id from auth.users u where u.email = sign_in_as.email),
      'role', 'authenticated'
    )::text,
    true
  );
  perform set_config('role', 'authenticated', true);
end;
$$;

-- Ben creates his first boat ---------------------------------------------------------------

select pg_temp.sign_in_as('ben@example.test');

select is_empty('select id from public.boats', 'before creating one, a new person sees no boats');

insert into created select public.create_boat('  Petrel  ');

select results_eq(
  'select name from public.boats',
  $$ values ('Petrel') $$,
  'anyone signed in can create a boat, and sees only that one (name trimmed)'
);

select results_eq(
  $$ select m.role::text from public.memberships m join created c on c.boat_id = m.boat_id
     where m.person_id = public.current_person_id() $$,
  $$ values ('owner') $$,
  'the creator becomes the boat''s owner'
);

select is(
  (select count(*)::int from public.memberships m join created c on c.boat_id = m.boat_id),
  1,
  'the new boat has no other members'
);

select is(public.my_role_on((select boat_id from created)), 'owner'::public.membership_role,
  'the creator can act as owner straight away');

select throws_ok(
  'select public.create_boat(''   '')',
  '23514',
  null,
  'a blank name is rejected'
);

select throws_ok(
  $$ select public.create_boat(repeat('x', 101)) $$,
  '23514',
  null,
  'a name over 100 characters is rejected'
);

select is(
  (select count(*)::int from public.memberships where person_id = public.current_person_id()),
  1,
  'a rejected name leaves no boat or membership behind'
);

select throws_ok(
  $$ insert into public.memberships (boat_id, person_id, role)
     select '10000000-0000-0000-0000-000000000001', id, 'owner' from person_ids
     where email = 'ben@example.test' $$,
  '42501',
  null,
  'nobody can add a membership on a boat they don''t own (joining Kestrel)'
);

-- Ada owns Kestrel, not Petrel -------------------------------------------------------------

select pg_temp.sign_in_as('ada@example.test');

select results_eq(
  'select name from public.boats',
  $$ values ('Kestrel') $$,
  'a person sees only their own boats, not one someone else just created'
);

select throws_ok(
  $$ insert into public.memberships (boat_id, person_id, role)
     select c.boat_id, p.id, 'co_owner' from created c, person_ids p
     where p.email = 'ada@example.test' $$,
  '42501',
  null,
  'an owner of another boat cannot add themselves to the new boat'
);

-- Cleo, on no boat -------------------------------------------------------------------------

select pg_temp.sign_in_as('cleo@example.test');

select is_empty('select id from public.boats', 'a person on no boat still sees no boats');

-- Signed out -------------------------------------------------------------------------------

reset role;
set local role anon;
select throws_ok(
  'select public.create_boat(''Anon boat'')',
  '42501',
  null,
  'signed-out visitors cannot create boats'
);

-- Signed in as an auth user with no person (should not happen, but must not create orphans).
reset role;
select set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
set local role authenticated;
select throws_ok(
  'select public.create_boat(''Orphan'')',
  '42501',
  'sign in to create a boat',
  'a caller with no person cannot create a boat'
);

select * from finish();
rollback;
