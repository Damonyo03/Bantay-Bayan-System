
-- 1. Move all pending applications back to profiles table
INSERT INTO public.profiles (id, email, username, full_name, role, valid_id_url, status, last_active_at, created_at)
SELECT id, email, username, full_name, role, valid_id_url, 'pending', now(), applied_at
FROM public.registration_applications
ON CONFLICT (id) DO UPDATE SET 
    status = 'pending',
    valid_id_url = EXCLUDED.valid_id_url;

-- 2. Update handle_new_user trigger to always use profiles table
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
  v_status text;
BEGIN
  -- Extract Metadata
  v_requested_role := COALESCE(new.raw_user_meta_data ->> 'role', 'resident');
  v_full_name := COALESCE(new.raw_user_meta_data ->> 'full_name', 'Unnamed User');
  v_valid_id_url := new.raw_user_meta_data ->> 'valid_id_url';
  v_base_username := COALESCE(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1));
  v_status := COALESCE(new.raw_user_meta_data ->> 'status', 'active'); -- Default to active if created by admin
  
  v_final_username := v_base_username;

  -- Username Deduplication (Only check profiles now)
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = v_final_username) LOOP
    v_final_username := v_base_username || '_' || substr(md5(random()::text), 1, 4);
  END LOOP;

  -- Always Insert into profiles
  INSERT INTO public.profiles (id, email, full_name, role, status, username, last_active_at, valid_id_url)
  VALUES (new.id, new.email, v_full_name, v_requested_role, v_status, v_final_username, now(), v_valid_id_url);

  RETURN NEW;
END;
$$;

-- 3. Simplified Approval Logic
CREATE OR REPLACE FUNCTION public.approve_registration_application(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify caller is an Admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('developer', 'barangay_captain', 'barangay_secretary', 'barangay_kagawad', 'supervisor')
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Just update the status to active
  UPDATE public.profiles 
  SET status = 'active', last_active_at = now()
  WHERE id = target_user_id;
END;
$$;

-- 4. Clean up (Optional: Drop the old table if empty or after migration)
-- DROP TABLE public.registration_applications;
