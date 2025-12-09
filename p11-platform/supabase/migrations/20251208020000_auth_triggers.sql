-- ===========================================
-- Auth Triggers and Profile Management
-- ===========================================

-- RLS Policy for profiles table
create policy "profiles_own_read" on profiles
for select using (
  id = auth.uid() or auth.role() = 'service_role'
);

create policy "profiles_own_update" on profiles
for update using (
  id = auth.uid()
) with check (
  id = auth.uid()
);

create policy "profiles_service_write" on profiles
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

-- Allow users in the same org to see each other's basic profile
create policy "profiles_org_read" on profiles
for select using (
  exists (
    select 1 from profiles my_profile
    where my_profile.id = auth.uid()
    and my_profile.org_id = profiles.org_id
  )
);

-- Function to create a profile when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    'viewer'
  );
  return new;
end;
$$;

-- Trigger to call the function on user creation
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to update profile when user metadata changes
create or replace function public.handle_user_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles
  set full_name = coalesce(new.raw_user_meta_data->>'full_name', profiles.full_name)
  where id = new.id;
  return new;
end;
$$;

-- Trigger to update profile when user is updated
drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute procedure public.handle_user_update();

