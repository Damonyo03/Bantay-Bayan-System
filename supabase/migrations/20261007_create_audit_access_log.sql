-- ==============================================================================
-- MIGRATION: 20261007_create_audit_access_log.sql
-- Description: Creates append-only audit_access_log table for tracking sensitive 
--              data access (viewed, exported, printed) in compliance with DPA.
-- ==============================================================================

-- 1. Create audit_access_log table
CREATE TABLE IF NOT EXISTS public.audit_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
    action TEXT NOT NULL CHECK (action IN ('viewed', 'exported', 'printed')),
    record_type TEXT NOT NULL,
    record_id TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_agent TEXT
);

-- 2. Indices for fast querying and filtering
CREATE INDEX IF NOT EXISTS idx_audit_access_log_timestamp 
    ON public.audit_access_log(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_audit_access_log_user_id 
    ON public.audit_access_log(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_access_log_record_type 
    ON public.audit_access_log(record_type);

CREATE INDEX IF NOT EXISTS idx_audit_access_log_action 
    ON public.audit_access_log(action);

-- 3. Enable Row Level Security (RLS) - Append-Only
ALTER TABLE public.audit_access_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow authenticated users to insert access logs" ON public.audit_access_log;
DROP POLICY IF EXISTS "Allow admins to view access logs" ON public.audit_access_log;

-- Insert policy: Any authenticated user/staff can append access logs
CREATE POLICY "Allow authenticated users to insert access logs"
    ON public.audit_access_log
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Read policy: Only authorized administrators can read audit access logs
CREATE POLICY "Allow admins to view access logs"
    ON public.audit_access_log
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
              AND profiles.role IN ('barangay_captain', 'barangay_secretary', 'barangay_kagawad', 'developer')
        )
    );

-- Note: No UPDATE or DELETE policies are defined, enforcing strict append-only immutability.
