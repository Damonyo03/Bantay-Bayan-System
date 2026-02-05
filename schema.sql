
-- ==========================================
-- BANTAY BAYAN: FRESH START / RESET SCRIPT
-- ==========================================
-- WARNING: RUNNING THIS SCRIPT WILL DELETE ALL DATA AND USERS.
-- Use this in the Supabase SQL Editor to wipe the system and start fresh.

-- 1. DROP TRIGGERS & FUNCTIONS (System Level)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.log_audit_event() CASCADE;
DROP SEQUENCE IF EXISTS public.badge_seq;

-- 2. DROP PUBLIC TABLES & TYPES (Cascade)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS asset_requests CASCADE;
DROP TABLE IF EXISTS dispatch_logs CASCADE;
DROP TABLE IF EXISTS incident_parties CASCADE;
DROP TABLE IF EXISTS incidents CASCADE;
DROP TABLE IF EXISTS personnel_schedules CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

DROP TYPE IF EXISTS asset_status CASCADE;
DROP TYPE IF EXISTS dispatch_status CASCADE;
DROP TYPE IF EXISTS incident_status CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- 3. CLEAR AUTH USERS (Optional: Comment out if you want to keep existing Auth users)
-- DELETE FROM auth.users; 

-- ==========================================
-- SCHEMA DEFINITION
-- ==========================================

-- 4. Enable UUID extension
create extension if not exists "uuid-ossp";

-- 5. Define ENUM Types
create type user_role as enum ('supervisor', 'field_operator');
create type user_status as enum ('active', 'inactive', 'suspended');
create type incident_status as enum ('Pending', 'Dispatched', 'Resolved', 'Closed');
create type dispatch_status as enum ('En Route', 'On Scene', 'Clear', 'Returning');
create type asset_status as enum ('Pending', 'Approved', 'Released', 'Returned', 'Rejected');

-- 6. SEQUENCE FOR BADGE IDs
create sequence public.badge_seq start 1 increment 1;
GRANT USAGE, SELECT ON SEQUENCE public.badge_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.badge_seq TO service_role;

-- 7. Create Tables

