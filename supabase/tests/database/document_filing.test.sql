-- Filing (#11): saving a document's filing and its records once, flagging, failures, the
-- sweep's list, and who can see or call what. Run with `npm run db:test`.
--
-- The people and boats come from setup/tenancy.psql:
--   Ada:  owner of Kestrel, read-only on Petrel
--   Ben:  owner of Petrel, co-owner of Kestrel
--   Cleo: crew on Kestrel
--   Dev:  on no boat

begin;
create extension if not exists pgtap with schema extensions;
select plan(31);

-- Setup, as the database owner -------------------------------------------------------------

\ir setup/tenancy.psql

grant select on person_ids to service_role;

-- Kestrel: an invoice, a certificate, a manual a person already sorted, and a scan that will
-- fail. Petrel: one unsorted document.
insert into public.documents (id, boat_id, storage_path, type, source, filename, received_at) values
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000001/email/x/1-invoice.pdf', 'unsorted', 'email', 'invoice.pdf', '2026-10-01'),
  ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000001/email/x/2-certificate.pdf', 'unsorted', 'email', 'certificate.pdf', '2026-10-02'),
  ('50000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000001/email/x/3-manual.pdf', 'manual', 'email', 'manual.pdf', '2026-10-03'),
  ('50000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000001/email/x/4-scan.pdf', 'unsorted', 'email', 'scan.pdf', '2026-10-04'),
  ('50000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002',
   '10000000-0000-0000-0000-000000000002/email/y/1-invoice.pdf', 'unsorted', 'email', 'invoice.pdf', '2026-10-05');

-- An oil change on each boat, done before the invoice.
insert into public.maintenance_items (id, boat_id, title, every_months, every_engine_hours, last_done_on, last_done_engine_hours) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   'Engine oil and filter', 12, 100, '2025-10-01', 1300),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002',
   'Petrel oil change', 12, null, '2025-10-01', null);

-- What the invoice's filing saves: an expense, a new item and two items done.
create temp table invoice_records as select jsonb_build_object(
  'expenses', jsonb_build_array(jsonb_build_object(
    'description', 'Yard: haul-out and engine service', 'amount_cents', 167690, 'currency', 'USD',
    'spent_on', '2026-10-02', 'paid_by', (select id from person_ids where email = 'cleo@example.test'),
    'notes', null)),
  'maintenance_new', jsonb_build_array(jsonb_build_object(
    'title', 'Raw-water pump impeller', 'every_months', 24, 'every_engine_hours', 250,
    'last_done_on', '2026-10-02', 'last_done_engine_hours', 1412, 'notes', null)),
  -- Kestrel's oil change moves forward; Petrel's item is another boat's and must not change.
  'maintenance_done', jsonb_build_array(
    jsonb_build_object('id', '30000000-0000-0000-0000-000000000001', 'last_done_on', '2026-10-02', 'last_done_engine_hours', 1412),
    jsonb_build_object('id', '30000000-0000-0000-0000-000000000002', 'last_done_on', '2026-10-02', 'last_done_engine_hours', 1412))
) as records;
grant select on invoice_records to service_role;

-- The sweep's list, as the server ----------------------------------------------------------

set local role service_role;

select results_eq(
  $$ select id from public.documents_to_file(3, 10) $$,
  $$ values ('50000000-0000-0000-0000-000000000001'::uuid), ('50000000-0000-0000-0000-000000000002'::uuid),
            ('50000000-0000-0000-0000-000000000004'::uuid), ('50000000-0000-0000-0000-000000000005'::uuid) $$,
  'unsorted documents with no filing wait to be filed, oldest first; a sorted one doesn''t'
);

-- Filing the invoice -----------------------------------------------------------------------


select results_eq(
  $$ select already_filed from public.save_document_filing(
       '50000000-0000-0000-0000-000000000001', 'filed', 'invoice', 'high', 'Yard invoice', 'Example Yard',
       '{"document_type": "invoice"}', '[]', 'stand-in', (select records from invoice_records)) $$,
  $$ values (false) $$,
  'the server files a document'
);

