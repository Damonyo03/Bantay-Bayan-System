
-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. Drop older functions to avoid confusion
DROP FUNCTION IF EXISTS public.admin_clear_watchlist(uuid);
DROP FUNCTION IF EXISTS public.clear_restricted_status(uuid);
DROP FUNCTION IF EXISTS public.resolve_watchlist_incident(text);

-- 2. Create the robust function
-- Accepts TEXT to prevent client-side UUID typing issues
-- Returns JSON for clear status reporting
CREATE OR REPLACE FUNCTION public.resolve_watchlist_incident(p_incident_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Runs as DB Owner (Bypasses RLS)
SET search_path = public
AS $$
DECLARE
  v_uuid uuid;
  v_count int;
BEGIN
  -- Cast ID safely
  BEGIN
    v_uuid := p_incident_id::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', 'Invalid Incident ID format');
  END;

  -- Perform Update
  UPDATE public.incidents
  SET 
    is_restricted_entry = false,
    updated_at = now()
  WHERE id = v_uuid;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count > 0 THEN
    RETURN json_build_object('success', true, 'message', 'Watchlist status cleared successfully.');
  ELSE
    RETURN json_build_object('success', false, 'message', 'Record not found or already cleared.');
  END IF;

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 3. Grant Permissions
GRANT EXECUTE ON FUNCTION public.resolve_watchlist_incident(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_watchlist_incident(text) TO service_role;

-- 4. Ensure RLS is active but bypassable by this function
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- 5. Force Schema Reload
NOTIFY pgrst, 'reload schema';
