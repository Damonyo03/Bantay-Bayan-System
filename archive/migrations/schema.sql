
-- ==========================================
-- BANTAY BAYAN: RLS FIXES & TRIGGERS
-- Run this in Supabase SQL Editor
-- ==========================================

-- 1. PROFILES TABLE POLICIES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS preferred_shift text DEFAULT '1st',
ADD COLUMN IF NOT EXISTS preferred_day_off text DEFAULT 'Sunday';

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Update own profile or Supervisor update" ON profiles;
DROP POLICY IF EXISTS "Supervisors can update any profile" ON profiles;

-- Read Policy
CREATE POLICY "Public profiles are viewable by everyone" 
ON profiles FOR SELECT 
USING ( true );

-- Update Policies
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING ( auth.uid() = id )
WITH CHECK ( auth.uid() = id );

CREATE POLICY "Supervisors can update any profile" 
ON profiles FOR UPDATE 
USING ( 
  exists (select 1 from profiles where id = auth.uid() and role = 'supervisor')
);

-- 2. STORAGE POLICIES
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Avatar Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Avatar User Manage" ON storage.objects;
DROP POLICY IF EXISTS "Avatar Auth Upload" ON storage.objects;
DROP POLICY IF EXISTS "Avatar Auth Update" ON storage.objects;

CREATE POLICY "Avatar Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

CREATE POLICY "Avatar User Manage"
ON storage.objects FOR ALL
USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. USER CREATION TRIGGER (CRITICAL FIX)
-- Automatically create a profile when a new user signs up via auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, status, username, badge_number)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    coalesce(new.raw_user_meta_data ->> 'role', 'field_operator'),
    coalesce(new.raw_user_meta_data ->> 'status', 'inactive'),
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'badge_number'
  );
  return new;
end;
$$;

-- Bind the trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 4. SYSTEM RESET FUNCTION (DATA ARCHIVING)
-- Allows Supervisors to wipe transactional data but keep users
CREATE OR REPLACE FUNCTION admin_reset_system_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  -- Verify Supervisor Role
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  
  IF v_role IS DISTINCT FROM 'supervisor' THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized: Admin privileges required.');
  END IF;

  -- Delete Transactional Data (Order matters for Foreign Keys)
  -- Added WHERE id IS NOT NULL to satisfy sql_safe_updates
  DELETE FROM dispatch_logs WHERE id IS NOT NULL;
  DELETE FROM incident_parties WHERE id IS NOT NULL;
  DELETE FROM incidents WHERE id IS NOT NULL;
  DELETE FROM asset_requests WHERE id IS NOT NULL;
  DELETE FROM cctv_requests WHERE id IS NOT NULL;
  
  -- We deliberately DO NOT delete:
  -- 1. profiles (Users need to log in)
  -- 2. audit_logs (We need a record of who wiped the system)
  -- 3. personnel_schedules (Schedules are usually recurrent)

  -- Log this action specifically in audit_logs
  -- Uses Nil UUID to avoid syntax error
  INSERT INTO audit_logs (table_name, record_id, operation, performed_by, new_data)
  VALUES ('SYSTEM', '00000000-0000-0000-0000-000000000000', 'DELETE', auth.uid(), '{"action": "Full System Data Wipe"}');

  RETURN json_build_object('success', true, 'message', 'System data cleared successfully.');
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_reset_system_data() TO authenticated;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
