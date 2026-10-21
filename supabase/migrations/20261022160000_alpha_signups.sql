-- Alpha test sign-ups from /get-started: people who want to try Newton on their boat leave an
-- email address and, if they like, a line about the boat. Maintainers read the list in Supabase
-- and invite people from it.
--
-- Nobody can read or write the table through the API. The only way in is register_for_alpha,
-- which anyone can call, signed in or not. It never says whether an address was already on the
-- list, so the form can't be used to find out who signed up.

create table public.alpha_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null
    check (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' and char_length(email) <= 320),
  about_boat text check (char_length(about_boat) <= 500),
  created_at timestamptz not null default now()
);

create unique index alpha_signups_email_key on public.alpha_signups (lower(email));

alter table public.alpha_signups enable row level security;
revoke all on public.alpha_signups from anon, authenticated;

create function public.register_for_alpha(email_address text, boat_note text default null)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  -- A second sign-up with the same address keeps the first one.
  insert into public.alpha_signups (email, about_boat)
  values (trim(email_address), nullif(trim(boat_note), ''))
  on conflict (lower(email)) do nothing;
end;
$$;

revoke execute on function public.register_for_alpha(text, text) from public;
grant execute on function public.register_for_alpha(text, text) to anon, authenticated;
