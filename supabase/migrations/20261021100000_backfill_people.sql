-- A person for every auth user who signed up before the people trigger existed (#62).
--
-- `create_person_after_auth_user_insert` gives each new Supabase Auth user a person. A user
-- created before that migration ran (on newton-dev, the sign-in email test for #61) has none,
-- so `current_person_id()` is null for them: their session is valid, but every page treats them
-- as signed out. This adds the missing people, the same way the trigger would have. It is safe
-- to run again, and does nothing where every user already has a person.

insert into public.people (auth_subject, email)
select users.id::text, users.email
from auth.users
where not exists (select 1 from public.people where people.auth_subject = users.id::text)
on conflict (auth_subject) do nothing;