select results_eq(
  $$ select status::text, document_type::text, confidence, vendor, attempts from public.document_filings
     where document_id = '50000000-0000-0000-0000-000000000001' $$,
  $$ values ('filed', 'invoice', 'high', 'Example Yard', 1) $$,
  'the filing records what it is, how sure, the vendor and one attempt'
);

select results_eq(
  $$ select boat_id, amount_cents, document_id from public.expenses where document_id = '50000000-0000-0000-0000-000000000001' $$,
  $$ values ('10000000-0000-0000-0000-000000000001'::uuid, 167690::bigint, '50000000-0000-0000-0000-000000000001'::uuid) $$,
  'the expense is saved on the document''s boat and links to it'
);

select results_eq(
  $$ select every_months, every_engine_hours, last_done_engine_hours, document_id from public.maintenance_items
     where title = 'Raw-water pump impeller' and boat_id = '10000000-0000-0000-0000-000000000001' $$,
  $$ values (24, 250, 1412.0::numeric(8, 1), '50000000-0000-0000-0000-000000000001'::uuid) $$,
  'a new maintenance item is saved with its interval and links to the document'
);

select results_eq(
  $$ select last_done_on, last_done_engine_hours, document_id from public.maintenance_items
     where id = '30000000-0000-0000-0000-000000000001' $$,
  $$ values ('2026-10-02'::date, 1412.0::numeric(8, 1), '50000000-0000-0000-0000-000000000001'::uuid) $$,
  'an existing item of the same boat moves forward to when the document says it was done'
);

select results_eq(
  $$ select last_done_on, document_id from public.maintenance_items where id = '30000000-0000-0000-0000-000000000002' $$,
  $$ values ('2025-10-01'::date, null::uuid) $$,
  'an item of another boat is not touched'
);

select is(
  (select type::text from public.documents where id = '50000000-0000-0000-0000-000000000001'),
  'invoice',
  'the unsorted document takes the type Claude gave'
);

-- Filing again changes nothing.
select results_eq(
  $$ select already_filed from public.save_document_filing(
       '50000000-0000-0000-0000-000000000001', 'filed', 'receipt', 'high', 'Again', 'Example Yard',
       '{}', '[]', 'stand-in', (select records from invoice_records)) $$,
  $$ values (true) $$,
  'filing a filed document again is a no-op'
);

