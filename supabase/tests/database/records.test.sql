-- Row-level security and checks for renewals, maintenance items and expenses (#9).
-- Run with `npm run db:test`.
--
-- The same four made-up people as rls.test.sql:
--   Ada:  owner of Kestrel, read-only on Petrel
--   Ben:  owner of Petrel, co-owner of Kestrel
--   Cleo: crew on Kestrel
--   Dev:  on no boat

begin;
create extension if not exists pgtap with schema extensions;
select plan(43);

-- Setup, as the database owner -------------------------------------------------------------

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'ada@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.test'),
  ('00000000-0000-0000-0000-00000000000c', 'cleo@example.test'),
  ('00000000-0000-0000-0000-00000000000d', 'dev@example.test');

insert into public.boats (id, name) values
  ('10000000-0000-0000-0000-000000000001', 'Kestrel'),
  ('10000000-0000-0000-0000-000000000002', 'Petrel');

insert into public.memberships (boat_id, person_id, role)
select b.id, p.id, m.role::public.membership_role
from (values
  ('Kestrel', 'ada@example.test', 'owner'),
  ('Kestrel', 'ben@example.test', 'co_owner'),
  ('Kestrel', 'cleo@example.test', 'crew'),
  ('Petrel', 'ben@example.test', 'owner'),
  ('Petrel', 'ada@example.test', 'read_only')
) as m (boat, email, role)
join public.boats b on b.name = m.boat
join public.people p on p.email = m.email;

-- People's IDs, readable whatever the signed-in person can see.
create temp table person_ids as select email, id from public.people;
grant select on person_ids to authenticated;

-- One record of each kind on Petrel, where Ada is read-only.
insert into public.renewals (id, boat_id, kind, title, expires_on) values
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002',
   'insurance', 'Petrel insurance', '2027-05-31');
insert into public.maintenance_items (id, boat_id, title, every_months, last_done_on) values
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002',
   'Petrel rigging check', 12, '2026-05-01');
insert into public.expenses (id, boat_id, description, amount_cents, currency, spent_on, paid_by)
select '40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002',
  'Petrel mooring', 120000, 'USD', '2026-04-01', id
from person_ids where email = 'ben@example.test';

-- Switch to a signed-in person, the way PostgREST does for a request with their token.
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

-- Ada: owner of Kestrel, read-only on Petrel -----------------------------------------------

select pg_temp.sign_in_as('ada@example.test');

select lives_ok(
  $$ insert into public.renewals (id, boat_id, kind, title, reference, expires_on) values
     ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
      'registration', 'Kestrel registration', 'XX 0000 KS', '2026-12-31') $$,
  'an owner can add a renewal'
);

select lives_ok(
  $$ insert into public.maintenance_items
       (id, boat_id, title, every_months, every_engine_hours, last_done_on, last_done_engine_hours)
     values ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
      'Engine oil and filter', 12, 100, '2026-10-02', 1412.5) $$,
  'an owner can add a maintenance item'
);

select lives_ok(
  $$ insert into public.expenses (id, boat_id, description, amount_cents, currency, spent_on, paid_by)
     select '40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
       'Haul-out', 167690, 'USD', '2026-10-02', id
     from person_ids where email = 'ben@example.test' $$,
  'an owner can add an expense paid by another person on the boat'
);

select results_eq(
  'select title from public.renewals where boat_id = ''10000000-0000-0000-0000-000000000002''',
  $$ values ('Petrel insurance') $$,
  'read-only sees the boat''s renewals'
);
select results_eq(
  'select title from public.maintenance_items where boat_id = ''10000000-0000-0000-0000-000000000002''',
  $$ values ('Petrel rigging check') $$,
  'read-only sees the boat''s maintenance items'
);
select results_eq(
  'select description from public.expenses where boat_id = ''10000000-0000-0000-0000-000000000002''',
  $$ values ('Petrel mooring') $$,
  'read-only sees the boat''s expenses'
);

