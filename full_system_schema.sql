
-- ==============================================================================
-- BANTAY BAYAN: COMPLETE SYSTEM DATABASE SCHEMA
-- This script defines all tables, relationships, and RLS security policies.
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
  status text DEFAULT 'inactive' CHECK (status IN ('active', 'inactive')),
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

-- General: Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cctv_requests ENABLE ROW LEVEL SECURITY;

-- POLICY: Read access for all authenticated personnel
CREATE POLICY "Personnel can view all records" ON public.incidents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Personnel can view all parties" ON public.incident_parties FOR SELECT TO authenticated USING (true);
CREATE POLICY "Personnel can view all assets" ON public.asset_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Personnel can view all CCTV" ON public.cctv_requests FOR SELECT TO authenticated USING (true);

-- POLICY: Insert access for everyone (Operators create reports)
CREATE POLICY "Personnel can create incidents" ON public.incidents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Personnel can create parties" ON public.incident_parties FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Personnel can create assets" ON public.asset_requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Personnel can create CCTV" ON public.cctv_requests FOR INSERT TO authenticated WITH CHECK (true);

-- POLICY: Update/Delete access ONLY for Supervisors
CREATE POLICY "Only Supervisors can update incidents" 
ON public.incidents FOR UPDATE TO authenticated 
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'supervisor');

CREATE POLICY "Only Supervisors can delete incidents" 
ON public.incidents FOR DELETE TO authenticated 
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'supervisor');

CREATE POLICY "Only Supervisors can manage assets" 
ON public.asset_requests FOR UPDATE TO authenticated 
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'supervisor');

-- ==============================================================================
-- AUTOMATION & TRIGGERS
-- ==============================================================================

-- Audit Logger Function
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (table_name, record_id, operation, old_data, new_data, performed_by)
    VALUES (TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), TG_OP, 
            CASE WHEN TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
            CASE WHEN TG_OP = 'UPDATE' OR TG_OP = 'INSERT' THEN to_jsonb(NEW) ELSE NULL END,
            auth.uid());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind Audit to Incidents
CREATE TRIGGER incident_audit BEFORE INSERT OR UPDATE OR DELETE ON public.incidents
FOR EACH ROW EXECUTE PROCEDURE audit_trigger_func();

-- Refresh Cache
NOTIFY pgrst, 'reload schema';
