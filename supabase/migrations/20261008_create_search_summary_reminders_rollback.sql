-- ==============================================================================
-- ROLLBACK SCRIPT: 20261008_create_search_summary_reminders_rollback.sql
-- Description: Safely drops global_search function, policies, and system_alert_settings table.
-- ==============================================================================

-- 1. Drop global_search RPC function
DROP FUNCTION IF EXISTS public.global_search(TEXT, INT);

-- 2. Drop policies and table
DROP POLICY IF EXISTS "Allow all authenticated users to read alert settings" ON public.system_alert_settings;
DROP POLICY IF EXISTS "Allow admins to update alert settings" ON public.system_alert_settings;

DROP TABLE IF EXISTS public.system_alert_settings CASCADE;
