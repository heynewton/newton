-- Owners and co-owners invite people to a boat by email.
--
-- Until now only owners could add members (the "memberships: owners add" policy), and only by
-- someone's person ID, so a boat's other co-owners had no way in. `invite_to_boat()` lets owners
-- and co-owners invite by email, as co-owner, crew or read-only. Making someone an owner is still
-- owners only, through the memberships policies. The policies themselves don't change: invitations
-- go only through this function, which checks the caller's role.
--
-- - If the email already belongs to a person, they are added to the boat at once.
-- - Otherwise the invitation waits in `invitations`. When a person with that email appears (first
--   sign-in) or a person's email changes to it (#117), the trigger below turns it into a
--   membership.
--
-- Matching by email is safe because a person's email is their sign-in email: only whoever can
-- sign in with that address can use the membership. Supabase Auth may create the person before a
-- magic link is confirmed, so the membership can exist before its holder has signed in. It gives
-- nobody access until they do.
--
-- A new co-owner's ownership share is 0, the default, until an owner sets it.

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  boat_id uuid not null references public.boats (id) on delete cascade,
  -- Stored trimmed and lowercase, so one address has one invitation per boat.
  email text not null check (email = lower(trim(email)) and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  role public.membership_role not null check (role <> 'owner'),
  invited_by uuid references public.people (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (boat_id, email)
);

create index invitations_email_idx on public.invitations (email);

-- Invites someone to a boat by email. Returns what happened: 'added' (they already have a
-- person, now on the boat), 'already_on_boat' (nothing to do) or 'invited' (waiting for them to
-- sign in; inviting the same address again changes the role and keeps one invitation).
create function public.invite_to_boat(boat uuid, invitee_email text, invitee_role public.membership_role)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := public.current_person_id();
  address text := lower(trim(invitee_email));
  invitee uuid;
begin
  if me is null or not coalesce(public.my_role_on(boat) in ('owner', 'co_owner'), false) then
    raise exception 'only the boat''s owners and co-owners can invite people' using errcode = '42501';
  end if;
  if exists (select 1 from public.boats where id = boat and deleting_since is not null) then
    raise exception 'the boat is being deleted' using errcode = '55000';
  end if;
  if invitee_role is null or invitee_role = 'owner' then
    raise exception 'invite as co-owner, crew or read-only' using errcode = '22023';
  end if;
  if address is null or address !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'not an email address' using errcode = '22023';
  end if;

  -- people.email isn't unique (see 20261022130000_people_email_sync.sql); take the first.
  select id into invitee from public.people where lower(email) = address order by created_at, id limit 1;

  if invitee is not null then
    if exists (select 1 from public.memberships where boat_id = boat and person_id = invitee) then
      return 'already_on_boat';
    end if;
    insert into public.memberships (boat_id, person_id, role) values (boat, invitee, invitee_role);
    return 'added';
  end if;

  -- At most 20 invitations wait on one boat, so the form can't be used to send mail in bulk.
  if not exists (select 1 from public.invitations where boat_id = boat and email = address)
    and (select count(*) from public.invitations where boat_id = boat) >= 20 then
    raise exception 'too many invitations waiting on this boat' using errcode = '54000';
  end if;

  insert into public.invitations (boat_id, email, role, invited_by)
  values (boat, address, invitee_role, me)
  on conflict (boat_id, email) do update
    set role = excluded.role, invited_by = excluded.invited_by, created_at = now();
  return 'invited';
end;
$$;

-- A person's waiting invitations become memberships when their email first matches one.
create function public.accept_invitations_for_person()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null then
    return new;
  end if;
  insert into public.memberships (boat_id, person_id, role)
  select boat_id, new.id, role from public.invitations where email = lower(trim(new.email))
  on conflict (boat_id, person_id) do nothing;
  delete from public.invitations where email = lower(trim(new.email));
  return new;
end;
$$;

create trigger accept_invitations_after_person_insert
  after insert on public.people
  for each row execute function public.accept_invitations_for_person();

create trigger accept_invitations_after_person_email_update
  after update of email on public.people
  for each row
  when (old.email is distinct from new.email)
  execute function public.accept_invitations_for_person();

-- Privileges --------------------------------------------------------------------------------
-- Invitations are added only through invite_to_boat(). Owners and co-owners see and cancel them.

revoke all on public.invitations from anon, authenticated;
grant select, delete on public.invitations to authenticated;

revoke execute on function public.invite_to_boat(uuid, text, public.membership_role) from public, anon;
grant execute on function public.invite_to_boat(uuid, text, public.membership_role) to authenticated;
revoke execute on function public.accept_invitations_for_person() from public, anon, authenticated;

alter table public.invitations enable row level security;

create policy "invitations: owners and co-owners see"
  on public.invitations for select to authenticated
  using (public.my_role_on(boat_id) in ('owner', 'co_owner'));

create policy "invitations: owners and co-owners cancel"
  on public.invitations for delete to authenticated
  using (public.my_role_on(boat_id) in ('owner', 'co_owner'));
