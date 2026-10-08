-- ==============================================================================
-- BANTAY BAYAN: EXPAND PHOTO ATTACHMENTS TO ALL REPORTS MIGRATION
-- Adds support for photo evidence and camera captures to Incident/Blotters,
-- CCTV requests, and Citizen Public Reports.
-- Idempotent & Non-Destructive
-- ==============================================================================

BEGIN;

-- 1. Add Parent Foreign Key Columns to public.log_attachments if not exist
ALTER TABLE public.log_attachments
    ADD COLUMN IF NOT EXISTS incident_id UUID REFERENCES public.incidents(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS cctv_request_id UUID REFERENCES public.cctv_requests(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS public_report_id UUID REFERENCES public.public_reports(id) ON DELETE CASCADE;

-- 2. Create Indexes for fast retrieval
CREATE INDEX IF NOT EXISTS idx_log_attachments_incident_id ON public.log_attachments (incident_id);
CREATE INDEX IF NOT EXISTS idx_log_attachments_cctv_request_id ON public.log_attachments (cctv_request_id);
CREATE INDEX IF NOT EXISTS idx_log_attachments_public_report_id ON public.log_attachments (public_report_id);

-- 3. Update Check Constraint Safely
ALTER TABLE public.log_attachments DROP CONSTRAINT IF EXISTS check_attachment_parent;
ALTER TABLE public.log_attachments ADD CONSTRAINT check_attachment_parent CHECK (
    entry_id IS NOT NULL OR 
    trip_id IS NOT NULL OR 
    incident_id IS NOT NULL OR 
    cctv_request_id IS NOT NULL OR 
    public_report_id IS NOT NULL
);

-- 4. Enable Authenticated / Citizen Uploads for attachments
DROP POLICY IF EXISTS "attachments_insert_all_authenticated" ON public.log_attachments;
CREATE POLICY "attachments_insert_all_authenticated" ON public.log_attachments
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "attachments_select_all_authenticated" ON public.log_attachments;
CREATE POLICY "attachments_select_all_authenticated" ON public.log_attachments
    FOR SELECT TO authenticated
    USING (true);

COMMIT;
