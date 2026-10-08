-- Rollback Migration: 20261008_expand_attachments_to_all_reports_rollback.sql

BEGIN;

DROP INDEX IF EXISTS public.idx_log_attachments_incident_id;
DROP INDEX IF EXISTS public.idx_log_attachments_cctv_request_id;
DROP INDEX IF EXISTS public.idx_log_attachments_public_report_id;

ALTER TABLE public.log_attachments DROP CONSTRAINT IF EXISTS check_attachment_parent;
ALTER TABLE public.log_attachments ADD CONSTRAINT check_attachment_parent CHECK (
    entry_id IS NOT NULL OR trip_id IS NOT NULL
);

ALTER TABLE public.log_attachments
    DROP COLUMN IF EXISTS incident_id,
    DROP COLUMN IF EXISTS cctv_request_id,
    DROP COLUMN IF EXISTS public_report_id;

COMMIT;
