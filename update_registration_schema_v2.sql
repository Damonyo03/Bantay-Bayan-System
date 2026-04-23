
-- Update Profiles table with new fields for Regular Citizens
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS area text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS contact_info text;

-- Update handle_new_user trigger to extract new metadata fields
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
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
  v_area text;
  v_address text;
  v_contact_info text;
BEGIN
  -- 1. Extract Metadata
  v_requested_role := COALESCE(new.raw_user_meta_data ->> 'role', 'resident');
  v_final_role := CASE WHEN v_requested_role IN ('resident', 'bantay_bayan') THEN v_requested_role ELSE 'resident' END;
  v_full_name := COALESCE(new.raw_user_meta_data ->> 'full_name', 'Unnamed User');
  v_valid_id_url := new.raw_user_meta_data ->> 'valid_id_url';
  
  -- New fields for citizens
  v_area := new.raw_user_meta_data ->> 'area';
  v_address := new.raw_user_meta_data ->> 'address';
  v_contact_info := new.raw_user_meta_data ->> 'contact_info';

  v_base_username := COALESCE(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1));
  v_final_username := v_base_username;
  
  -- Deduplication Loop for Username
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = v_final_username AND id != new.id) LOOP
    v_final_username := v_base_username || '_' || substr(md5(random()::text), 1, 4);
  END LOOP;

  -- 2. ATOMIC LINK-OR-INSERT
  UPDATE public.profiles 
  SET id = new.id, 
      email = new.email,
      full_name = v_full_name,
      role = v_final_role,
      status = 'inactive'::public.user_status,
      username = v_final_username,
      valid_id_url = v_valid_id_url,
      area = v_area,
      address = v_address,
      contact_info = v_contact_info,
      last_active_at = now()
  WHERE email = new.email;

  IF NOT FOUND THEN
    INSERT INTO public.profiles (
        id, email, full_name, role, status, username, valid_id_url, 
        area, address, contact_info, last_active_at
    )
    VALUES (
      new.id,
      new.email,
      v_full_name,
      v_final_role,
      'inactive'::public.user_status,
      v_final_username,
      v_valid_id_url,
      v_area,
      v_address,
      v_contact_info,
      now()
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate the trigger on auth.users (since CASCADE dropped it)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Simplified Approval Logic
DROP FUNCTION IF EXISTS public.approve_registration_application(uuid);
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

-- 5. Rejection Logic
DROP FUNCTION IF EXISTS public.reject_registration_application(uuid);
CREATE OR REPLACE FUNCTION public.reject_registration_application(target_user_id uuid)
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

  -- Update status to rejected
  UPDATE public.profiles 
  SET status = 'rejected', last_active_at = now()
  WHERE id = target_user_id;
END;
$$;

-- Add rejection notification support
ALTER TABLE public.approval_notifications 
ADD COLUMN IF NOT EXISTS notification_type text DEFAULT 'approval'; 

DROP FUNCTION IF EXISTS public.handle_status_change_notification();
CREATE OR REPLACE FUNCTION public.handle_status_change_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Notify on Approval
  IF (OLD.status = 'pending') AND NEW.status = 'active' THEN
    INSERT INTO public.approval_notifications (user_id, email, full_name, notification_type)
    VALUES (NEW.id, NEW.email, NEW.full_name, 'approval');
  END IF;

  -- Notify on Rejection
  IF (OLD.status = 'pending') AND NEW.status = 'rejected' THEN
    INSERT INTO public.approval_notifications (user_id, email, full_name, notification_type)
    VALUES (NEW.id, NEW.email, NEW.full_name, 'rejection');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_approved_notify ON public.profiles;
DROP TRIGGER IF EXISTS on_profile_status_notify ON public.profiles;
CREATE TRIGGER on_profile_status_notify 
AFTER UPDATE ON public.profiles 
FOR EACH ROW EXECUTE PROCEDURE public.handle_status_change_notification();