select is((select count(*) from public.expenses where boat_id = '10000000-0000-0000-0000-000000000001'), 1::bigint, 'no duplicate expense');
select is((select count(*) from public.maintenance_items where boat_id in ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002')), 3::bigint, 'no duplicate maintenance item');
select is(
  (select document_type::text from public.document_filings where document_id = '50000000-0000-0000-0000-000000000001'),
  'invoice',
  'the first filing stands'
);

-- An item can't move back in time.
select lives_ok(
  $$ select public.save_document_filing(
       '50000000-0000-0000-0000-000000000002', 'needs_review', 'insurance', 'low', 'Old certificate', null,
       '{}', '[{"record": "renewal 1", "field": "expires_on", "value": "02.10.2026", "problem": "ambiguous"}]',
       'stand-in', jsonb_build_object('maintenance_done', jsonb_build_array(jsonb_build_object(
         'id', '30000000-0000-0000-0000-000000000001', 'last_done_on', '2026-01-01', 'last_done_engine_hours', 1350)))) $$,
  'a flagged filing is saved'
);

select results_eq(
  $$ select last_done_on, last_done_engine_hours from public.maintenance_items where id = '30000000-0000-0000-0000-000000000001' $$,
  $$ values ('2026-10-02'::date, 1412.0::numeric(8, 1)) $$,
  'an older date doesn''t move an item back'
);

select results_eq(
  $$ select status::text, jsonb_array_length(flags) from public.document_filings
     where document_id = '50000000-0000-0000-0000-000000000002' $$,
  $$ values ('needs_review', 1) $$,
  'the flagged filing keeps what needs review'
);

select is((select count(*) from public.renewals where boat_id = '10000000-0000-0000-0000-000000000001'), 0::bigint, 'a flagged value saves no record');

select is(
  (select type::text from public.documents where id = '50000000-0000-0000-0000-000000000003'),
  'manual',
  'a type a person set is kept'
);

-- Failures and retries ---------------------------------------------------------------------

do $$ begin
  perform public.record_document_filing_failure('50000000-0000-0000-0000-000000000004', 'Claude timed out', 'stand-in');
  perform public.record_document_filing_failure('50000000-0000-0000-0000-000000000004', 'Claude timed out again', 'stand-in');
end $$;

select results_eq(
  $$ select status::text, attempts, last_error from public.document_filings where document_id = '50000000-0000-0000-0000-000000000004' $$,
  $$ values ('failed', 2, 'Claude timed out again') $$,
  'a failure is recorded and counted'
);

select results_eq(
  $$ select id from public.documents_to_file(3, 10) $$,
  $$ values ('50000000-0000-0000-0000-000000000004'::uuid), ('50000000-0000-0000-0000-000000000005'::uuid) $$,
  'filed and flagged documents leave the list; a failed one stays until it has failed enough'
);

select is_empty(
  $$ select id from public.documents_to_file(2, 10) where id = '50000000-0000-0000-0000-000000000004' $$,
  'after enough attempts a failed document stops being retried'
);

do $$ begin
  perform public.record_document_filing_failure('50000000-0000-0000-0000-000000000001', 'late failure', 'stand-in');
end $$;
select is(
  (select status::text from public.document_filings where document_id = '50000000-0000-0000-0000-000000000001'),
  'filed',
  'a failure doesn''t undo a filed document'
);

select results_eq(
  $$ select already_filed from public.save_document_filing(
       '50000000-0000-0000-0000-000000000004', 'filed', 'receipt', 'high', 'Receipt', null, '{}', '[]', 'stand-in', '{}') $$,
  $$ values (false) $$,
  'a retry replaces the failed filing'
);

select results_eq(
  $$ select status::text, attempts, last_error from public.document_filings where document_id = '50000000-0000-0000-0000-000000000004' $$,
  $$ values ('filed', 3, null::text) $$,
  'the retry counts as an attempt and clears the error'
);

select throws_ok(
  $$ select public.save_document_filing('50000000-0000-0000-0000-000000000005', 'failed', null, null, null, null, null, '[]', 'x', '{}') $$,
  '22023',
  null,
  'a failure goes through record_document_filing_failure'
);

select throws_ok(
  $$ select public.save_document_filing('59999999-0000-0000-0000-000000000000', 'filed', 'invoice', 'high', null, null, null, '[]', 'x', '{}') $$,
  'P0002',
  null,
  'filing a document that doesn''t exist fails'
);

-- People ------------------------------------------------------------------------------------

select pg_temp.sign_in_as('cleo@example.test');

select results_eq(
  $$ select document_id from public.document_filings order by document_id $$,
  $$ values ('50000000-0000-0000-0000-000000000001'::uuid), ('50000000-0000-0000-0000-000000000002'::uuid),
            ('50000000-0000-0000-0000-000000000004'::uuid) $$,
  'a member sees their boat''s filings'
);

select throws_ok(
  $$ select public.save_document_filing('50000000-0000-0000-0000-000000000005', 'filed', 'invoice', 'high', null, null, null, '[]', 'x', '{}') $$,
  '42501',
  null,
  'a person can''t save a filing'
);

select throws_ok(
  $$ select public.documents_to_file(3, 10) $$,
  '42501',
  null,
  'a person can''t list documents to file'
);

select throws_ok(
  $$ insert into public.document_filings (boat_id, document_id, status)
     values ('10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000003', 'filed') $$,
  '42501',
  null,
  'a person can''t write a filing directly'
);

select pg_temp.sign_in_as('dev@example.test');

select is_empty($$ select id from public.document_filings $$, 'someone on no boat sees no filings');

reset role;
set local role anon;

select throws_ok(
  $$ select id from public.document_filings $$,
  '42501',
  null,
  'anonymous callers can''t read filings'
);

select * from finish();
rollback;
