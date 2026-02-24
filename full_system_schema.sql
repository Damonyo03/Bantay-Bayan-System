
-- ==============================================================================
-- BANTAY BAYAN: COMPLETE SYSTEM DATABASE SCHEMA
-- This script defines all tables, relationships, functions, and RLS security policies.
-- Execute this in the Supabase SQL Editor.
-- ==============================================================================

-- 1. ENUMS & EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USER PROFILES TABLE
-- Stores personnel data and roles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email text UNIQUE NOT NULL,
  username text UNIQUE,
  full_name text NOT NULL,
  role text DEFAULT 'field_operator' CHECK (role IN ('supervisor', 'field_operator')),
  status text DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'rejected')),
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
  officer_id uuid REFERENCES public.profiles(id),
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
  logged_by uuid REFERENCES public.profiles(id),
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

-- 8. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  operation text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  performed_by uuid REFERENCES public.profiles(id),
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
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES POLICIES
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Supervisors can update any profile" ON public.profiles;
CREATE POLICY "Supervisors can update any profile" ON public.profiles FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'supervisor'));

-- 2. INCIDENTS POLICIES
DROP POLICY IF EXISTS "Personnel can view all records" ON public.incidents;
CREATE POLICY "Personnel can view all records" ON public.incidents FOR SELECT USING (true);

DROP POLICY IF EXISTS "Personnel can create incidents" ON public.incidents;
CREATE POLICY "Personnel can create incidents" ON public.incidents FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Only Supervisors can update incidents" ON public.incidents;
CREATE POLICY "Only Supervisors can update incidents" ON public.incidents FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'supervisor'));

DROP POLICY IF EXISTS "Only Supervisors can delete incidents" ON public.incidents;
CREATE POLICY "Only Supervisors can delete incidents" ON public.incidents FOR DELETE 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'supervisor'));

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
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'supervisor'));

-- 5. CCTV REQUESTS POLICIES
DROP POLICY IF EXISTS "Personnel can view all CCTV" ON public.cctv_requests;
CREATE POLICY "Personnel can view all CCTV" ON public.cctv_requests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Personnel can create CCTV" ON public.cctv_requests;
CREATE POLICY "Personnel can create CCTV" ON public.cctv_requests FOR INSERT TO authenticated WITH CHECK (true);

-- 6. AUDIT LOGS POLICIES
DROP POLICY IF EXISTS "Supervisors can view audit logs" ON public.audit_logs;
CREATE POLICY "Supervisors can view audit logs" ON public.audit_logs FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'supervisor'));

-- 7. STORAGE BUCKET: AVATARS
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Avatar Public Access" ON storage.objects;
CREATE POLICY "Avatar Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatar User Manage" ON storage.objects;
CREATE POLICY "Avatar User Manage" ON storage.objects FOR ALL 
USING (bucket_id = 'avatars' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text);


-- ==============================================================================
-- DATABASE FUNCTIONS (SECURITY DEFINER)
-- ==============================================================================

-- 1. AUTH: Handle New User Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, status, username, badge_number)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    COALESCE(new.raw_user_meta_data ->> 'role', 'field_operator'),
    COALESCE(new.raw_user_meta_data ->> 'status', 'inactive'),
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'badge_number'
  );
  RETURN new;
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
  IF v_role IS DISTINCT FROM 'supervisor' THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized: Admin privileges required.');
  END IF;

  DELETE FROM dispatch_logs WHERE id IS NOT NULL;
  DELETE FROM incident_parties WHERE id IS NOT NULL;
  DELETE FROM incidents WHERE id IS NOT NULL;
  DELETE FROM asset_requests WHERE id IS NOT NULL;
  DELETE FROM cctv_requests WHERE id IS NOT NULL;
  
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
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'supervisor') THEN
    RAISE EXCEPTION 'Unauthorized: Only supervisors can delete accounts.';
  END IF;
  DELETE FROM auth.users WHERE id = user_uuid;
END;
$$;

-- 5. TRIGGER FUNCTION: Audit Logging
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


-- ==============================================================================
-- TRIGGERS & PERMISSIONS
-- ==============================================================================

-- 1. Profile Creation Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. Incident Audit Trigger
DROP TRIGGER IF EXISTS incident_audit ON public.incidents;
CREATE TRIGGER incident_audit BEFORE INSERT OR UPDATE OR DELETE ON public.incidents FOR EACH ROW EXECUTE PROCEDURE public.audit_trigger_func();

-- 3. Grants
GRANT EXECUTE ON FUNCTION public.admin_reset_system_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_watchlist_incident(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_by_id(UUID) TO authenticated;

-- Refresh Cache
NOTIFY pgrst, 'reload schema';
