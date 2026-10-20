-- A person's stored email follows their sign-in email (#117), and email-in matching follows it.
-- Run with `npm run db:test`.
--
-- The people and boats come from setup/tenancy.psql:
--   Ada:  owner of Kestrel, read-only on Petrel
--   Ben:  owner of Petrel, co-owner of Kestrel
--   Cleo: crew on Kestrel
--   Dev:  on no boat

begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

-- Setup, as the database owner -------------------------------------------------------------

\ir setup/tenancy.psql

grant select on person_ids to service_role;

update public.boats set email_alias = 'kestrel-test01' where name = 'Kestrel';

-- Ada's sign-in address is also one of Ada's verified sender addresses.
insert into public.sender_addresses (person_id, address, verified_at)
select id, 'ada@example.test', now() from person_ids where email = 'ada@example.test';

-- A confirmed change ----------------------------------------------------------------------------

update auth.users set email = 'cleo.new@example.test'
where id = '00000000-0000-0000-0000-00000000000c';

update auth.users set email = 'ada.new@example.test'
where id = '00000000-0000-0000-0000-00000000000a';

select is(
  (select email from public.people where id = (select id from person_ids where email = 'cleo@example.test')),
  'cleo.new@example.test',
  'a changed sign-in email is copied to the person'
);

select is(
  (select email from public.people where id = (select id from person_ids where email = 'ben@example.test')),
  'ben@example.test',
  'other people keep their email'
);

-- Nothing to follow --------------------------------------------------------------------------

-- Set Ben's stored email apart, so a trigger that fired would show by putting it back.
update public.people set email = 'ben.stored@example.test'
where id = (select id from person_ids where email = 'ben@example.test');

update auth.users set email = email, last_sign_in_at = now()
where id = '00000000-0000-0000-0000-00000000000b';

-- A change waiting for confirmation: Supabase Auth keeps the new address in email_change.
update auth.users set email_change = 'dev.pending@example.test', email_change_sent_at = now()
where id = '00000000-0000-0000-0000-00000000000d';

select is(
  (select email from public.people where id = (select id from person_ids where email = 'ben@example.test')),
  'ben.stored@example.test',
  'an update that leaves the sign-in email as it was doesn''t touch the person'
);

select is(
  (select email from public.people where id = (select id from person_ids where email = 'dev@example.test')),
  'dev@example.test',
  'a change waiting for confirmation isn''t followed'
);

update auth.users set email = email_change, email_change = '', email_change_sent_at = null
where id = '00000000-0000-0000-0000-00000000000d';

select is(
  (select email from public.people where id = (select id from person_ids where email = 'dev@example.test')),
  'dev.pending@example.test',
  'once confirmed, it is'
);

update public.people set email = 'ben@example.test'
where id = (select id from person_ids where email = 'ben@example.test');

-- Matching follows, as the webhook (service role) ---------------------------------------------

set local role service_role;

select results_eq(
  $$ select person_id from public.match_inbound_email('kestrel-test01', 'Cleo.New@example.test') $$,
  $$ values ((select id from person_ids where email = 'cleo@example.test')) $$,
  'mail from the new sign-in address is filed under the person'
);

select results_eq(
  $$ select person_id from public.match_inbound_email('kestrel-test01', 'cleo@example.test') $$,
  $$ values (null::uuid) $$,
  'mail from the old one no longer matches'
);

select results_eq(
  $$ select person_id from public.match_inbound_email('kestrel-test01', 'ada@example.test') $$,
  $$ values ((select id from person_ids where email = 'ada@example.test')) $$,
  'unless the old one is also a verified sender address'
);

select results_eq(
  $$ select person_id from public.match_inbound_email('kestrel-test01', 'ada.new@example.test') $$,
  $$ values ((select id from person_ids where email = 'ada@example.test')) $$,
  'and the new one matches then too'
);

reset role;

-- Privileges ---------------------------------------------------------------------------------

select ok(
  not has_function_privilege('authenticated', 'public.update_person_email_for_auth_user()', 'execute')
  and not has_function_privilege('anon', 'public.update_person_email_for_auth_user()', 'execute'),
  'the API roles can''t call the trigger function'
);

select pg_temp.sign_in_as('cleo.new@example.test');

select throws_ok(
  $$ update public.people set email = 'someone.else@example.test' where id = public.current_person_id() $$,
  '42501',
  null,
  'people can''t change their stored email through the API'
);

select results_eq(
  $$ select email from public.people where id = public.current_person_id() $$,
  $$ values ('cleo.new@example.test') $$,
  'they see their current address'
);

select * from finish();
rollback;
