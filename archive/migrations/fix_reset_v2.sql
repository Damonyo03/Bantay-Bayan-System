
-- ==========================================
-- FIX V2: "DELETE requires a WHERE clause"
-- Run this in Supabase SQL Editor
-- ==========================================

-- 1. Recreate the function with safe delete statements
CREATE OR REPLACE FUNCTION public.admin_reset_system_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  -- Verify Supervisor Role
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  
  IF v_role IS DISTINCT FROM 'supervisor' THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized: Admin privileges required.');
  END IF;

  -- Delete Transactional Data
  -- We add "WHERE id IS NOT NULL" to satisfy 'sql_safe_updates' restrictions
  -- Order matters for Foreign Keys
  
  DELETE FROM dispatch_logs WHERE id IS NOT NULL;
  DELETE FROM incident_parties WHERE id IS NOT NULL;
  DELETE FROM incidents WHERE id IS NOT NULL;
  DELETE FROM asset_requests WHERE id IS NOT NULL;
  DELETE FROM cctv_requests WHERE id IS NOT NULL;
  DELETE FROM audit_logs WHERE table_name = 'SYSTEM' AND operation = 'RESET'; -- Optional cleanup of previous reset logs
  
  -- Log this action
  INSERT INTO audit_logs (table_name, record_id, operation, performed_by, new_data)
  VALUES ('SYSTEM', 'RESET', 'DELETE', auth.uid(), '{"action": "Full System Data Wipe"}');

  RETURN json_build_object('success', true, 'message', 'System data cleared successfully.');
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 2. Grant Permissions
GRANT EXECUTE ON FUNCTION public.admin_reset_system_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_system_data() TO service_role;

-- 3. Force Schema Cache Reload
NOTIFY pgrst, 'reload schema';
