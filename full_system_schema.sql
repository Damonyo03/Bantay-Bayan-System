
-- ==============================================================================
-- BANTAY BAYAN: COMPLETE SYSTEM DATABASE SCHEMA
-- This script defines all tables, relationships, functions, and RLS security policies.
-- Execute this in the Supabase SQL Editor.
-- ==============================================================================

-- 1. ENUMS & EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Define the custom status enum used by the system
DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('active', 'inactive', 'pending', 'rejected', 'deactivated');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. USER PROFILES TABLE
-- Stores personnel data and roles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email text UNIQUE NOT NULL,
  username text UNIQUE,
  full_name text NOT NULL,
  role text DEFAULT 'guest' CHECK (role IN ('developer', 'barangay_captain', 'barangay_secretary', 'barangay_kagawad', 'supervisor', 'bantay_bayan', 'resident', 'guest')),
   status user_status DEFAULT 'pending',
  badge_number text UNIQUE,
  avatar_url text,
  preferred_shift text DEFAULT '1st',
  preferred_day_off text DEFAULT 'Sunday',
  last_active_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 3. INCIDENTS TABLE (THE BLOTTER)
-- Core record-keeping for all barangay events
CREATE TABLE IF NOT EXISTS public.incidents (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  case_number text UNIQUE NOT NULL,
  type text NOT NULL CHECK (type IN ('Medical', 'Fire', 'Theft', 'Disturbance', 'Traffic', 'Logistics', 'Other')),
  narrative text NOT NULL,
  location text NOT NULL,
  status text DEFAULT 'Pending' CHECK (status IN ('Pending', 'Dispatched', 'Resolved', 'Closed')),
  officer_id uuid REFERENCES public.profiles(id) ON UPDATE CASCADE,
  is_restricted_entry boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 4. INCIDENT PARTIES TABLE
-- Specific individuals involved in a blotter entry
CREATE TABLE IF NOT EXISTS public.incident_parties (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  incident_id uuid REFERENCES public.incidents(id) ON DELETE CASCADE,
  name text NOT NULL,
  age integer,
  role text NOT NULL CHECK (role IN ('Complainant', 'Respondent', 'Witness', 'Victim', 'Suspect')),
  statement text,
  contact_info text,
  created_at timestamptz DEFAULT now()
);

-- 5. DISPATCH LOGS
-- Track vehicle/personnel movement for active incidents
CREATE TABLE IF NOT EXISTS public.dispatch_logs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  incident_id uuid REFERENCES public.incidents(id) ON DELETE CASCADE,
  unit_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('En Route', 'On Scene', 'Clear', 'Returning')),
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 6. ASSET REQUESTS
-- Logistics and borrowing management
CREATE TABLE IF NOT EXISTS public.asset_requests (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  borrower_name text NOT NULL,
  contact_number text,
  address text,
  items_requested jsonb NOT NULL, -- Array of {item: string, quantity: number}
  purpose text,
  pickup_date date,
  return_date date,
  status text DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Released', 'Returned', 'Rejected')),
  logged_by uuid REFERENCES public.profiles(id) ON UPDATE CASCADE,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 7. CCTV REQUESTS
CREATE TABLE IF NOT EXISTS public.cctv_requests (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  request_number text UNIQUE NOT NULL,
  requester_name text NOT NULL,
  contact_info text,
  incident_type text,
  incident_date date,
  incident_time time,
  location text,
  purpose text,
  created_at timestamptz DEFAULT now()
);

-- 8. PUBLIC REPORTS (CITIZEN LOGS)
-- Staging area for community reports before formal acknowledgment
CREATE TABLE IF NOT EXISTS public.public_reports (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  reference_number text UNIQUE NOT NULL,
  type text NOT NULL CHECK (type IN ('Medical', 'Fire', 'Theft', 'Disturbance', 'Traffic', 'Logistics', 'Other')),
  narrative text NOT NULL,
  location text NOT NULL,
  status text DEFAULT 'Pending Review' CHECK (status IN ('Pending Review', 'Acknowledged', 'Converted to Incident', 'Rejected')),
  submitted_by uuid REFERENCES public.profiles(id) ON UPDATE CASCADE,
  converted_incident_id uuid REFERENCES public.incidents(id),
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 9. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  operation text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  performed_by uuid REFERENCES public.profiles(id) ON UPDATE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- 10. DEBUG LOGS (Capture Trigger Failures)
CREATE TABLE IF NOT EXISTS public.debug_logs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_type text,
  error_message text,
  data jsonb,
  created_at timestamptz DEFAULT now()
);

-- ==============================================================================
-- RLS SECURITY POLICIES (THE PERMISSION HIERARCHY)
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cctv_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES POLICIES
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Supervisors can update any profile" ON public.profiles;
CREATE POLICY "Supervisors can update any profile" ON public.profiles FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('developer', 'barangay_captain', 'barangay_secretary', 'barangay_kagawad', 'supervisor')));