select throws_ok(
  $$ insert into public.renewals (boat_id, kind, title, expires_on)
     values ('10000000-0000-0000-0000-000000000002', 'other', 'Sneaky', '2027-01-01') $$,
  '42501', null, 'read-only cannot add a renewal'
);
select throws_ok(
  $$ insert into public.maintenance_items (boat_id, title, every_months, last_done_on)
     values ('10000000-0000-0000-0000-000000000002', 'Sneaky', 6, '2026-01-01') $$,
  '42501', null, 'read-only cannot add a maintenance item'
);
select throws_ok(
  $$ insert into public.expenses (boat_id, description, amount_cents, currency, spent_on, paid_by)
     select '10000000-0000-0000-0000-000000000002', 'Sneaky', 100, 'USD', '2026-01-01', id
     from person_ids where email = 'ada@example.test' $$,
  '42501', null, 'read-only cannot add an expense'
);

update public.renewals set title = 'Changed' where boat_id = '10000000-0000-0000-0000-000000000002';
update public.maintenance_items set title = 'Changed' where boat_id = '10000000-0000-0000-0000-000000000002';
update public.expenses set amount_cents = 1 where boat_id = '10000000-0000-0000-0000-000000000002';
select results_eq(
  $$ select (select title from public.renewals where id = '20000000-0000-0000-0000-000000000002'),
            (select title from public.maintenance_items where id = '30000000-0000-0000-0000-000000000002'),
            (select amount_cents from public.expenses where id = '40000000-0000-0000-0000-000000000002') $$,
  $$ values ('Petrel insurance'::text, 'Petrel rigging check'::text, 120000::bigint) $$,
  'read-only cannot change records'
);

delete from public.renewals where boat_id = '10000000-0000-0000-0000-000000000002';
delete from public.maintenance_items where boat_id = '10000000-0000-0000-0000-000000000002';
delete from public.expenses where boat_id = '10000000-0000-0000-0000-000000000002';
select results_eq(
  $$ select (select count(*)::int from public.renewals where boat_id = '10000000-0000-0000-0000-000000000002'),
            (select count(*)::int from public.maintenance_items where boat_id = '10000000-0000-0000-0000-000000000002'),
            (select count(*)::int from public.expenses where boat_id = '10000000-0000-0000-0000-000000000002') $$,
  $$ values (1, 1, 1) $$,
  'read-only cannot remove records'
);

select throws_ok(
  $$ update public.renewals set boat_id = '10000000-0000-0000-0000-000000000002'
     where id = '20000000-0000-0000-0000-000000000001' $$,
  '42501', null, 'a record cannot move to a boat where the person is read-only'
);

-- Checks on the shape, so calc can read every row.

