-- Email-in (#10): every boat gets its own address, and mail sent to it is stored as documents
-- of that boat when it comes from one of the boat's members, or held when it doesn't.
--
-- Resend receives every address on the inbound domain and posts each message to the web app
-- (docs/decisions/0003-email-provider.md). The webhook runs as the server (service role), not as
-- a person: it calls `match_inbound_email()` to find the boat and the sender, then records the
-- message in `inbound_emails` and, for filed mail, stores the original message and its
-- attachments in the boat's document folder.
--
-- Held mail keeps only who sent it, the subject and the attachment count. Its content stays at
-- Resend (kept 30 days), so nothing from an unknown sender reaches the boat's files.

-- The boat's address ---------------------------------------------------------------------------

-- The part before the @: `<boat name>-<6 random characters>`, for example `kittiwake-x7k2qd`.
-- The random part makes the address hard to guess, so strangers can't fill the held list.
-- Letters and digits that can't be confused when read aloud or typed (no 0/o, 1/l/i).
create function public.new_email_alias(boat_name text)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'abcdefghjkmnpqrstuvwxyz23456789';
  slug text := trim(both '-' from left(regexp_replace(
    translate(lower(coalesce(boat_name, '')), 'àáâãäåæçèéêëìíîïñòóôõöøùúûüýÿ', 'aaaaaaaceeeeiiiinoooooouuuuyy'),
    '[^a-z0-9]+', '-', 'g'), 30));
  suffix text := '';
begin
  if length(slug) < 2 then
    slug := 'boat';
  end if;
  for i in 1..6 loop
    suffix := suffix || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return trim(both '-' from slug) || '-' || suffix;
end;
$$;

alter table public.boats
  add column email_alias text unique
    check (email_alias ~ '^[a-z0-9]([a-z0-9-]{0,62}[a-z0-9])?$');

update public.boats set email_alias = public.new_email_alias(name) where email_alias is null;

-- New boats get an alias unless one is given (the sample boat's seed gives `kittiwake`).
create function public.set_email_alias()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.email_alias is null then
    loop
      new.email_alias := public.new_email_alias(new.name);
      exit when not exists (select 1 from public.boats where email_alias = new.email_alias);
    end loop;
  end if;
  return new;
end;
$$;

create trigger set_email_alias_before_insert
  before insert on public.boats
  for each row execute function public.set_email_alias();

alter table public.boats alter column email_alias set not null;

-- The address isn't edited through the API: a guessable one would undo the random part. Owners
-- and co-owners keep editing the name.
revoke update on public.boats from authenticated;
grant update (name) on public.boats to authenticated;

-- Sender addresses -------------------------------------------------------------------------------

-- Addresses a person sends mail from, besides the one they sign in with. An Apple sign-in can be
-- a relay address while the person forwards from their real inbox (#27). Only verified
-- addresses count for email-in; #27 adds confirming one by an emailed link.
create table public.sender_addresses (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  -- Stored lowercase, so matching is a plain comparison.
  address text not null unique check (address = lower(address) and address ~ '^[^\s@]+@[^\s@]+$'),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create index sender_addresses_person_id_idx on public.sender_addresses (person_id);

revoke all on public.sender_addresses from anon, authenticated, service_role;
grant select on public.sender_addresses to authenticated;
grant select on public.sender_addresses to service_role;

alter table public.sender_addresses enable row level security;

create policy "sender addresses: see your own"
  on public.sender_addresses for select to authenticated
  using (person_id = public.current_person_id());

-- Inbound emails -------------------------------------------------------------------------------

create type public.inbound_email_status as enum ('filed', 'held');

create table public.inbound_emails (
  id uuid primary key default gen_random_uuid(),
  boat_id uuid not null references public.boats (id) on delete cascade,
  -- The provider's ID for the message. Resend retries a webhook that fails, so the same message
  -- can arrive twice; the unique key makes the second one a no-op.
  provider text not null default 'resend' check (provider in ('resend')),
  provider_email_id text not null check (length(provider_email_id) between 1 and 200),
  message_id text,
  -- The envelope sender as the provider reports it, lowercase.
  from_address text not null check (from_address = lower(from_address)),
  from_name text,
  subject text,
  received_at timestamptz not null,
  status public.inbound_email_status not null,
  -- The member it came from. Null when held, or if the person is deleted later.
  sender_person_id uuid references public.people (id) on delete set null,
  attachment_count integer not null default 0 check (attachment_count >= 0),
  -- When handling finished. A filed email gets it once every file is stored; until then a retry
  -- of the webhook picks up where the last attempt stopped.
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, provider_email_id)
);

create index inbound_emails_boat_id_received_at_idx on public.inbound_emails (boat_id, received_at desc);

-- Each stored file of a filed email (the original message and its attachments) points at it.
alter table public.documents
  add column inbound_email_id uuid references public.inbound_emails (id) on delete set null;

create index documents_inbound_email_id_idx on public.documents (inbound_email_id);

revoke all on public.inbound_emails from anon, authenticated, service_role;
grant select on public.inbound_emails to authenticated;
-- The webhook writes; nobody else does. Hosted projects don't grant new tables to service_role.
grant select, insert, update on public.inbound_emails to service_role;
grant select, insert on public.documents to service_role;
grant select on public.boats, public.people, public.memberships to service_role;

alter table public.inbound_emails enable row level security;

-- Members see filed mail. Held mail, from people who aren't on the boat, is for owners and
-- co-owners to look at, since only they can add the sender to the boat.
create policy "inbound emails: members see filed, owners and co-owners see held"
  on public.inbound_emails for select to authenticated
  using (
    case status
      when 'filed' then public.can_read_boat(boat_id)
      else coalesce(public.my_role_on(boat_id) in ('owner', 'co_owner'), false)
    end
  );

-- Matching -------------------------------------------------------------------------------------

-- The boat an inbound message is for, and the member who sent it. `alias` is the part before
-- the @ of the address it was sent to; `sender` is the From address. No row if the alias isn't
-- a boat's. `person_id` is null when the sender isn't a member of that boat, or not with an
-- address they signed in with or verified. Only the webhook (service role) calls it.
create function public.match_inbound_email(alias text, sender text)
returns table (boat_id uuid, person_id uuid)
language sql
stable
set search_path = ''
as $$
  select b.id, (
    select m.person_id
    from public.memberships m
    join public.people p on p.id = m.person_id
    where m.boat_id = b.id
      and (
        lower(p.email) = lower(trim(sender))
        or exists (
          select 1 from public.sender_addresses s
          where s.person_id = p.id and s.address = lower(trim(sender)) and s.verified_at is not null
        )
      )
    order by m.person_id
    limit 1
  )
  from public.boats b
  where b.email_alias = lower(trim(alias))
$$;

revoke execute on function public.match_inbound_email(text, text) from public, anon, authenticated;
grant execute on function public.match_inbound_email(text, text) to service_role;
revoke execute on function public.new_email_alias(text) from public, anon, authenticated;
revoke execute on function public.set_email_alias() from public, anon, authenticated;
