-- ==============================================================================
-- ROLLBACK SCRIPT: 20261007_create_audit_access_log_rollback.sql
-- Description: Safely drops policies, indices, and audit_access_log table.
-- ==============================================================================

DROP POLICY IF EXISTS "Allow authenticated users to insert access logs" ON public.audit_access_log;
DROP POLICY IF EXISTS "Allow admins to view access logs" ON public.audit_access_log;

DROP TABLE IF EXISTS public.audit_access_log CASCADE;
