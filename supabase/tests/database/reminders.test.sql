-- Reminders sent (#12): each reminder is recorded once, people see only their own, and only the
-- job writes. Run with `npm run db:test`.
--
-- The people and boats come from setup/tenancy.psql:
--   Ada:  owner of Kestrel, read-only on Petrel
--   Ben:  owner of Petrel, co-owner of Kestrel
--   Cleo: crew on Kestrel
--   Dev:  on no boat

begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

\ir setup/tenancy.psql

grant select on person_ids to service_role;

set local role service_role;

select lives_ok(
  $$ insert into public.reminders_sent (boat_id, person_id, item_type, item_id, due_on, due_at_engine_hours, status)
     values
       ('10000000-0000-0000-0000-000000000001', (select id from person_ids where email = 'ada@example.test'),
        'maintenance', '40000000-0000-0000-0000-000000000001', '2026-10-18', 1471, 'overdue'),
       ('10000000-0000-0000-0000-000000000001', (select id from person_ids where email = 'ben@example.test'),
        'maintenance', '40000000-0000-0000-0000-000000000001', '2026-10-18', 1471, 'overdue'),
       ('10000000-0000-0000-0000-000000000001', (select id from person_ids where email = 'ada@example.test'),
        'maintenance', '40000000-0000-0000-0000-000000000002', null, 900, 'due_soon') $$,
  'the job records reminders'
);

select throws_ok(
  $$ insert into public.reminders_sent (boat_id, person_id, item_type, item_id, due_on, due_at_engine_hours, status)
     values ('10000000-0000-0000-0000-000000000001', (select id from person_ids where email = 'ada@example.test'),
             'maintenance', '40000000-0000-0000-0000-000000000001', '2026-10-18', 1471, 'overdue') $$,
  '23505',
  null,
  'the same reminder can''t be recorded twice'
);

select throws_ok(
  $$ insert into public.reminders_sent (boat_id, person_id, item_type, item_id, due_on, due_at_engine_hours, status)
     values ('10000000-0000-0000-0000-000000000001', (select id from person_ids where email = 'ada@example.test'),
             'maintenance', '40000000-0000-0000-0000-000000000002', null, 900, 'due_soon') $$,
  '23505',
  null,
  'nor one due only by engine hours (no date)'
);

select lives_ok(
  $$ insert into public.reminders_sent (boat_id, person_id, item_type, item_id, due_on, due_at_engine_hours, status)
     values ('10000000-0000-0000-0000-000000000001', (select id from person_ids where email = 'ada@example.test'),
             'maintenance', '40000000-0000-0000-0000-000000000002', null, 900, 'overdue') $$,
  'the same item can be reminded again when it becomes overdue'
);

select throws_ok(
  $$ insert into public.reminders_sent (boat_id, person_id, item_type, item_id, status)
     values ('10000000-0000-0000-0000-000000000001', (select id from person_ids where email = 'ada@example.test'),
             'renewal', '40000000-0000-0000-0000-000000000003', 'overdue') $$,
  '23514',
  null,
  'a reminder is about a date or engine hours'
);

reset role;

select pg_temp.sign_in_as('ben@example.test');

select results_eq(
  $$ select count(*)::int from public.reminders_sent $$,
  $$ values (1) $$,
  'people see only the reminders sent to them'
);

select throws_ok(
  $$ insert into public.reminders_sent (boat_id, person_id, item_type, item_id, due_on, status)
     values ('10000000-0000-0000-0000-000000000001', public.current_person_id(),
             'renewal', '40000000-0000-0000-0000-000000000004', '2026-12-31', 'due_soon') $$,
  '42501',
  null,
  'signed-in people can''t record reminders'
);

select pg_temp.sign_in_as('dev@example.test');

select is_empty($$ select * from public.reminders_sent $$, 'someone on no boat sees none');

select * from finish();
rollback;
