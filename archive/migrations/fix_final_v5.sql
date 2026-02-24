
-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. Create a NEW function with a distinct name to avoid caching issues
-- This function runs as the database owner (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION admin_clear_watchlist(target_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_rows int;
BEGIN
  -- Direct Update: Set restricted flag to false for the specific incident
  UPDATE public.incidents
  SET 
    is_restricted_entry = false,
    updated_at = now()
  WHERE id = target_id;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;

  -- Return clear status
  IF affected_rows > 0 THEN
    RETURN json_build_object('success', true, 'message', 'Status updated.');
  ELSE
    RETURN json_build_object('success', false, 'message', 'Incident ID not found.');
  END IF;

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 2. Explicitly Grant Permission to Authenticated Users
-- We rely on the Frontend UI to hide the button from non-supervisors
GRANT EXECUTE ON FUNCTION admin_clear_watchlist(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_clear_watchlist(uuid) TO service_role;

-- 3. Ensure Incidents Table is Writable
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- 4. Reload Schema to ensure the API sees the new function
NOTIFY pgrst, 'reload schema';
