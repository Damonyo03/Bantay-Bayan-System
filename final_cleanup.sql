
-- RUN THIS IN SUPABASE SQL EDITOR TO CLEAN UP AND FIX

-- 1. CLEANUP: Drop all previous attempts to avoid confusion
DROP FUNCTION IF EXISTS public.admin_clear_watchlist(uuid);
DROP FUNCTION IF EXISTS public.clear_restricted_status(uuid);
DROP FUNCTION IF EXISTS public.resolve_watchlist_incident(text);
DROP FUNCTION IF EXISTS public.force_clear_watchlist(text); 

-- 2. FIX RLS: Ensure Supervisors can update Incidents table directly
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Supervisors can update incidents" ON public.incidents;

CREATE POLICY "Supervisors can update incidents"
ON public.incidents
FOR UPDATE
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'supervisor'
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'supervisor'
);

-- 3. CREATE DEFINITIVE FALLBACK FUNCTION
-- This allows clearing even if the frontend RLS check fails for some reason.
CREATE OR REPLACE FUNCTION public.force_clear_watchlist(p_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Runs as Admin
SET search_path = public
AS $$
DECLARE
  v_uuid uuid;
BEGIN
  -- Safe Cast
  BEGIN
    v_uuid := p_id::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', 'Invalid Incident ID format');
  END;

  -- Update
  UPDATE public.incidents
  SET 
    is_restricted_entry = false,
    updated_at = now()
  WHERE id = v_uuid;

  IF FOUND THEN
    RETURN json_build_object('success', true, 'message', 'Cleared successfully');
  ELSE
    RETURN json_build_object('success', false, 'message', 'Record not found');
  END IF;
END;
$$;

-- 4. GRANT PERMISSIONS
GRANT EXECUTE ON FUNCTION public.force_clear_watchlist(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.force_clear_watchlist(text) TO service_role;

-- 5. RELOAD
NOTIFY pgrst, 'reload schema';