select throws_ok(
  $$ insert into public.expenses (boat_id, description, amount_cents, currency, spent_on, paid_by)
     select '10000000-0000-0000-0000-000000000001', 'Paid by a stranger', 100, 'USD', '2026-10-01', id
     from person_ids where email = 'dev@example.test' $$,
  '23514', 'The payer must be a person on the boat', 'the payer must be on the boat'
);
select throws_ok(
  $$ update public.expenses set paid_by = (select id from person_ids where email = 'dev@example.test')
     where id = '40000000-0000-0000-0000-000000000001' $$,
  '23514', 'The payer must be a person on the boat', 'the payer cannot be changed to someone off the boat'
);
select throws_ok(
  $$ insert into public.expenses (boat_id, description, amount_cents, currency, spent_on, paid_by)
     select '10000000-0000-0000-0000-000000000001', 'Lowercase currency', 100, 'usd', '2026-10-01', id
     from person_ids where email = 'ada@example.test' $$,
  '23514', null, 'currency is a three-letter ISO code'
);
select throws_ok(
  $$ insert into public.maintenance_items (boat_id, title, last_done_on)
     values ('10000000-0000-0000-0000-000000000001', 'No interval', '2026-10-01') $$,
  '23514', null, 'maintenance needs an interval in months or engine hours'
);
select throws_ok(
  $$ insert into public.maintenance_items (boat_id, title, every_engine_hours, last_done_on)
     values ('10000000-0000-0000-0000-000000000001', 'No reading', 200, '2026-10-01') $$,
  '23514', null, 'an engine-hours interval needs the reading when last done'
);
select throws_ok(
  $$ insert into public.maintenance_items (boat_id, title, every_months, last_done_on)
     values ('10000000-0000-0000-0000-000000000001', 'Zero months', 0, '2026-10-01') $$,
  '23514', null, 'intervals are positive'
);
select lives_ok(
  $$ insert into public.expenses (boat_id, description, amount_cents, currency, spent_on, paid_by)
     select '10000000-0000-0000-0000-000000000001', 'Refund', -2500, 'EUR', '2026-10-05', id
     from person_ids where email = 'ada@example.test' $$,
  'a refund is a negative amount, in any currency'
);
select lives_ok(
  $$ insert into public.maintenance_items (boat_id, title, every_engine_hours, last_done_on, last_done_engine_hours)
     values ('10000000-0000-0000-0000-000000000001', 'Valve clearance', 500, '2025-06-01', 1050) $$,
  'maintenance can be due by engine hours only'
);

-- Ownership shares: owners set them.

update public.memberships set ownership_share = 60 where boat_id = '10000000-0000-0000-0000-000000000001'
  and person_id = public.current_person_id();
update public.memberships set ownership_share = 40 where boat_id = '10000000-0000-0000-0000-000000000001'
  and person_id = (select id from person_ids where email = 'ben@example.test');
select results_eq(
  $$ select p.email, m.ownership_share from public.memberships m join person_ids p on p.id = m.person_id
     where m.boat_id = '10000000-0000-0000-0000-000000000001' order by p.email $$,
  $$ values ('ada@example.test'::text, 60), ('ben@example.test', 40), ('cleo@example.test', 0) $$,
  'an owner sets ownership shares; members start at 0'
);
select throws_ok(
  $$ update public.memberships set ownership_share = -1 where boat_id = '10000000-0000-0000-0000-000000000001'
     and person_id = public.current_person_id() $$,
  '23514', null, 'ownership shares are not negative'
);

-- Ben: co-owner on Kestrel -----------------------------------------------------------------

select pg_temp.sign_in_as('ben@example.test');

update public.maintenance_items set title = 'Engine oil, filter and inspection'
  where id = '30000000-0000-0000-0000-000000000001';
select is(
  (select title from public.maintenance_items where id = '30000000-0000-0000-0000-000000000001'),
  'Engine oil, filter and inspection',
  'a co-owner can change a maintenance item'
);

update public.memberships set ownership_share = 100 where boat_id = '10000000-0000-0000-0000-000000000001'
  and person_id = public.current_person_id();
select is(
  (select ownership_share from public.memberships where boat_id = '10000000-0000-0000-0000-000000000001'
     and person_id = public.current_person_id()),
  40,
  'a co-owner cannot change ownership shares'
);

select lives_ok(
  $$ update public.expenses set amount_cents = 167700 where id = '40000000-0000-0000-0000-000000000001' $$,
  'a co-owner can correct an expense'
);

select lives_ok(
  $$ update public.renewals set expires_on = '2027-01-31' where id = '20000000-0000-0000-0000-000000000002' $$,
  'an owner can change a renewal on their own boat'
);

-- Cleo: crew on Kestrel --------------------------------------------------------------------

select pg_temp.sign_in_as('cleo@example.test');

select lives_ok(
  $$ insert into public.expenses (boat_id, description, amount_cents, currency, spent_on, paid_by)
     values ('10000000-0000-0000-0000-000000000001', 'Spare impeller', 5475, 'USD', '2026-10-06',
       public.current_person_id()) $$,
  'crew can add an expense they paid'
);

