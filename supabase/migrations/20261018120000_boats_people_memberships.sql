-- Boats, people and memberships: the tenant model every later table hangs off (#5).
--
-- The boat is the tenant. A person reaches a boat's rows only through a membership on that
-- boat, and row-level security (RLS) enforces it in the database, not in app code.
--
-- The auth provider is kept swappable (docs/decisions/0001-auth.md): `people.id` is Newton's
-- own ID, and the provider's user ID lives only in `people.auth_subject`. Only the two
-- functions in "Auth provider glue" below know about Supabase Auth.

-- Tables ------------------------------------------------------------------------------------

create table public.people (
  id uuid primary key default gen_random_uuid(),
  -- The auth provider's user ID. Nothing else refers to it.
  auth_subject text unique,
  email text,
  display_name text,
  created_at timestamptz not null default now()
);

create table public.boats (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 100),
  created_at timestamptz not null default now()
);

create type public.membership_role as enum ('owner', 'co_owner', 'crew', 'read_only');

create table public.memberships (
  boat_id uuid not null references public.boats (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  role public.membership_role not null,
  created_at timestamptz not null default now(),
  primary key (boat_id, person_id)
);

create index memberships_person_id_idx on public.memberships (person_id);

-- Auth provider glue ------------------------------------------------------------------------
-- Changing auth provider means rewriting these two functions, not the policies.

-- The signed-in person's Newton ID, or null. Every RLS policy goes through this.
create function public.current_person_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.people where auth_subject = (select auth.uid())::text
$$;

-- Every new Supabase Auth user gets a person.
create function public.create_person_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.people (auth_subject, email)
  values (new.id::text, new.email)
  on conflict (auth_subject) do nothing;
  return new;
end;
$$;

create trigger create_person_after_auth_user_insert
  after insert on auth.users
  for each row execute function public.create_person_for_auth_user();

-- Access helpers ----------------------------------------------------------------------------
-- Security definer so policies can read memberships without recursing into memberships' RLS.
-- Each one only answers about the signed-in person.

-- The signed-in person's role on a boat, or null if they are not a member.
create function public.my_role_on(boat uuid)
returns public.membership_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.memberships
  where boat_id = boat and person_id = public.current_person_id()
$$;

-- Any member can read a boat's rows.
create function public.can_read_boat(boat uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.my_role_on(boat) is not null
$$;

-- Owners, co-owners and crew can add and change a boat's records (documents, maintenance,
-- expenses). Read-only members cannot. Record tables use this in their write policies.
create function public.can_write_boat(boat uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(public.my_role_on(boat) in ('owner', 'co_owner', 'crew'), false)
$$;

-- True if the signed-in person shares at least one boat with this person.
create function public.shares_boat_with(person uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships mine
    join public.memberships theirs on theirs.boat_id = mine.boat_id
    where mine.person_id = public.current_person_id() and theirs.person_id = person
  )
$$;

-- Privileges --------------------------------------------------------------------------------
-- Supabase grants everything on public tables to `anon` and `authenticated` by default.
-- Signed-out visitors get nothing; signed-in people get only what the policies below need.

revoke all on public.people, public.boats, public.memberships from anon, authenticated;

-- `auth_subject` is not readable or writable through the API.
grant select (id, email, display_name, created_at) on public.people to authenticated;
grant update (display_name) on public.people to authenticated;

-- New boats are created by a function that also makes the creator owner (#32).
grant select, update, delete on public.boats to authenticated;
grant select, insert, update, delete on public.memberships to authenticated;

revoke execute on function public.create_person_for_auth_user() from public, anon, authenticated;

-- Row-level security ------------------------------------------------------------------------

alter table public.people enable row level security;
alter table public.boats enable row level security;
alter table public.memberships enable row level security;

-- People: yourself, and the people you share a boat with.
create policy "people: see yourself and your boats' members"
  on public.people for select to authenticated
  using (id = public.current_person_id() or public.shares_boat_with(id));

create policy "people: edit yourself"
  on public.people for update to authenticated
  using (id = public.current_person_id())
  with check (id = public.current_person_id());

-- Boats: members see them; owners and co-owners edit them; only owners delete them.
create policy "boats: members see"
  on public.boats for select to authenticated
  using (public.can_read_boat(id));

create policy "boats: owners and co-owners edit"
  on public.boats for update to authenticated
  using (public.my_role_on(id) in ('owner', 'co_owner'))
  with check (public.my_role_on(id) in ('owner', 'co_owner'));

create policy "boats: owners delete"
  on public.boats for delete to authenticated
  using (public.my_role_on(id) = 'owner');

-- Memberships: members see who is on the boat; only owners add, change or remove members.
create policy "memberships: members see"
  on public.memberships for select to authenticated
  using (public.can_read_boat(boat_id));

create policy "memberships: owners add"
  on public.memberships for insert to authenticated
  with check (public.my_role_on(boat_id) = 'owner');

create policy "memberships: owners change"
  on public.memberships for update to authenticated
  using (public.my_role_on(boat_id) = 'owner')
  with check (public.my_role_on(boat_id) = 'owner');

create policy "memberships: owners remove"
  on public.memberships for delete to authenticated
  using (public.my_role_on(boat_id) = 'owner');
