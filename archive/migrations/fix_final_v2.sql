
-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. Create a secure function to clear the restricted flag
-- This function runs with SECURITY DEFINER (Admin privileges) to ensure it works
CREATE OR REPLACE FUNCTION clear_restricted_status(target_incident_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  performer_role text;
BEGIN
  -- Check if the user is a supervisor
  SELECT role INTO performer_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF performer_role IS DISTINCT FROM 'supervisor' THEN
    RAISE EXCEPTION 'Access Denied: Only supervisors can perform this action.';
  END IF;

  -- Perform the update
  UPDATE public.incidents
  SET 
    is_restricted_entry = false,
    updated_at = now()
  WHERE id = target_incident_id;
  
END;
$$;

-- 2. Ensure RLS is enabled but policies exist
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- 3. Refresh schema cache
NOTIFY pgrst, 'reload schema';
