-- Email-in (#10): boats' addresses, sender addresses, matching a message to a boat and a member,
-- and who sees filed and held mail. Run with `npm run db:test`.
--
-- The people and boats come from setup/tenancy.psql:
--   Ada:  owner of Kestrel, read-only on Petrel
--   Ben:  owner of Petrel, co-owner of Kestrel
--   Cleo: crew on Kestrel
--   Dev:  on no boat

begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

-- Setup, as the database owner -------------------------------------------------------------

\ir setup/tenancy.psql

grant select on person_ids to service_role;

update public.boats set email_alias = 'kestrel-test01' where name = 'Kestrel';
update public.boats set email_alias = 'petrel-test02' where name = 'Petrel';

-- Cleo forwards from a second, verified address; Dev's extra address isn't verified, and
-- Ben has one that isn't verified either.
insert into public.sender_addresses (person_id, address, verified_at)
select id, a.address, a.verified_at
from (values
  ('cleo@example.test', 'cleo.home@example.test', now()),
  ('ben@example.test', 'ben.unverified@example.test', null::timestamptz),
  ('dev@example.test', 'dev.home@example.test', now())
) as a (email, address, verified_at)
join public.people p on p.email = a.email;

insert into public.inbound_emails
  (id, boat_id, provider_email_id, from_address, subject, received_at, status, sender_person_id)
values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'filed-kestrel',
   'cleo@example.test', 'Survey', now(), 'filed', (select id from person_ids where email = 'cleo@example.test')),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'held-kestrel',
   'stranger@example.test', 'Pay now', now(), 'held', null),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'held-petrel',
   'stranger@example.test', 'Pay now', now(), 'held', null);

-- Boats' addresses -------------------------------------------------------------------------

-- create_boat needs a signed-in person, so insert directly as the owner.
insert into public.boats (id, name) values ('10000000-0000-0000-0000-000000000003', 'L''Été Bleu  II');

select matches(
  (select email_alias from public.boats where id = '10000000-0000-0000-0000-000000000003'),
  '^l-ete-bleu-ii-[a-hj-km-np-z2-9]{6}$',
  'a new boat gets its name, accents removed, plus six random characters'
);

insert into public.boats (id, name) values ('10000000-0000-0000-0000-000000000004', '!!!');

select matches(
  (select email_alias from public.boats where id = '10000000-0000-0000-0000-000000000004'),
  '^boat-[a-hj-km-np-z2-9]{6}$',
  'a name with no letters or digits becomes "boat"'
);

select throws_ok(
  $$ insert into public.boats (name, email_alias) values ('Copy', 'kestrel-test01') $$,
  '23505',
  null,
  'two boats can''t share an address'
);

select throws_ok(
  $$ insert into public.boats (name, email_alias) values ('Bad', 'Has Spaces') $$,
  '23514',
  null,
  'an address is lowercase letters, digits and hyphens'
);

-- Matching, as the webhook (service role) ----------------------------------------------------

set local role service_role;

select results_eq(
  $$ select boat_id, person_id from public.match_inbound_email('kestrel-test01', 'ADA@example.test') $$,
  $$ values ('10000000-0000-0000-0000-000000000001'::uuid, (select id from person_ids where email = 'ada@example.test')) $$,
  'a member''s sign-in address matches, whatever its case'
);

select results_eq(
  $$ select person_id from public.match_inbound_email('Kestrel-Test01', ' cleo.home@example.test ') $$,
  $$ values ((select id from person_ids where email = 'cleo@example.test')) $$,
  'a member''s verified sender address matches, and the alias is case-insensitive'
);

select results_eq(
  $$ select person_id from public.match_inbound_email('kestrel-test01', 'ben.unverified@example.test') $$,
  $$ values (null::uuid) $$,
  'an unverified sender address doesn''t match'
);

select results_eq(
  $$ select boat_id, person_id from public.match_inbound_email('kestrel-test01', 'dev.home@example.test') $$,
  $$ values ('10000000-0000-0000-0000-000000000001'::uuid, null::uuid) $$,
  'someone who isn''t on the boat finds the boat but no member'
);

