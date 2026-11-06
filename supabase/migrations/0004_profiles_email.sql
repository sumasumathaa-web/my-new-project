-- 0004_profiles_email.sql — store email on profile for admin customer views
alter table public.profiles add column if not exists email text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email)
  on conflict (id) do update set email = excluded.email;
  insert into public.user_roles (user_id, role) values (new.id, 'customer')
  on conflict do nothing;
  return new;
end $$;

-- Backfill existing profiles
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;

create index if not exists idx_profiles_email on public.profiles(email);
