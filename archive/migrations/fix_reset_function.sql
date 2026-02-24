
-- ==========================================
-- FIX: Create Missing Admin Reset Function
-- Run this in Supabase SQL Editor
-- ==========================================

-- 1. Create the function securely
CREATE OR REPLACE FUNCTION public.admin_reset_system_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges (bypass RLS)
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

  -- Delete Transactional Data (Order matters for Foreign Keys)
  DELETE FROM dispatch_logs;
  DELETE FROM incident_parties;
  DELETE FROM incidents;
  DELETE FROM asset_requests;
  DELETE FROM cctv_requests;
  
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
