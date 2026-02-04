
-- ==========================================
-- BANTAY BAYAN: FRESH START / RESET SCRIPT
-- ==========================================
-- WARNING: RUNNING THIS SCRIPT WILL DELETE ALL DATA AND USERS.
-- Use this in the Supabase SQL Editor to wipe the system and start fresh.

-- 1. DROP TRIGGERS & FUNCTIONS (System Level)
-- Use CASCADE to ensure dependent triggers on tables are removed automatically.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.log_audit_event() CASCADE;

-- 2. DROP PUBLIC TABLES & TYPES (Cascade to remove data and dependencies)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS asset_requests CASCADE;
DROP TABLE IF EXISTS dispatch_logs CASCADE;
DROP TABLE IF EXISTS incident_parties CASCADE;
DROP TABLE IF EXISTS incidents CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

DROP TYPE IF EXISTS asset_status CASCADE;
DROP TYPE IF EXISTS dispatch_status CASCADE;
DROP TYPE IF EXISTS incident_status CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- 3. CLEAR AUTH USERS
-- This wipes the login accounts.
DELETE FROM auth.users;

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

-- 6. Create Tables

-- PROFILES (Extends auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  role user_role default 'field_operator',
  status user_status default 'active',
  badge_number text,
  last_active_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- INCIDENTS (Official Blotter)
create table incidents (
  id uuid default uuid_generate_v4() primary key,
  case_number text unique not null,
  type text not null,
  narrative text not null,
  location text not null,
  status incident_status default 'Pending',
  officer_id uuid references profiles(id),
  is_restricted_entry boolean default false, -- Persona Non Grata flag
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- INCIDENT PARTIES (Involved Persons)
create table incident_parties (
  id uuid default uuid_generate_v4() primary key,
  incident_id uuid references incidents(id) on delete cascade,
  name text not null,
  age integer,
  role text not null, -- 'Complainant', 'Respondent', 'Witness', 'Victim'
  statement text,
  contact_info text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- DISPATCH LOGS (Response Units)
create table dispatch_logs (
  id uuid default uuid_generate_v4() primary key,
  incident_id uuid references incidents(id) on delete cascade,
  unit_name text not null,
  status dispatch_status default 'En Route',
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ASSET REQUESTS (Resource Tracking)
create table asset_requests (
  id uuid default uuid_generate_v4() primary key,
  borrower_name text not null,
  contact_number text,
  address text not null,
  items_requested jsonb not null, -- Array of { item: string, quantity: number }
  purpose text not null,
  pickup_date date,
  return_date date,
  status asset_status default 'Pending',
  logged_by uuid references profiles(id),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- AUDIT LOGS
create table audit_logs (
  id uuid default uuid_generate_v4() primary key,
  table_name text not null,
  record_id uuid,
  operation text not null, -- INSERT, UPDATE, DELETE
  old_data jsonb,
  new_data jsonb,
  performed_by uuid references profiles(id), -- Captured via auth.uid()
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Enable Row Level Security (RLS)
alter table profiles enable row level security;
alter table incidents enable row level security;
alter table incident_parties enable row level security;
alter table dispatch_logs enable row level security;
alter table audit_logs enable row level security;
alter table asset_requests enable row level security;

-- 8. Define RLS Policies

-- PROFILES
create policy "Profiles are viewable by everyone" on profiles for select using ( true );
create policy "Supervisors can update profiles" on profiles for update using (
    exists ( select 1 from profiles where id = auth.uid() and role = 'supervisor' )
);

-- INCIDENTS
create policy "Authenticated users can view incidents" on incidents for select using ( auth.role() = 'authenticated' );
create policy "Authenticated users can create incidents" on incidents for insert with check ( auth.role() = 'authenticated' );
create policy "Supervisors can update incidents" on incidents for update using (
    exists ( select 1 from profiles where id = auth.uid() and role = 'supervisor' )
);
create policy "Supervisors can delete incidents" on incidents for delete using (
    exists ( select 1 from profiles where id = auth.uid() and role = 'supervisor' )
);

-- INCIDENT PARTIES
create policy "Authenticated users can view parties" on incident_parties for select using ( auth.role() = 'authenticated' );
create policy "Authenticated users can insert parties" on incident_parties for insert with check ( auth.role() = 'authenticated' );

-- DISPATCH LOGS
create policy "Authenticated users can view dispatch logs" on dispatch_logs for select using ( auth.role() = 'authenticated' );
create policy "Authenticated users can insert dispatch logs" on dispatch_logs for insert with check ( auth.role() = 'authenticated' );
create policy "Authenticated users can update dispatch logs" on dispatch_logs for update using ( auth.role() = 'authenticated' );

-- AUDIT LOGS
create policy "Supervisors can view audit logs" on audit_logs for select using (
    exists ( select 1 from profiles where id = auth.uid() and role = 'supervisor' )
);
create policy "System can insert audit logs" on audit_logs for insert with check ( true );

-- ASSET REQUESTS
create policy "Authenticated users can view assets" on asset_requests for select using ( auth.role() = 'authenticated' );
create policy "Authenticated users can create assets" on asset_requests for insert with check ( auth.role() = 'authenticated' );
create policy "Supervisors can update assets" on asset_requests for update using (
    exists ( select 1 from profiles where id = auth.uid() and role = 'supervisor' )
);

-- 9. Auto-Profile Creation Trigger

create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id, 
    new.email, 
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'), 
    'field_operator' -- Default role. Change manually to 'supervisor' in DB for the first admin.
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 10. Audit Logging Trigger Logic

create or replace function public.log_audit_event()
returns trigger as $$
begin
  insert into public.audit_logs (
    table_name,
    record_id,
    operation,
    old_data,
    new_data,
    performed_by
  )
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
$$ language plpgsql security definer;

-- Apply Audit Triggers
create trigger audit_incidents_trigger
  after insert or update or delete on incidents
  for each row execute procedure public.log_audit_event();

create trigger audit_dispatch_logs_trigger
  after insert or update or delete on dispatch_logs
  for each row execute procedure public.log_audit_event();

create trigger audit_profiles_trigger
  after update on profiles
  for each row execute procedure public.log_audit_event();

create trigger audit_assets_trigger
  after insert or update or delete on asset_requests
  for each row execute procedure public.log_audit_event();

-- 11. Enable Realtime
alter publication supabase_realtime add table incidents;
alter publication supabase_realtime add table dispatch_logs;
alter publication supabase_realtime add table asset_requests;

NOTIFY pgrst, 'reload schema';
