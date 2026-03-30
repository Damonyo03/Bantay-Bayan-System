-- ==============================================================================
-- BANTAY BAYAN INCIDENT TRACKING SYSTEM
-- AUTHORIZED PERSONNEL UPDATE SCRIPT
-- ==============================================================================

-- 1. FIX ACCOUNT CREATION TRIGGER ERROR
-- Replace 'field_operator' with 'guest' which is a valid role to prevent constraint failure.
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
    COALESCE(new.raw_user_meta_data ->> 'role', 'guest'),
    COALESCE(new.raw_user_meta_data ->> 'status', 'inactive'),
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'badge_number'
  );
  RETURN new;
END;
$$;

-- 2. CREATE PUBLIC REPORTS TABLE (FOR RESIDENTS AND GUESTS)
-- This creates a staging area for citizen reports so they can be acknowledged
-- by authorized personnel before becoming official "Incidents".
CREATE TABLE IF NOT EXISTS public.public_reports (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  reference_number text UNIQUE NOT NULL,
  type text NOT NULL CHECK (type IN ('Medical', 'Fire', 'Theft', 'Disturbance', 'Traffic', 'Logistics', 'Other')),
  narrative text NOT NULL,
  location text NOT NULL,
  status text DEFAULT 'Pending Review' CHECK (status IN ('Pending Review', 'Acknowledged', 'Converted to Incident', 'Rejected')),
  submitted_by uuid REFERENCES public.profiles(id),
  converted_incident_id uuid REFERENCES public.incidents(id),
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS for public reports
ALTER TABLE public.public_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Citizens can view their own reports
DROP POLICY IF EXISTS "Submitters can view their own public reports" ON public.public_reports;
CREATE POLICY "Submitters can view their own public reports" ON public.public_reports 
FOR SELECT USING (auth.uid() = submitted_by);

-- Policy: Personnel can view all public reports
DROP POLICY IF EXISTS "Personnel can view all public reports" ON public.public_reports;
CREATE POLICY "Personnel can view all public reports" ON public.public_reports 
FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('developer', 'barangay_captain', 'barangay_secretary', 'barangay_kagawad', 'supervisor', 'bantay_bayan')));

-- Policy: Authenticated users (Citizens/Guests) can insert public reports
DROP POLICY IF EXISTS "Citizens can create public reports" ON public.public_reports;
CREATE POLICY "Citizens can create public reports" ON public.public_reports 
FOR INSERT TO authenticated WITH CHECK (auth.uid() = submitted_by);

-- Policy: Personnel can update public reports (acknowledging them)
DROP POLICY IF EXISTS "Personnel can update public reports" ON public.public_reports;
CREATE POLICY "Personnel can update public reports" ON public.public_reports 
FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('developer', 'barangay_captain', 'barangay_secretary', 'barangay_kagawad', 'supervisor', 'bantay_bayan')));

-- 3. AUDIT TRIGGER FOR PUBLIC REPORTS
DROP TRIGGER IF EXISTS public_reports_audit ON public.public_reports;
CREATE TRIGGER public_reports_audit 
BEFORE INSERT OR UPDATE OR DELETE ON public.public_reports 
FOR EACH ROW EXECUTE PROCEDURE public.audit_trigger_func();

-- Refresh Cache
NOTIFY pgrst, 'reload schema';

-- 4. FIX PROFILES ROLE CONSTRAINT
-- The existing database instance likely has a check constraint preventing 'resident' from being inserted.
-- We must drop the old constraint and explicitly add the new one.
DO $$
DECLARE
  constraint_name text;
BEGIN
  -- Find the constraint defining the 'role' column check on 'profiles'
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.profiles'::regclass AND contype = 'c' 
    AND pg_get_constraintdef(oid) LIKE '%role%';

  -- Drop the constraint if it exists
  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT ' || constraint_name;
  END IF;

  -- Add the correct constraint
  EXECUTE 'ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN (''developer'', ''barangay_captain'', ''barangay_secretary'', ''barangay_kagawad'', ''supervisor'', ''bantay_bayan'', ''resident'', ''guest''))';
END $$;

