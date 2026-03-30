-- 1. ENSURE PROFILES TABLE HAS ALL REQUIRED COLUMNS
-- This handles cases where older versions of the database are missing newer fields.
DO $$ 
BEGIN
  -- Add badge_number if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='badge_number') THEN
    ALTER TABLE public.profiles ADD COLUMN badge_number text UNIQUE;
  END IF;

  -- Add avatar_url if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='avatar_url') THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url text;
  END IF;

  -- Add schedule preferences if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='preferred_shift') THEN
    ALTER TABLE public.profiles ADD COLUMN preferred_shift text DEFAULT '1st';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='preferred_day_off') THEN
    ALTER TABLE public.profiles ADD COLUMN preferred_day_off text DEFAULT 'Sunday';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='username') THEN
    ALTER TABLE public.profiles ADD COLUMN username text UNIQUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='last_active_at') THEN
    ALTER TABLE public.profiles ADD COLUMN last_active_at timestamptz DEFAULT now();
  END IF;
END $$;

-- 2. ROBUST ACCOUNT CREATION TRIGGER
-- This version uses NULLIF for badge_number to ensure empty strings from UI 
-- are treated as NULL, preventing 'Unique Constraint' violations for residents.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    role, 
    status, 
    username, 
    badge_number
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'full_name', 'Unnamed User'),
    COALESCE(new.raw_user_meta_data ->> 'role', 'guest'),
    COALESCE(new.raw_user_meta_data ->> 'status', 'inactive'),
    COALESCE(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    NULLIF(new.raw_user_meta_data ->> 'badge_number', '')
  );
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Logging or silence to prevent blocking sign-up if optional fields fail
  RETURN new;
END;
$$;

-- 3. CREATE PUBLIC REPORTS TABLE (STAGING AREA)
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

-- Policy refresh for public reports
ALTER TABLE public.public_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Submitters can view their own public reports" ON public.public_reports;
CREATE POLICY "Submitters can view their own public reports" ON public.public_reports FOR SELECT USING (auth.uid() = submitted_by);

DROP POLICY IF EXISTS "Personnel can view all public reports" ON public.public_reports;
CREATE POLICY "Personnel can view all public reports" ON public.public_reports FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('developer', 'barangay_captain', 'barangay_secretary', 'barangay_kagawad', 'supervisor', 'bantay_bayan')));

DROP POLICY IF EXISTS "Citizens can create public reports" ON public.public_reports;
CREATE POLICY "Citizens can create public reports" ON public.public_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = submitted_by);

DROP POLICY IF EXISTS "Personnel can update public reports" ON public.public_reports;
CREATE POLICY "Personnel can update public reports" ON public.public_reports FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('developer', 'barangay_captain', 'barangay_secretary', 'barangay_kagawad', 'supervisor', 'bantay_bayan')));

-- 4. FIX PROFILES ROLE CONSTRAINT
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

-- Refresh Cache
NOTIFY pgrst, 'reload schema';

