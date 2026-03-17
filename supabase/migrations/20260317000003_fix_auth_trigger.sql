-- ============================================================
-- Fix: "Database error saving new user"
--
-- Root cause: GoTrue uses the `supabase_auth_admin` role to
-- insert into auth.users. When the after-insert trigger fires,
-- it runs handle_new_user() which needs INSERT access on
-- public.profiles. Without explicit grants, the trigger fails.
-- ============================================================

-- 1. Recreate the trigger function with an explicit search_path
--    (prevents search_path hijacking and ensures public.profiles is found)
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- 2. Grant supabase_auth_admin the rights it needs to fire the trigger
grant usage on schema public to supabase_auth_admin;
grant all on table public.profiles to supabase_auth_admin;