select results_eq(
  $$ select person_id from public.match_inbound_email('petrel-test02', 'cleo@example.test') $$,
  $$ values (null::uuid) $$,
  'a member of another boat isn''t a member of this one'
);

select is_empty(
  $$ select * from public.match_inbound_email('nobody', 'ada@example.test') $$,
  'an address that isn''t a boat''s matches nothing'
);

select lives_ok(
  $$ insert into public.inbound_emails (boat_id, provider_email_id, from_address, received_at, status)
     values ('10000000-0000-0000-0000-000000000002', 'by-webhook', 'x@example.test', now(), 'held') $$,
  'the webhook records messages'
);

select throws_ok(
  $$ insert into public.inbound_emails (boat_id, provider_email_id, from_address, received_at, status)
     values ('10000000-0000-0000-0000-000000000002', 'by-webhook', 'x@example.test', now(), 'held') $$,
  '23505',
  null,
  'the same provider message is only recorded once'
);

reset role;

-- Who sees what ------------------------------------------------------------------------------

select pg_temp.sign_in_as('cleo@example.test');

select throws_ok(
  $$ select * from public.match_inbound_email('kestrel-test01', 'cleo@example.test') $$,
  '42501',
  null,
  'signed-in people can''t call the matching function'
);

select results_eq(
  $$ select provider_email_id from public.inbound_emails order by 1 $$,
  $$ values ('filed-kestrel') $$,
  'crew see filed mail but not held mail'
);

select results_eq(
  $$ select address from public.sender_addresses $$,
  $$ values ('cleo.home@example.test') $$,
  'people see their own sender addresses only'
);

select throws_ok(
  $$ insert into public.sender_addresses (person_id, address) values (public.current_person_id(), 'new@example.test') $$,
  '42501',
  null,
  'sender addresses aren''t added through the API yet (#27)'
);

select throws_ok(
  $$ insert into public.inbound_emails (boat_id, provider_email_id, from_address, received_at, status)
     values ('10000000-0000-0000-0000-000000000001', 'forged', 'x@example.test', now(), 'filed') $$,
  '42501',
  null,
  'signed-in people can''t record inbound mail'
);

select pg_temp.sign_in_as('ben@example.test');

select results_eq(
  $$ select provider_email_id from public.inbound_emails order by 1 $$,
  $$ values ('by-webhook'), ('filed-kestrel'), ('held-kestrel'), ('held-petrel') $$,
  'owners and co-owners see filed and held mail on their boats'
);

select pg_temp.sign_in_as('ada@example.test');

select results_eq(
  $$ select provider_email_id from public.inbound_emails order by 1 $$,
  $$ values ('filed-kestrel'), ('held-kestrel') $$,
  'a read-only member of Petrel doesn''t see its held mail'
);

select results_eq(
  $$ select email_alias from public.boats order by 1 $$,
  $$ values ('kestrel-test01'), ('petrel-test02') $$,
  'members see their boats'' addresses'
);

select throws_ok(
  $$ update public.boats set email_alias = 'kestrel' where name = 'Kestrel' $$,
  '42501',
  null,
  'an owner can''t change the boat''s address'
);

select lives_ok(
  $$ update public.boats set name = 'Kestrel II' where email_alias = 'kestrel-test01' $$,
  'an owner can still rename the boat'
);

select results_eq(
  $$ select name from public.boats where email_alias = 'kestrel-test01' $$,
  $$ values ('Kestrel II') $$,
  'the rename took'
);

select pg_temp.sign_in_as('dev@example.test');

select is_empty(
  $$ select * from public.inbound_emails $$,
  'someone on no boat sees no mail'
);

reset role;

select results_eq(
  $$ select count(*)::int from public.boats where email_alias is null $$,
  $$ values (0) $$,
  'every boat has an address'
);

select * from finish();
rollback;