-- 2. INCIDENTS POLICIES
DROP POLICY IF EXISTS "Personnel can view all records" ON public.incidents;
CREATE POLICY "Personnel can view all records" ON public.incidents FOR SELECT USING (true);

DROP POLICY IF EXISTS "Personnel can create incidents" ON public.incidents;
CREATE POLICY "Personnel can create incidents" ON public.incidents FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Only Supervisors can update incidents" ON public.incidents;
CREATE POLICY "Only Supervisors can update incidents" ON public.incidents FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('developer', 'barangay_captain', 'barangay_secretary', 'barangay_kagawad', 'supervisor')));

DROP POLICY IF EXISTS "Only Supervisors can delete incidents" ON public.incidents;
CREATE POLICY "Only Supervisors can delete incidents" ON public.incidents FOR DELETE 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('developer', 'barangay_captain', 'barangay_secretary', 'barangay_kagawad', 'supervisor')));

-- 3. INCIDENT PARTIES POLICIES
DROP POLICY IF EXISTS "Personnel can view all parties" ON public.incident_parties;
CREATE POLICY "Personnel can view all parties" ON public.incident_parties FOR SELECT USING (true);

DROP POLICY IF EXISTS "Personnel can create parties" ON public.incident_parties;
CREATE POLICY "Personnel can create parties" ON public.incident_parties FOR INSERT TO authenticated WITH CHECK (true);

-- 4. ASSET REQUESTS POLICIES
DROP POLICY IF EXISTS "Personnel can view all assets" ON public.asset_requests;
CREATE POLICY "Personnel can view all assets" ON public.asset_requests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Personnel can create assets" ON public.asset_requests;
CREATE POLICY "Personnel can create assets" ON public.asset_requests FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Only Supervisors can manage assets" ON public.asset_requests;
CREATE POLICY "Only Supervisors can manage assets" ON public.asset_requests FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('developer', 'barangay_captain', 'barangay_secretary', 'barangay_kagawad', 'supervisor')));

-- 5. CCTV REQUESTS POLICIES
DROP POLICY IF EXISTS "Personnel can view all CCTV" ON public.cctv_requests;
CREATE POLICY "Personnel can view all CCTV" ON public.cctv_requests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Personnel can create CCTV" ON public.cctv_requests;
CREATE POLICY "Personnel can create CCTV" ON public.cctv_requests FOR INSERT TO authenticated WITH CHECK (true);

-- 6. PUBLIC REPORTS POLICIES
DROP POLICY IF EXISTS "Submitters can view their own public reports" ON public.public_reports;
CREATE POLICY "Submitters can view their own public reports" ON public.public_reports FOR SELECT USING (auth.uid() = submitted_by);

DROP POLICY IF EXISTS "Personnel can view all public reports" ON public.public_reports;
CREATE POLICY "Personnel can view all public reports" ON public.public_reports FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('developer', 'barangay_captain', 'barangay_secretary', 'barangay_kagawad', 'supervisor', 'bantay_bayan')));

DROP POLICY IF EXISTS "Citizens can create public reports" ON public.public_reports;
CREATE POLICY "Citizens can create public reports" ON public.public_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = submitted_by);

DROP POLICY IF EXISTS "Personnel can update public reports" ON public.public_reports;
CREATE POLICY "Personnel can update public reports" ON public.public_reports FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('developer', 'barangay_captain', 'barangay_secretary', 'barangay_kagawad', 'supervisor', 'bantay_bayan')));

