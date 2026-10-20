-- Deleting a boat (#115): its rows and every file in its Storage folder, by its owners only.
--
-- SQL can't delete Storage objects (Storage refuses direct deletes from `storage.objects`; files
-- go through the Storage API so the stored bytes go too). So deleting a boat takes three steps,
-- run by the web app's server as the signed-in owner (apps/web/src/lib/db/boat-delete.ts):
--
--   1. `begin_boat_deletion(boat)` marks the boat as being deleted and lists its files.
--   2. The server removes those files with the Storage API, under the bucket's delete policy.
--   3. `delete_boat(boat)` checks the folder is empty, deletes the boat (every boat-scoped table
--      cascades from `boats`) and returns how many rows of each kind went with it.
--
-- Why mark first, and files before rows: if step 2 stops halfway, some document rows point at
-- files that are gone. The mark makes that state visible and harmless: the boat page shows "being
-- deleted" instead of a documents list with broken links, and nobody can add records or files to
-- the boat any more. Every step can be run again, so trying again finishes the job. Rows are only
-- deleted once no file is left, so a failure never leaves files that no row points at, which
-- nobody could find or delete from the app.

alter table public.boats add column deleting_since timestamptz;

comment on column public.boats.deleting_since is
  'Set when an owner starts deleting the boat (#115). The boat accepts no new records or files.';

-- Nothing can be added to a boat being deleted. Every write policy on the record tables and the
-- documents bucket goes through this function, so this covers them all. Members still read, so a
-- half-deleted boat still shows its name and its "being deleted" state.
create or replace function public.can_write_boat(boat uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(public.my_role_on(boat) in ('owner', 'co_owner', 'crew'), false)
    and not exists (select 1 from public.boats where id = boat and deleting_since is not null)
$$;

-- Owner check shared by both steps. Raises rather than returning false, so a caller can't miss it.
create function public.assert_boat_owner(boat uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if public.current_person_id() is null or public.my_role_on(boat) is distinct from 'owner' then
    raise exception 'only the boat''s owners can delete it' using errcode = '42501';
  end if;
end;
$$;

-- Step 1. Marks the boat (keeping the first mark on a retry) and returns every file in its folder,
-- whether or not a documents row points at it.
create function public.begin_boat_deletion(boat uuid)
returns setof text
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform public.assert_boat_owner(boat);

  update public.boats set deleting_since = coalesce(deleting_since, now()) where id = boat;

  return query
    select o.name from storage.objects o
    where o.bucket_id = 'documents' and o.name like boat::text || '/%'
    order by o.name;
end;
$$;

-- Step 3. Refuses while any file is left (one may have arrived from email-in after step 1: run
-- the steps again). Counts are taken just before the delete, inside the same transaction.
create function public.delete_boat(boat uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  removed jsonb;
begin
  perform public.assert_boat_owner(boat);

  if not exists (select 1 from public.boats where id = boat and deleting_since is not null) then
    raise exception 'start deleting the boat first' using errcode = '55000';
  end if;

  if exists (
    select 1 from storage.objects o
    where o.bucket_id = 'documents' and o.name like boat::text || '/%'
  ) then
    raise exception 'the boat still has files in storage' using errcode = '55000';
  end if;

  select jsonb_build_object(
    'documents', (select count(*) from public.documents where boat_id = boat),
    'document_chunks', (select count(*) from public.document_chunks where boat_id = boat),
    'renewals', (select count(*) from public.renewals where boat_id = boat),
    'maintenance_items', (select count(*) from public.maintenance_items where boat_id = boat),
    'expenses', (select count(*) from public.expenses where boat_id = boat),
    'inbound_emails', (select count(*) from public.inbound_emails where boat_id = boat),
    'reminders_sent', (select count(*) from public.reminders_sent where boat_id = boat),
    'memberships', (select count(*) from public.memberships where boat_id = boat)
  ) into removed;

  delete from public.boats where id = boat;

  return removed;
end;
$$;

-- Privileges --------------------------------------------------------------------------------

-- `delete_boat` is the only way to delete a boat: a plain delete would leave its files behind.
-- The "boats: owners delete" policy stays, as a second check should the grant come back.
revoke delete on public.boats from authenticated;

revoke execute on function public.assert_boat_owner(uuid) from public, anon, authenticated;
revoke execute on function public.begin_boat_deletion(uuid) from public, anon;
revoke execute on function public.delete_boat(uuid) from public, anon;
grant execute on function public.begin_boat_deletion(uuid) to authenticated;
grant execute on function public.delete_boat(uuid) to authenticated;
