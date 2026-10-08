-- ============================================================================
-- Rollback Migration: Add Guest Reports Support
-- ============================================================================

BEGIN;

-- 1. Remove storage policy for guest insert
DROP POLICY IF EXISTS "attachments_storage_guest_insert" ON storage.objects;

-- 2. Restore attachments select and insert policies
DROP POLICY IF EXISTS "attachments_select_public_report" ON public.log_attachments;
DROP POLICY IF EXISTS "attachments_insert_anon_public_report" ON public.log_attachments;

-- 3. Restore public_reports insert policy
DROP POLICY IF EXISTS "public_reports_insert_all" ON public.public_reports;

-- 4. Drop Index
DROP INDEX IF EXISTS public.idx_public_reports_is_guest;

-- 5. Drop columns
ALTER TABLE public.public_reports
    DROP COLUMN IF EXISTS is_guest,
    DROP COLUMN IF EXISTS guest_name,
    DROP COLUMN IF EXISTS guest_contact,
    DROP COLUMN IF EXISTS guest_email;

COMMIT;
