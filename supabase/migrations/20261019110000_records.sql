-- Renewals, maintenance items and expenses: the records that filing produces and that
-- reminders, the cost split and the web screen read (#9).
--
-- Every record belongs to a boat and follows the tenancy rules from the boats, people and
-- memberships migration: members read; owners, co-owners and crew write; read-only members
-- don't. Columns match the inputs of packages/calc, so readers only rename them:
--
--   renewals.expires_on                       -> DueRule { kind: "expiry", expiresOn }
--   maintenance_items.last_done_on,
--     every_months, last_done_engine_hours,
--     every_engine_hours                      -> DueRule { kind: "interval", ... } (null = not set)
--   expenses.amount_cents, paid_by, spent_on  -> Expense { amountCents, paidBy, date }
--   memberships.ownership_share               -> OwnershipShare { owner, share } (shares > 0 only)
--
-- Dates are calendar dates (`date`, YYYY-MM-DD), like calc's. Money is integer cents with an
-- ISO 4217 currency code.
--
-- `document_id` is the document a record came from. It becomes a foreign key to `documents`
-- once that table exists (#8).

-- Ownership shares --------------------------------------------------------------------------
-- The cost split divides expenses by these. Only the ratio matters (40/35/25 = 8/7/5). Crew and
-- read-only members keep 0. Only owners can change memberships, so only owners set shares.

alter table public.memberships
  add column ownership_share integer not null default 0 check (ownership_share >= 0);

-- Renewals ----------------------------------------------------------------------------------

create type public.renewal_kind as enum ('insurance', 'registration', 'licence', 'other');

create table public.renewals (
  id uuid primary key default gen_random_uuid(),
  boat_id uuid not null references public.boats (id) on delete cascade,
  kind public.renewal_kind not null,
  title text not null check (length(trim(title)) between 1 and 200),
  -- Policy, registration or licence number, as printed.
  reference text,
  expires_on date not null,
  notes text,
  document_id uuid,
  created_at timestamptz not null default now()
);

create index renewals_boat_id_idx on public.renewals (boat_id);
create index renewals_document_id_idx on public.renewals (document_id);

-- Maintenance items -------------------------------------------------------------------------
-- Due every so many months, every so many engine hours, or both, whichever comes first.

create table public.maintenance_items (
  id uuid primary key default gen_random_uuid(),
  boat_id uuid not null references public.boats (id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 200),
  every_months integer check (every_months > 0),
  every_engine_hours integer check (every_engine_hours > 0),
  last_done_on date not null,
  -- The engine hour meter when it was last done, in tenths like the meter.
  last_done_engine_hours numeric(8, 1) check (last_done_engine_hours >= 0),
  notes text,
  document_id uuid,
  created_at timestamptz not null default now(),
  constraint maintenance_items_has_interval
    check (every_months is not null or every_engine_hours is not null),
  constraint maintenance_items_hours_interval_needs_reading
    check (every_engine_hours is null or last_done_engine_hours is not null)
);

create index maintenance_items_boat_id_idx on public.maintenance_items (boat_id);
create index maintenance_items_document_id_idx on public.maintenance_items (document_id);

-- Expenses ----------------------------------------------------------------------------------

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  boat_id uuid not null references public.boats (id) on delete cascade,
  description text not null check (length(trim(description)) between 1 and 200),
  -- A refund or credit is negative.
  amount_cents bigint not null,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  spent_on date not null,
  -- The person who paid. They must be on the boat when the expense is recorded; the expense
  -- stays if they later leave, so the boat's history and past splits don't change.
  paid_by uuid not null references public.people (id),
  notes text,
  document_id uuid,
  created_at timestamptz not null default now()
);

create index expenses_boat_id_idx on public.expenses (boat_id);
create index expenses_paid_by_idx on public.expenses (paid_by);
create index expenses_document_id_idx on public.expenses (document_id);

-- Security definer so the check sees the boat's memberships whoever is writing.
create function public.check_expense_payer_is_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.memberships where boat_id = new.boat_id and person_id = new.paid_by
  ) then
    raise exception 'The payer must be a person on the boat'
      using errcode = '23514', table = 'expenses', column = 'paid_by';
  end if;
  return new;
end;
$$;

revoke execute on function public.check_expense_payer_is_member() from public, anon, authenticated;

create trigger check_expense_payer_is_member
  before insert or update of boat_id, paid_by on public.expenses
  for each row execute function public.check_expense_payer_is_member();

-- Privileges --------------------------------------------------------------------------------

revoke all on public.renewals, public.maintenance_items, public.expenses from anon, authenticated;
grant select, insert, update, delete
  on public.renewals, public.maintenance_items, public.expenses to authenticated;

-- Row-level security ------------------------------------------------------------------------
-- The same four policies on each record table. Moving a record to another boat needs write
-- access to both.

alter table public.renewals enable row level security;
alter table public.maintenance_items enable row level security;
alter table public.expenses enable row level security;

create policy "renewals: members see"
  on public.renewals for select to authenticated
  using (public.can_read_boat(boat_id));
create policy "renewals: writers add"
  on public.renewals for insert to authenticated
  with check (public.can_write_boat(boat_id));
create policy "renewals: writers change"
  on public.renewals for update to authenticated
  using (public.can_write_boat(boat_id))
  with check (public.can_write_boat(boat_id));
create policy "renewals: writers remove"
  on public.renewals for delete to authenticated
  using (public.can_write_boat(boat_id));

create policy "maintenance_items: members see"
  on public.maintenance_items for select to authenticated
  using (public.can_read_boat(boat_id));
create policy "maintenance_items: writers add"
  on public.maintenance_items for insert to authenticated
  with check (public.can_write_boat(boat_id));
create policy "maintenance_items: writers change"
  on public.maintenance_items for update to authenticated
  using (public.can_write_boat(boat_id))
  with check (public.can_write_boat(boat_id));
create policy "maintenance_items: writers remove"
  on public.maintenance_items for delete to authenticated
  using (public.can_write_boat(boat_id));

create policy "expenses: members see"
  on public.expenses for select to authenticated
  using (public.can_read_boat(boat_id));
create policy "expenses: writers add"
  on public.expenses for insert to authenticated
  with check (public.can_write_boat(boat_id));
create policy "expenses: writers change"
  on public.expenses for update to authenticated
  using (public.can_write_boat(boat_id))
  with check (public.can_write_boat(boat_id));
create policy "expenses: writers remove"
  on public.expenses for delete to authenticated
  using (public.can_write_boat(boat_id));
