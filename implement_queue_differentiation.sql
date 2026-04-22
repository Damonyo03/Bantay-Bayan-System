-- 1. Create the Registration Applications table (The "Queue")
-- This table differentiates applicants from official members.
CREATE TABLE IF NOT EXISTS public.registration_applications (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email text UNIQUE NOT NULL,
    username text UNIQUE NOT NULL,
    full_name text NOT NULL,
    role text NOT NULL,
    valid_id_url text,
    applied_at timestamptz DEFAULT now(),
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'rejected'))
);

-- 2. Enable RLS on the new table
ALTER TABLE public.registration_applications ENABLE ROW LEVEL SECURITY;

-- 3. Policies for registration_applications
-- Admins can see everything
CREATE POLICY "Admins can view all applications" ON public.registration_applications
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('developer', 'barangay_captain', 'barangay_secretary', 'barangay_kagawad', 'supervisor')
  )
);

-- Users can see their own application status
CREATE POLICY "Users can view own application" ON public.registration_applications
FOR SELECT TO authenticated
USING (id = auth.uid());

-- 4. REFACTOR: Update handle_new_user trigger
-- Now, it will NOT create a profile immediately. It will create an application record.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_base_username text;
  v_final_username text;
  v_requested_role text;
  v_full_name text;
  v_valid_id_url text;
BEGIN
  -- Extract Metadata
  v_requested_role := COALESCE(new.raw_user_meta_data ->> 'role', 'resident');
  v_full_name := COALESCE(new.raw_user_meta_data ->> 'full_name', 'Unnamed User');
  v_valid_id_url := new.raw_user_meta_data ->> 'valid_id_url';
  v_base_username := COALESCE(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1));
  v_final_username := v_base_username;

  -- Username Deduplication (Check both profiles and applications)
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = v_final_username) OR 
        EXISTS (SELECT 1 FROM public.registration_applications WHERE username = v_final_username) LOOP
    v_final_username := v_base_username || '_' || substr(md5(random()::text), 1, 4);
  END LOOP;

  -- DIFFERENTIATION LOGIC:
  -- If it's a new registration (not invited by admin), move to Queue.
  -- (We assume registrations have the 'pending' status in metadata)
  IF (new.raw_user_meta_data ->> 'status') = 'pending' THEN
    INSERT INTO public.registration_applications (id, email, username, full_name, role, valid_id_url)
    VALUES (new.id, new.email, v_final_username, v_full_name, v_requested_role, v_valid_id_url);
  ELSE
    -- If created by admin directly, go to profiles immediately
    INSERT INTO public.profiles (id, email, full_name, role, status, username, last_active_at)
    VALUES (new.id, new.email, v_full_name, v_requested_role, 'active', v_final_username, now());
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Create a function for the Admin to Approve an application
-- This "Officializes" the user by moving them from Queue to Profiles
CREATE OR REPLACE FUNCTION public.approve_registration_application(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Verify caller is an Admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('developer', 'barangay_captain', 'barangay_secretary', 'barangay_kagawad', 'supervisor')
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 2. Move data to profiles
  INSERT INTO public.profiles (id, email, username, full_name, role, valid_id_url, status, last_active_at)
  SELECT id, email, username, full_name, role, valid_id_url, 'active', now()
  FROM public.registration_applications
  WHERE id = target_user_id;

  -- 3. Delete from Queue
  DELETE FROM public.registration_applications WHERE id = target_user_id;
END;
$$;
