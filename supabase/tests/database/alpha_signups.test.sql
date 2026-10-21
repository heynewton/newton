-- Alpha test sign-ups from /get-started. Run with `npm run db:test`.

begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

-- Signed out ---------------------------------------------------------------------------------

set local role anon;

select lives_ok(
  $$ select public.register_for_alpha('  sam@example.test ', '  Sigma 33, Solent  ') $$,
  'a signed-out visitor can register'
);

select lives_ok(
  $$ select public.register_for_alpha('SAM@example.test', 'another boat') $$,
  'registering the same address again succeeds, without saying it was already there'
);

select lives_ok(
  $$ select public.register_for_alpha('kim@example.test') $$,
  'the line about the boat is optional'
);

select throws_ok(
  $$ select public.register_for_alpha('not an email') $$,
  '23514',
  null,
  'an address that is not an email is refused'
);

select throws_ok(
  $$ select public.register_for_alpha('lee@example.test', repeat('x', 501)) $$,
  '23514',
  null,
  'an overlong line about the boat is refused'
);

select throws_ok(
  'select email from public.alpha_signups',
  '42501',
  null,
  'signed-out visitors cannot read the list'
);

-- Signed in ----------------------------------------------------------------------------------

reset role;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'ada@example.test');
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-00000000000a', 'role', 'authenticated')::text,
  true
);
set local role authenticated;

select lives_ok(
  $$ select public.register_for_alpha('ada@example.test', '') $$,
  'a signed-in person can register too'
);

select throws_ok(
  'select email from public.alpha_signups',
  '42501',
  null,
  'signed-in people cannot read the list'
);

-- What was stored ----------------------------------------------------------------------------

reset role;

select results_eq(
  'select email, about_boat from public.alpha_signups order by email',
  $$ values ('ada@example.test', null::text),
            ('kim@example.test', null::text),
            ('sam@example.test', 'Sigma 33, Solent') $$,
  'one row per address, trimmed, the first sign-up kept and an empty line stored as null'
);

select * from finish();
rollback;