-- 7. AUDIT LOGS POLICIES
DROP POLICY IF EXISTS "Supervisors can view audit logs" ON public.audit_logs;
CREATE POLICY "Supervisors can view audit logs" ON public.audit_logs FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('developer', 'barangay_captain', 'barangay_secretary', 'barangay_kagawad', 'supervisor')));

-- 8. STORAGE BUCKET: AVATARS
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Avatar Public Access" ON storage.objects;
CREATE POLICY "Avatar Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatar User Manage" ON storage.objects;
CREATE POLICY "Avatar User Manage" ON storage.objects FOR ALL 
USING (bucket_id = 'avatars' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text);


-- 0. TRIGGER FUNCTION: Audit Logging
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (table_name, record_id, operation, old_data, new_data, performed_by)
    VALUES (TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), TG_OP, 
            CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
            CASE WHEN TG_OP IN ('UPDATE', 'INSERT') THEN to_jsonb(NEW) ELSE NULL END,
            auth.uid());
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. AUTH: Handle New User Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_base_username text;
  v_final_username text;
  v_requested_role text;
  v_final_role text;
  v_full_name text;
BEGIN
  -- 2. PREP METADATA
  v_requested_role := COALESCE(new.raw_user_meta_data ->> 'role', 'resident');
  v_final_role := CASE WHEN v_requested_role IN ('resident', 'bantay_bayan') THEN v_requested_role ELSE 'resident' END;
  v_full_name := COALESCE(new.raw_user_meta_data ->> 'full_name', 'Unnamed User');

  v_base_username := COALESCE(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1));
  v_final_username := v_base_username;
  
  -- Deduplication Loop for Username
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = v_final_username AND id != new.id) LOOP
    v_final_username := v_base_username || '_' || substr(md5(random()::text), 1, 4);
  END LOOP;

  -- 3. ATOMIC LINK-OR-INSERT
  -- First try to update an existing record (Linking Resident history by Email)
  UPDATE public.profiles 
  SET id = new.id, 
      email = new.email,
      full_name = v_full_name,
      role = v_final_role,
      status = 'pending'::public.user_status,
      username = v_final_username,
      last_active_at = now()
  WHERE email = new.email;

  -- If no profile existed by email, insert a fresh one
  IF NOT FOUND THEN
    INSERT INTO public.profiles (id, email, full_name, role, status, username, last_active_at)
    VALUES (
      new.id,
      new.email,
      v_full_name,
      v_final_role,
      'pending'::public.user_status,
      v_final_username,
      now()
    )
    ON CONFLICT (id) DO NOTHING; -- Extra safety
  END IF;

  RETURN NEW;
END;
$$;

