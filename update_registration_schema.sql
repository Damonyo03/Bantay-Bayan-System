-- 1. Add valid_id_url to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS valid_id_url text;

-- 2. Create the identity-docs bucket (PRIVATE)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('identity-docs', 'identity-docs', false) 
ON CONFLICT (id) DO NOTHING;

-- 3. RLS Policies for identity-docs bucket
-- Only authenticated users can upload their own ID
DROP POLICY IF EXISTS "Users can upload their own ID" ON storage.objects;
CREATE POLICY "Users can upload their own ID" ON storage.objects 
FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'identity-docs');

-- Only Admins/Supervisors can view IDs
DROP POLICY IF EXISTS "Admins can view all IDs" ON storage.objects;
CREATE POLICY "Admins can view all IDs" ON storage.objects 
FOR SELECT TO authenticated 
USING (
  bucket_id = 'identity-docs' AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('developer', 'barangay_captain', 'barangay_secretary', 'barangay_kagawad', 'supervisor')
  )
);

-- 4. Update the handle_new_user trigger to include valid_id_url
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
  v_valid_id_url text;
BEGIN
  -- 2. PREP METADATA
  v_requested_role := COALESCE(new.raw_user_meta_data ->> 'role', 'resident');
  v_final_role := CASE WHEN v_requested_role IN ('resident', 'bantay_bayan') THEN v_requested_role ELSE 'resident' END;
  v_full_name := COALESCE(new.raw_user_meta_data ->> 'full_name', 'Unnamed User');
  v_valid_id_url := new.raw_user_meta_data ->> 'valid_id_url';

  v_base_username := COALESCE(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1));
  v_final_username := v_base_username;
  
  -- Deduplication Loop for Username
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = v_final_username AND id != new.id) LOOP
    v_final_username := v_base_username || '_' || substr(md5(random()::text), 1, 4);
  END LOOP;

  -- 3. ATOMIC LINK-OR-INSERT
  UPDATE public.profiles 
  SET id = new.id, 
      email = new.email,
      full_name = v_full_name,
      role = v_final_role,
      status = 'pending'::public.user_status,
      username = v_final_username,
      valid_id_url = v_valid_id_url,
      last_active_at = now()
  WHERE email = new.email;

  IF NOT FOUND THEN
    INSERT INTO public.profiles (id, email, full_name, role, status, username, valid_id_url, last_active_at)
    VALUES (
      new.id,
      new.email,
      v_full_name,
      v_final_role,
      'pending'::public.user_status,
      v_final_username,
      v_valid_id_url,
      now()
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