-- PROFILES (Extends auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique, 
  email text unique not null,
  full_name text,
  role user_role default 'field_operator',
  status user_status default 'inactive', -- Strict default
  badge_number text unique,
  last_active_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- INCIDENTS
create table incidents (
  id uuid default uuid_generate_v4() primary key,
  case_number text unique not null,
  type text not null,
  narrative text not null,
  location text not null,
  status incident_status default 'Pending',
  officer_id uuid references profiles(id),
  is_restricted_entry boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- INCIDENT PARTIES
create table incident_parties (
  id uuid default uuid_generate_v4() primary key,
  incident_id uuid references incidents(id) on delete cascade,
  name text not null,
  age integer,
  role text not null,
  statement text,
  contact_info text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- DISPATCH LOGS
create table dispatch_logs (
  id uuid default uuid_generate_v4() primary key,
  incident_id uuid references incidents(id) on delete cascade,
  unit_name text not null,
  status dispatch_status default 'En Route',
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ASSET REQUESTS
create table asset_requests (
  id uuid default uuid_generate_v4() primary key,
  borrower_name text not null,
  contact_number text,
  address text not null,
  items_requested jsonb not null,
  purpose text not null,
  pickup_date date,
  return_date date,
  status asset_status default 'Pending',
  logged_by uuid references profiles(id),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- PERSONNEL SCHEDULES
create table personnel_schedules (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade,
  date date not null,
  shift text,
  status text default 'On Duty',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, date)
);

-- AUDIT LOGS
create table audit_logs (
  id uuid default uuid_generate_v4() primary key,
  table_name text not null,
  record_id uuid,
  operation text not null,
  old_data jsonb,
  new_data jsonb,
  performed_by uuid references profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Enable Row Level Security (RLS)
alter table profiles enable row level security;
alter table incidents enable row level security;
alter table incident_parties enable row level security;
alter table dispatch_logs enable row level security;
alter table audit_logs enable row level security;
alter table asset_requests enable row level security;
alter table personnel_schedules enable row level security;

-- 9. Define RLS Policies (Simplified for demonstration)
create policy "Public profiles" on profiles for select using ( true );
create policy "Supervisor update profiles" on profiles for update using (
    exists ( select 1 from profiles where id = auth.uid() and role = 'supervisor' )
);

create policy "Auth read incidents" on incidents for select using ( auth.role() = 'authenticated' );
create policy "Auth create incidents" on incidents for insert with check ( auth.role() = 'authenticated' );
create policy "Supervisor update incidents" on incidents for update using (
    exists ( select 1 from profiles where id = auth.uid() and role = 'supervisor' )
);

create policy "Auth read parties" on incident_parties for select using ( auth.role() = 'authenticated' );
create policy "Auth create parties" on incident_parties for insert with check ( auth.role() = 'authenticated' );

create policy "Auth read dispatch" on dispatch_logs for select using ( auth.role() = 'authenticated' );
create policy "Auth manage dispatch" on dispatch_logs for all using ( auth.role() = 'authenticated' );

create policy "Supervisor read audit" on audit_logs for select using (
    exists ( select 1 from profiles where id = auth.uid() and role = 'supervisor' )
);
create policy "System insert audit" on audit_logs for insert with check ( true );

create policy "Auth read assets" on asset_requests for select using ( auth.role() = 'authenticated' );
create policy "Auth create assets" on asset_requests for insert with check ( auth.role() = 'authenticated' );
create policy "Supervisor update assets" on asset_requests for update using (
    exists ( select 1 from profiles where id = auth.uid() and role = 'supervisor' )
);

create policy "Auth read schedules" on personnel_schedules for select using ( auth.role() = 'authenticated' );
create policy "Supervisor manage schedules" on personnel_schedules for all using (
    exists ( select 1 from profiles where id = auth.uid() and role = 'supervisor' )
);

-- 10. ROBUST USER CREATION TRIGGER
-- IMPORTANT: 'security definer' runs with owner privileges.
-- 'set search_path = public' ensures we use the correct schema for types/tables.
create or replace function public.handle_new_user() 
returns trigger as $$
declare
  new_badge text;
  safe_role user_role;
  safe_status user_status;
begin
  -- 1. Generate Badge ID
  -- Ensure sequence exists and is accessible
  select 'BB-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.badge_seq')::text, 4, '0') 
  into new_badge;

  -- 2. Safely cast metadata to ENUMs with fallbacks
  begin
    safe_role := (new.raw_user_meta_data->>'role')::user_role;
    if safe_role is null then safe_role := 'field_operator'; end if;
  exception when others then
    safe_role := 'field_operator';
  end;

  -- Force inactive by default unless explicitly 'active' (rare)
  begin
    safe_status := (new.raw_user_meta_data->>'status')::user_status;
    if safe_status is null then safe_status := 'inactive'; end if;
  exception when others then
    safe_status := 'inactive';
  end;

  -- 3. Insert Profile
  insert into public.profiles (
    id, email, username, full_name, role, status, badge_number
  )
  values (
    new.id, 
    new.email,
    new.raw_user_meta_data->>'username', 
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'), 
    safe_role, 
    safe_status,
    new_badge
  )
  on conflict (id) do nothing;
  
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 11. AUDIT TRIGGER
create or replace function public.log_audit_event()
returns trigger as $$
begin
  insert into public.audit_logs (table_name, record_id, operation, old_data, new_data, performed_by)
  values (
    TG_TABLE_NAME,
    coalesce(new.id, old.id),
    TG_OP,
    case when TG_OP = 'DELETE' or TG_OP = 'UPDATE' then row_to_json(old) else null end,
    case when TG_OP = 'INSERT' or TG_OP = 'UPDATE' then row_to_json(new) else null end,
    auth.uid()
  );
  return null;
end;
$$ language plpgsql security definer set search_path = public;

create trigger audit_incidents_trigger after insert or update or delete on incidents for each row execute procedure public.log_audit_event();
create trigger audit_dispatch_logs_trigger after insert or update or delete on dispatch_logs for each row execute procedure public.log_audit_event();
create trigger audit_profiles_trigger after update on profiles for each row execute procedure public.log_audit_event();
create trigger audit_assets_trigger after insert or update or delete on asset_requests for each row execute procedure public.log_audit_event();
create trigger audit_schedules_trigger after insert or update or delete on personnel_schedules for each row execute procedure public.log_audit_event();

-- 12. ENABLE REALTIME (Critical for Dashboard updates)
alter publication supabase_realtime add table incidents;
alter publication supabase_realtime add table dispatch_logs;
alter publication supabase_realtime add table asset_requests;
alter publication supabase_realtime add table personnel_schedules;
alter publication supabase_realtime add table profiles;

NOTIFY pgrst, 'reload schema';
