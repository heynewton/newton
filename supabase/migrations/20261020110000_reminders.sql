-- Email reminders for renewals and maintenance (#12): what has been sent, so the daily digest
-- doesn't repeat itself.
--
-- A scheduled job (docs/decisions/0005-scheduled-jobs.md) works out what is due with
-- packages/calc, leaves out what each person was already told about, emails each owner and
-- co-owner one digest, and records every item it included here. An item is reminded at most
-- once per due date and status: once when it comes up, once more if it becomes overdue. A new
-- due date (the item was renewed or done) starts again.

create type public.reminder_item_type as enum ('renewal', 'maintenance');
create type public.reminder_status as enum ('due_soon', 'overdue');

create table public.reminders_sent (
  id uuid primary key default gen_random_uuid(),
  boat_id uuid not null references public.boats (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  item_type public.reminder_item_type not null,
  -- The renewal or maintenance item. No foreign key: an item can be deleted after its reminder.
  item_id uuid not null,
  -- The due date and/or engine hours the reminder was about, as calc worked them out.
  due_on date,
  due_at_engine_hours numeric,
  status public.reminder_status not null,
  sent_at timestamptz not null default now(),
  check (due_on is not null or due_at_engine_hours is not null)
);

-- One reminder per person, item, due date and status. Nulls count as equal, so an item due
-- only by engine hours is still unique.
create unique index reminders_sent_once_idx
  on public.reminders_sent (person_id, item_type, item_id, due_on, due_at_engine_hours, status)
  nulls not distinct;

create index reminders_sent_boat_id_idx on public.reminders_sent (boat_id);

revoke all on public.reminders_sent from anon, authenticated, service_role;
-- People can see what they were sent; only the job writes. Hosted projects don't grant new
-- tables to service_role on their own.
grant select on public.reminders_sent to authenticated;
grant select, insert on public.reminders_sent to service_role;
grant select on public.boats, public.people, public.memberships, public.renewals,
  public.maintenance_items, public.documents to service_role;

alter table public.reminders_sent enable row level security;

create policy "reminders sent: see your own"
  on public.reminders_sent for select to authenticated
  using (person_id = public.current_person_id() and public.can_read_boat(boat_id));