-- 2. ADMIN: Full System Data Reset
CREATE OR REPLACE FUNCTION public.admin_reset_system_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  IF v_role NOT IN ('developer', 'barangay_captain') THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized: Admin/Captain privileges required.');
  END IF;

  DELETE FROM dispatch_logs WHERE id IS NOT NULL;
  DELETE FROM incident_parties WHERE id IS NOT NULL;
  DELETE FROM incidents WHERE id IS NOT NULL;
  DELETE FROM asset_requests WHERE id IS NOT NULL;
  DELETE FROM cctv_requests WHERE id IS NOT NULL;
  DELETE FROM public_reports WHERE id IS NOT NULL;
  
  -- NEW: Clear Personnel Schedules (Duty Roster)
  BEGIN
    DELETE FROM personnel_schedules WHERE id IS NOT NULL;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  -- NEW: Clear Full Audit Log history
  DELETE FROM audit_logs WHERE id IS NOT NULL;

  -- Log action (This will be the only record left in audit_logs)
  INSERT INTO audit_logs (table_name, record_id, operation, performed_by, new_data)
  VALUES ('SYSTEM', '00000000-0000-0000-0000-000000000000', 'DELETE', auth.uid(), '{"action": "Full System Data Wipe"}');

  RETURN json_build_object('success', true, 'message', 'All system data cleared successfully (Personnel accounts preserved).');
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 3. ADMIN: Resolve Watchlist Incident (is_restricted_entry = false)
CREATE OR REPLACE FUNCTION public.resolve_watchlist_incident(p_incident_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uuid uuid;
  v_count int;
BEGIN
  BEGIN
    v_uuid := p_incident_id::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', 'Invalid Incident ID format');
  END;

  UPDATE public.incidents SET is_restricted_entry = false, updated_at = now() WHERE id = v_uuid;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count > 0 THEN
    RETURN json_build_object('success', true, 'message', 'Watchlist status cleared successfully.');
  ELSE
    RETURN json_build_object('success', false, 'message', 'Record not found or already cleared.');
  END IF;
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 4. ADMIN: Delete User (Cascade from Auth.Users)
CREATE OR REPLACE FUNCTION public.delete_user_by_id(user_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('developer', 'barangay_captain', 'barangay_secretary', 'barangay_kagawad', 'supervisor')) THEN
    RAISE EXCEPTION 'Unauthorized: Administrative privileges required to delete accounts.';
  END IF;
  DELETE FROM auth.users WHERE id = user_uuid;
END;
$$;

-- 6. AUTH: Sync Profile Status to Auth Metadata (Security Definer)
-- This ensures that when an admin approves a profile in public.profiles, 
-- the user's Auth metadata is updated so the frontend recognizes the change immediately.
CREATE OR REPLACE FUNCTION public.sync_status_to_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, auth
AS $$
BEGIN
  -- SAFETY: Never sync during the first 2 minutes of a profile's latest update.
  -- This prevents deadlocks during registration and the account-linking phase, 
  -- ensuring the Auth system has finished its transaction.
  IF (NEW.last_active_at >= now() - interval '2 minutes') THEN
    RETURN NEW;
  END IF;

  -- Sync only if status or role actually changes
  IF (TG_OP = 'UPDATE') AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.role IS DISTINCT FROM NEW.role) THEN
    UPDATE auth.users
    SET raw_user_meta_data = raw_user_meta_data || 
      jsonb_build_object('status', NEW.status, 'role', NEW.role)
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- 7. NOTIFY: Queue Approval Email
-- Creates a record in the notifications table that can be picked up by a webhook
CREATE TABLE IF NOT EXISTS public.approval_notifications (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE ON UPDATE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  status text DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  created_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.handle_approval_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only queue notification if status changes to 'active'
  IF (OLD.status = 'pending' OR OLD.status = 'inactive') AND NEW.status = 'active' THEN
    INSERT INTO public.approval_notifications (user_id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.full_name);
  END IF;
  RETURN NEW;
END;
$$;

-- ==============================================================================
-- TRIGGERS & PERMISSIONS
-- ==============================================================================

-- 1. Profile Creation Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. Status Synchronization Trigger
DROP TRIGGER IF EXISTS on_profile_updated_sync_auth ON public.profiles;
CREATE TRIGGER on_profile_updated_sync_auth AFTER UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE public.sync_status_to_auth();

-- 3. Approval Notification Trigger
DROP TRIGGER IF EXISTS on_profile_approved_notify ON public.profiles;
CREATE TRIGGER on_profile_approved_notify AFTER UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE public.handle_approval_notification();

-- 4. Incident Audit Trigger
DROP TRIGGER IF EXISTS incident_audit ON public.incidents;
CREATE TRIGGER incident_audit BEFORE INSERT OR UPDATE OR DELETE ON public.incidents FOR EACH ROW EXECUTE PROCEDURE public.audit_trigger_func();

-- 5. Public Reports Audit Trigger
DROP TRIGGER IF EXISTS public_reports_audit ON public.public_reports;
CREATE TRIGGER public_reports_audit BEFORE INSERT OR UPDATE OR DELETE ON public.public_reports FOR EACH ROW EXECUTE PROCEDURE public.audit_trigger_func();

-- 6. Grants
GRANT EXECUTE ON FUNCTION public.admin_reset_system_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_watchlist_incident(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_by_id(UUID) TO authenticated;
GRANT ALL ON TABLE public.approval_notifications TO authenticated;

-- Refresh Cache
NOTIFY pgrst, 'reload schema';
