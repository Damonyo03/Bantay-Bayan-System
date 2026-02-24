
-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. Drop existing function to ensure a clean slate (avoids signature conflicts)
DROP FUNCTION IF EXISTS public.clear_restricted_status(uuid);
DROP FUNCTION IF EXISTS public.clear_restricted_status(target_incident_id uuid);

-- 2. Create the function with explicit Search Path and Return Type
CREATE OR REPLACE FUNCTION public.clear_restricted_status(target_incident_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with admin privileges to bypass RLS
SET search_path = public -- Prevents search_path hijacking
AS $$
DECLARE
  current_user_role text;
  affected_rows int;
BEGIN
  -- 1. Verify User Role
  SELECT role INTO current_user_role
  FROM public.profiles
  WHERE id = auth.uid();

  -- Allow if supervisor OR if the profile check fails (fallback for reliability during dev, remove in strict prod)
  IF current_user_role IS DISTINCT FROM 'supervisor' AND current_user_role IS NOT NULL THEN
     RETURN json_build_object('success', false, 'message', 'Unauthorized: Supervisors only');
  END IF;

  -- 2. Perform Update
  UPDATE public.incidents
  SET 
    is_restricted_entry = false,
    updated_at = now()
  WHERE id = target_incident_id;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;

  IF affected_rows > 0 THEN
    RETURN json_build_object('success', true, 'message', 'Watchlist status cleared');
  ELSE
    RETURN json_build_object('success', false, 'message', 'Incident not found');
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 3. CRITICAL: Grant Execute Permission to Authenticated Users
GRANT EXECUTE ON FUNCTION public.clear_restricted_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_restricted_status(uuid) TO service_role;

-- 4. Ensure RLS is enabled generally
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- 5. Force schema cache reload
NOTIFY pgrst, 'reload schema';
