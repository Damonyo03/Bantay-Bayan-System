
-- ==========================================
-- FIX: Final System Reset Function
-- Run this in Supabase SQL Editor to enable "Reset Database"
-- ==========================================

-- 1. Drop old versions to prevent conflicts
DROP FUNCTION IF EXISTS public.admin_reset_system_data();

-- 2. Create the function
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

  -- Delete Transactional Data (Order matters for foreign keys)
  -- Added WHERE clauses to satisfy sql_safe_updates
  DELETE FROM dispatch_logs WHERE id IS NOT NULL;
  DELETE FROM incident_parties WHERE id IS NOT NULL;
  DELETE FROM incidents WHERE id IS NOT NULL;
  DELETE FROM asset_requests WHERE id IS NOT NULL;
  DELETE FROM cctv_requests WHERE id IS NOT NULL;
  
  -- Cleanup previous system reset logs (Optional)
  DELETE FROM audit_logs WHERE table_name = 'SYSTEM' AND operation = 'DELETE' AND record_id = '00000000-0000-0000-0000-000000000000';

  -- Log this action
  -- Uses Nil UUID (all zeros) because record_id expects uuid type, not text
  INSERT INTO audit_logs (table_name, record_id, operation, performed_by, new_data)
  VALUES ('SYSTEM', '00000000-0000-0000-0000-000000000000', 'DELETE', auth.uid(), '{"action": "Full System Data Wipe"}');

  RETURN json_build_object('success', true, 'message', 'System data cleared successfully.');
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 3. Grant Permissions
GRANT EXECUTE ON FUNCTION public.admin_reset_system_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_system_data() TO service_role;

-- 4. Reload Schema Cache
NOTIFY pgrst, 'reload schema';
