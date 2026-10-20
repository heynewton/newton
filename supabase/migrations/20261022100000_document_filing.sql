-- Filing (#11): Claude classifies each stored document and proposes records; code checks every
-- date and amount (packages/calc) and saves what passes as renewals, expenses and maintenance,
-- linked to the document. What doesn't pass, or what Claude wasn't sure of, is kept here,
-- flagged for a person to review, instead of being guessed.
--
-- Filing runs as the server (service role), never as a person: right after email-in stores a
-- document, and again from a daily sweep for anything left over (docs/architecture.md, "Filing").
-- It is idempotent: `save_document_filing()` writes the filing and its records in one transaction,
-- once per document, so running it again for a filed document changes nothing.

-- Filings -----------------------------------------------------------------------------------

-- filed: everything Claude proposed was checked and saved.
-- needs_review: something was flagged (low confidence, a value code couldn't read, a likely
--   duplicate, a payer it couldn't tell); what passed is saved, the rest waits in `flags`.
-- failed: Claude or the file couldn't be read; retried by the sweep up to a few times.
create type public.filing_status as enum ('filed', 'needs_review', 'failed');

create table public.document_filings (
  id uuid primary key default gen_random_uuid(),
  boat_id uuid not null references public.boats (id) on delete cascade,
  -- One filing per document: the unique key is what makes filing idempotent.
  document_id uuid not null unique,
  status public.filing_status not null,
  -- What Claude said the document is, and how sure it was. Null when filing failed.
  document_type public.document_type,
  confidence text check (confidence in ('high', 'medium', 'low')),
  summary text,
  vendor text,
  -- Claude's proposal as it came back (values as printed on the document), for review and evals.
  proposal jsonb,
  -- What code didn't accept: [{ "record": "expense 1", "field": "amount", "value": "1,234",
  -- "problem": "..." }]. Empty when filed.
  flags jsonb not null default '[]'::jsonb check (jsonb_typeof(flags) = 'array'),
  -- The model that read it, so a filing can be traced and compared across models.
  model text,
  attempts integer not null default 1 check (attempts > 0),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (document_id, boat_id) references public.documents (id, boat_id) on delete cascade
);

create index document_filings_boat_id_status_idx on public.document_filings (boat_id, status);

-- Privileges --------------------------------------------------------------------------------

-- Members see how their boat's documents were filed; only the server writes. A review screen
-- (later) will add what a person can change. Hosted projects don't grant new tables to
-- service_role on their own, so its grants are explicit.
revoke all on public.document_filings from anon, authenticated, service_role;
grant select on public.document_filings to authenticated;
grant select, insert, update on public.document_filings to service_role;

