
-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. RESET POLICIES ON INCIDENTS TABLE
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- Drop potential conflicting policies
DROP POLICY IF EXISTS "Supervisors can update incidents" ON public.incidents;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.incidents;

-- Create a DEFINITIVE policy for Supervisors to update ANY incident
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

-- 2. CREATE FALLBACK FUNCTION (Just in case RLS fails)
CREATE OR REPLACE FUNCTION public.force_clear_watchlist(p_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uuid uuid;
BEGIN
  -- Attempt to cast ID
  BEGIN
    v_uuid := p_id::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', 'Invalid ID format');
  END;

  -- Force Update
  UPDATE public.incidents
  SET 
    is_restricted_entry = false,
    updated_at = now()
  WHERE id = v_uuid;

  IF FOUND THEN
    RETURN json_build_object('success', true, 'message', 'Cleared successfully via RPC');
  ELSE
    RETURN json_build_object('success', false, 'message', 'Record not found');
  END IF;
END;
$$;

-- 3. GRANT PERMISSIONS
GRANT EXECUTE ON FUNCTION public.force_clear_watchlist(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.force_clear_watchlist(text) TO service_role;

-- 4. RELOAD
NOTIFY pgrst, 'reload schema';
