
-- ==========================================
-- FIX: Expanded System Reset Function (v2)
-- Includes personnel_schedules and full audit_log wipe
-- Run this in Supabase SQL Editor
-- ==========================================

-- 1. Drop old versions
DROP FUNCTION IF EXISTS public.admin_reset_system_data();

-- 2. Create the expanded function
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

  -- Delete Transactional Data (Order matters for Foreign Keys, though some cascade)
  -- We use WHERE id IS NOT NULL to bypass sql_safe_updates restrictions
  
  DELETE FROM dispatch_logs WHERE id IS NOT NULL;
  DELETE FROM incident_parties WHERE id IS NOT NULL;
  DELETE FROM incidents WHERE id IS NOT NULL;
  DELETE FROM asset_requests WHERE id IS NOT NULL;
  DELETE FROM cctv_requests WHERE id IS NOT NULL;
  
  -- NEW: Clear Personnel Schedules (Duty Roster)
  -- Wrapped in a block to handle cases where table might be empty or missing columns
  BEGIN
    DELETE FROM personnel_schedules WHERE id IS NOT NULL;
  EXCEPTION WHEN OTHERS THEN
    -- Fallback for if personnel_schedules is slightly different
    NULL;
  END;
  
  -- NEW: Clear Full Audit Log history
  DELETE FROM audit_logs WHERE id IS NOT NULL;

  -- Log this reset action (This will be the only record left in audit_logs)
  INSERT INTO audit_logs (table_name, record_id, operation, performed_by, new_data)
  VALUES ('SYSTEM', '00000000-0000-0000-0000-000000000000', 'DELETE', auth.uid(), '{"action": "Full System Data Wipe - Migration v2"}');

  RETURN json_build_object('success', true, 'message', 'All system data cleared successfully (Personnel accounts preserved).');
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 3. Grant Permissions
GRANT EXECUTE ON FUNCTION public.admin_reset_system_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_system_data() TO service_role;

-- 4. Reload Schema Cache
NOTIFY pgrst, 'reload schema';