-- What filing reads (the document and its email, existing records to avoid duplicates) and
-- writes (records, and the document's type once it is known).
grant select on public.documents, public.inbound_emails, public.renewals, public.maintenance_items,
  public.expenses, public.memberships to service_role;
grant update (type) on public.documents to service_role;
grant insert on public.renewals, public.expenses, public.maintenance_items to service_role;
grant update (last_done_on, last_done_engine_hours, document_id) on public.maintenance_items to service_role;

alter table public.document_filings enable row level security;

create policy "document filings: members see"
  on public.document_filings for select to authenticated
  using (public.can_read_boat(boat_id));

-- Saving a filing ---------------------------------------------------------------------------

-- Saves one document's filing and the records that passed the checks, in one transaction.
-- `records` holds only values code has already parsed and validated:
--
--   { "renewals":         [{ kind, title, reference, expires_on, notes }],
--     "expenses":         [{ description, amount_cents, currency, spent_on, paid_by, notes }],
--     "maintenance_new":  [{ title, every_months, every_engine_hours, last_done_on,
--                            last_done_engine_hours, notes }],
--     "maintenance_done": [{ id, last_done_on, last_done_engine_hours }] }
--
-- Every record gets the document's boat and links to the document. `maintenance_done` moves an
-- existing item of the same boat forward (never back) to when the document says it was done.
-- If the document was already filed (or is waiting for review), nothing changes and
-- `already_filed` is true. A failed filing is replaced. Unsorted documents take the type Claude
-- gave, unless it wasn't sure (low confidence); a type a person set is kept.
create function public.save_document_filing(
  document_id uuid,
  status public.filing_status,
  document_type public.document_type,
  confidence text,
  summary text,
  vendor text,
  proposal jsonb,
  flags jsonb,
  model text,
  records jsonb
)
returns table (filing_id uuid, already_filed boolean)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_document_id constant uuid := save_document_filing.document_id;
  v_boat_id uuid;
  v_existing public.document_filings%rowtype;
begin
  if save_document_filing.status = 'failed' then
    raise exception 'Use record_document_filing_failure() for a failed filing' using errcode = '22023';
  end if;

  -- Locking the document serializes two filings of it (the webhook's and the sweep's).
  select d.boat_id into v_boat_id from public.documents d where d.id = v_document_id for update;
  if v_boat_id is null then
    raise exception 'No document %', v_document_id using errcode = 'P0002';
  end if;

  select * into v_existing from public.document_filings f where f.document_id = v_document_id;
  if found and v_existing.status <> 'failed' then
    return query select v_existing.id, true;
    return;
  end if;

  insert into public.document_filings as f
    (boat_id, document_id, status, document_type, confidence, summary, vendor, proposal, flags, model)
  values
    (v_boat_id, v_document_id, save_document_filing.status, save_document_filing.document_type,
     save_document_filing.confidence, save_document_filing.summary, save_document_filing.vendor,
     save_document_filing.proposal, coalesce(save_document_filing.flags, '[]'::jsonb),
     save_document_filing.model)
  on conflict on constraint document_filings_document_id_key do update set
    status = excluded.status,
    document_type = excluded.document_type,
    confidence = excluded.confidence,
    summary = excluded.summary,
    vendor = excluded.vendor,
    proposal = excluded.proposal,
    flags = excluded.flags,
    model = excluded.model,
    attempts = f.attempts + 1,
    last_error = null,
    updated_at = now()
  returning f.id into v_existing.id;

  insert into public.renewals (boat_id, kind, title, reference, expires_on, notes, document_id)
  select v_boat_id, r.kind, r.title, r.reference, r.expires_on, r.notes, v_document_id
  from jsonb_to_recordset(coalesce(records -> 'renewals', '[]'::jsonb))
    as r (kind public.renewal_kind, title text, reference text, expires_on date, notes text);

  insert into public.expenses (boat_id, description, amount_cents, currency, spent_on, paid_by, notes, document_id)
  select v_boat_id, e.description, e.amount_cents, e.currency, e.spent_on, e.paid_by, e.notes, v_document_id
  from jsonb_to_recordset(coalesce(records -> 'expenses', '[]'::jsonb))
    as e (description text, amount_cents bigint, currency text, spent_on date, paid_by uuid, notes text);

  insert into public.maintenance_items
    (boat_id, title, every_months, every_engine_hours, last_done_on, last_done_engine_hours, notes, document_id)
  select v_boat_id, m.title, m.every_months, m.every_engine_hours, m.last_done_on, m.last_done_engine_hours,
    m.notes, v_document_id
  from jsonb_to_recordset(coalesce(records -> 'maintenance_new', '[]'::jsonb))
    as m (title text, every_months integer, every_engine_hours integer, last_done_on date,
          last_done_engine_hours numeric, notes text);

  update public.maintenance_items m set
    last_done_on = d.last_done_on,
    last_done_engine_hours = coalesce(d.last_done_engine_hours, m.last_done_engine_hours),
    document_id = v_document_id
  from jsonb_to_recordset(coalesce(records -> 'maintenance_done', '[]'::jsonb))
    as d (id uuid, last_done_on date, last_done_engine_hours numeric)
  where m.id = d.id
    and m.boat_id = v_boat_id
    and d.last_done_on >= m.last_done_on;

  update public.documents d set type = save_document_filing.document_type
  where d.id = v_document_id and d.type = 'unsorted' and save_document_filing.document_type is not null
    and save_document_filing.confidence is distinct from 'low';

  return query select v_existing.id, false;
end;
$$;

-- Records that filing a document failed (Claude unreachable, a file it couldn't read), so the
-- sweep can retry it. Does nothing to a document that is already filed or waiting for review.
create function public.record_document_filing_failure(document_id uuid, error text, model text)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.document_filings as f (boat_id, document_id, status, model, last_error)
  select d.boat_id, d.id, 'failed', record_document_filing_failure.model,
    left(record_document_filing_failure.error, 1000)
  from public.documents d
  where d.id = record_document_filing_failure.document_id
  on conflict on constraint document_filings_document_id_key do update set
    attempts = f.attempts + 1,
    model = excluded.model,
    last_error = excluded.last_error,
    updated_at = now()
  where f.status = 'failed';
$$;

-- Documents waiting to be filed, oldest first: unsorted documents with no filing, or whose
-- filing failed fewer than `max_attempts` times. The sweep files these.
create function public.documents_to_file(max_attempts integer, max_rows integer)
returns setof public.documents
language sql
stable
security invoker
set search_path = ''
as $$
  select d.*
  from public.documents d
  left join public.document_filings f on f.document_id = d.id
  where d.type = 'unsorted'
    and (f.id is null or (f.status = 'failed' and f.attempts < max_attempts))
  order by d.received_at, d.id
  limit max_rows
$$;

revoke execute on function public.save_document_filing(uuid, public.filing_status, public.document_type, text,
  text, text, jsonb, jsonb, text, jsonb) from public, anon, authenticated;
revoke execute on function public.record_document_filing_failure(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.documents_to_file(integer, integer) from public, anon, authenticated;
grant execute on function public.save_document_filing(uuid, public.filing_status, public.document_type, text,
  text, text, jsonb, jsonb, text, jsonb) to service_role;
grant execute on function public.record_document_filing_failure(uuid, text, text) to service_role;
grant execute on function public.documents_to_file(integer, integer) to service_role;
