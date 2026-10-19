-- Add your first boat (#32): one call creates the boat and makes the signed-in person its owner.
--
-- Signed-in people can't insert into `boats` directly, and the "memberships: owners add" policy
-- only lets an existing owner add members. So a new boat would have no way to get its first
-- owner. This function does both inserts in one transaction, so a boat never exists without an
-- owner, and it only ever makes the caller the owner, never anyone else.

create function public.create_boat(boat_name text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := public.current_person_id();
  new_boat_id uuid;
begin
  if me is null then
    raise exception 'sign in to create a boat' using errcode = '42501';
  end if;

  -- The check constraint on boats.name rejects blank or overlong names.
  insert into public.boats (name) values (trim(boat_name))
  returning id into new_boat_id;

  insert into public.memberships (boat_id, person_id, role)
  values (new_boat_id, me, 'owner');

  return new_boat_id;
end;
$$;

revoke execute on function public.create_boat(text) from public, anon;
grant execute on function public.create_boat(text) to authenticated;