select lives_ok(
  $$ insert into public.renewals (boat_id, kind, title, expires_on)
     values ('10000000-0000-0000-0000-000000000001', 'licence', 'VHF station licence', '2028-03-15') $$,
  'crew can add a renewal'
);

delete from public.renewals where id = '20000000-0000-0000-0000-000000000001';
select is_empty(
  $$ select id from public.renewals where id = '20000000-0000-0000-0000-000000000001' $$,
  'crew can remove a record'
);

select is_empty(
  'select id from public.renewals where boat_id = ''10000000-0000-0000-0000-000000000002''',
  'crew cannot see another boat''s renewals'
);
select is_empty(
  'select id from public.maintenance_items where boat_id = ''10000000-0000-0000-0000-000000000002''',
  'crew cannot see another boat''s maintenance items'
);
select is_empty(
  'select id from public.expenses where boat_id = ''10000000-0000-0000-0000-000000000002''',
  'crew cannot see another boat''s expenses'
);
select throws_ok(
  $$ insert into public.maintenance_items (boat_id, title, every_months, last_done_on)
     values ('10000000-0000-0000-0000-000000000002', 'Not my boat', 6, '2026-01-01') $$,
  '42501', null, 'crew cannot add records to another boat'
);

update public.expenses set amount_cents = 1 where id = '40000000-0000-0000-0000-000000000002';
delete from public.maintenance_items where id = '30000000-0000-0000-0000-000000000002';
reset role;
select results_eq(
  $$ select (select amount_cents from public.expenses where id = '40000000-0000-0000-0000-000000000002'),
            (select count(*)::int from public.maintenance_items where id = '30000000-0000-0000-0000-000000000002') $$,
  $$ values (120000::bigint, 1) $$,
  'crew cannot change or remove another boat''s records'
);

-- Dev: on no boat --------------------------------------------------------------------------

select pg_temp.sign_in_as('dev@example.test');

select is_empty('select id from public.renewals', 'a person on no boat sees no renewals');
select is_empty('select id from public.maintenance_items', 'a person on no boat sees no maintenance items');
select is_empty('select id from public.expenses', 'a person on no boat sees no expenses');
select throws_ok(
  $$ insert into public.renewals (boat_id, kind, title, expires_on)
     values ('10000000-0000-0000-0000-000000000001', 'other', 'Outsider', '2027-01-01') $$,
  '42501', null, 'a person on no boat cannot add records'
);

-- Signed out -------------------------------------------------------------------------------

reset role;
set local role anon;
select throws_ok('select id from public.renewals', '42501', null, 'signed-out visitors cannot read renewals');
select throws_ok('select id from public.maintenance_items', '42501', null, 'signed-out visitors cannot read maintenance items');
select throws_ok('select id from public.expenses', '42501', null, 'signed-out visitors cannot read expenses');

-- History stays when people leave or a boat goes ------------------------------------------

reset role;
delete from public.memberships
where boat_id = '10000000-0000-0000-0000-000000000001'
  and person_id = (select id from person_ids where email = 'ben@example.test');
select is(
  (select count(*)::int from public.expenses where id = '40000000-0000-0000-0000-000000000001'),
  1,
  'an expense stays when its payer leaves the boat'
);

delete from public.boats where id = '10000000-0000-0000-0000-000000000002';
select results_eq(
  $$ select (select count(*)::int from public.renewals where boat_id = '10000000-0000-0000-0000-000000000002'),
            (select count(*)::int from public.maintenance_items where boat_id = '10000000-0000-0000-0000-000000000002'),
            (select count(*)::int from public.expenses where boat_id = '10000000-0000-0000-0000-000000000002') $$,
  $$ values (0, 0, 0) $$,
  'deleting a boat deletes its records'
);

select * from finish();
rollback;
