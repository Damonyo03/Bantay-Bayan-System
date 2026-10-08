-- ============================================================================
-- Migration: Add Guest Reports Support with Real Name & Contact
-- ============================================================================

BEGIN;

-- 1. Add Guest Report Columns to public.public_reports
ALTER TABLE public.public_reports
    ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS guest_name TEXT,
    ADD COLUMN IF NOT EXISTS guest_contact TEXT,
    ADD COLUMN IF NOT EXISTS guest_email TEXT;

-- 2. Make submitted_by column nullable for guest reports
ALTER TABLE public.public_reports
    ALTER COLUMN submitted_by DROP NOT NULL;

-- 3. Create Index for Guest Reports Filtering
CREATE INDEX IF NOT EXISTS idx_public_reports_is_guest ON public.public_reports (is_guest);

-- 4. Enable Anon and Authenticated RLS Insert for public_reports
DROP POLICY IF EXISTS "public_reports_insert_all" ON public.public_reports;
CREATE POLICY "public_reports_insert_all" ON public.public_reports
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

-- 5. Enable Anon Insert for log_attachments when attached to public_reports
DROP POLICY IF EXISTS "attachments_insert_anon_public_report" ON public.log_attachments;
CREATE POLICY "attachments_insert_anon_public_report" ON public.log_attachments
    FOR INSERT TO anon, authenticated
    WITH CHECK (public_report_id IS NOT NULL OR auth.uid() IS NOT NULL);

-- 6. Enable Anon and Authenticated Select for log_attachments linked to public reports
DROP POLICY IF EXISTS "attachments_select_public_report" ON public.log_attachments;
CREATE POLICY "attachments_select_public_report" ON public.log_attachments
    FOR SELECT TO anon, authenticated
    USING (public_report_id IS NOT NULL OR auth.uid() IS NOT NULL);

-- 7. Update storage policy for logbook-attachments to permit guest upload
DROP POLICY IF EXISTS "attachments_storage_guest_insert" ON storage.objects;
CREATE POLICY "attachments_storage_guest_insert" ON storage.objects
    FOR INSERT TO anon, authenticated
    WITH CHECK (bucket_id = 'logbook-attachments');

COMMIT;
