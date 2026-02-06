
-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. Clean up previous function definitions to avoid conflicts
DROP FUNCTION IF EXISTS public.clear_restricted_status(uuid);
DROP FUNCTION IF EXISTS public.clear_restricted_status(target_incident_id uuid);

-- 2. Create the definitive function
CREATE OR REPLACE FUNCTION public.clear_restricted_status(p_incident_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Bypass RLS
SET search_path = public
AS $$
DECLARE
  is_supervisor boolean;
BEGIN
  -- 1. Check Permissions: Efficiently check if the caller is a supervisor
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'supervisor'
  ) INTO is_supervisor;

  -- Allow if supervisor OR if we are in a dev environment (optional safety)
  IF NOT is_supervisor THEN
     RETURN json_build_object('success', false, 'message', 'Permission Denied: Supervisor role required.');
  END IF;

  -- 2. Perform Update
  UPDATE public.incidents
  SET 
    is_restricted_entry = false,
    updated_at = now()
  WHERE id = p_incident_id;
  
  -- 3. Return Result
  IF FOUND THEN
    RETURN json_build_object('success', true, 'message', 'Status updated successfully');
  ELSE
    RETURN json_build_object('success', false, 'message', 'Incident record not found');
  END IF;

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 3. Grant Permissions
GRANT EXECUTE ON FUNCTION public.clear_restricted_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_restricted_status(uuid) TO service_role;

-- 4. Ensure RLS is active on Incidents to prevent accidental public writes (RPC bypasses this safely)
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- 5. Force schema reload
NOTIFY pgrst, 'reload schema';
