-- A person's stored email follows their sign-in email (#117).
--
-- `create_person_for_auth_user()` copies the sign-in email into `people.email` when the person is
-- created. Until now nothing updated it, so after someone changed their sign-in email Newton kept
-- showing the old address, and email-in (`match_inbound_email()`, #10) kept filing mail from it
-- while mail from the new one was held. This keeps the two in step: email-in matches whatever
-- `people.email` holds, so it follows too. The old address stops matching unless the person
-- also has it as a verified sender address.
--
-- - A change waiting for confirmation isn't followed. Supabase Auth keeps the new address in
--   `auth.users.email_change` and only writes `email` once it is confirmed, so the trigger fires
--   then and not before.
-- - `people.email` isn't unique, and Supabase Auth already keeps sign-in emails unique, so a
--   change never fails here. If two people do end up with one address, matching picks one of
--   them, as it already does for a verified sender address that is also someone's sign-in email.
-- - The email is copied as Supabase Auth stores it, the same as at sign-up. Matching compares
--   lowercase either way.
--
-- This is auth provider glue, like `create_person_for_auth_user()`: changing provider means
-- rewriting it, not the policies.

create function public.update_person_email_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.people
  set email = new.email
  where auth_subject = new.id::text
    and email is distinct from new.email;
  return new;
end;
$$;

create trigger update_person_email_after_auth_user_update
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.update_person_email_for_auth_user();

revoke execute on function public.update_person_email_for_auth_user() from public, anon, authenticated;

-- People whose sign-in email already changed before this trigger existed get the current one.
-- Does nothing where every person's email already matches.
update public.people
set email = users.email
from auth.users
where people.auth_subject = users.id::text
  and people.email is distinct from users.email;
