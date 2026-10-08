-- ==============================================================================
-- BANTAY BAYAN: LOGBOOK & VEHICLE PHOTO ATTACHMENTS ROLLBACK
-- ==============================================================================

-- 1. Drop trigger & trigger function
DROP TRIGGER IF EXISTS trg_log_attachment_uploaded ON public.log_attachments;
DROP FUNCTION IF EXISTS public.trg_log_attachment_uploaded_func();

-- 2. Drop storage policies for logbook-attachments
DROP POLICY IF EXISTS "storage_attachments_select" ON storage.objects;
DROP POLICY IF EXISTS "storage_attachments_insert" ON storage.objects;
DROP POLICY IF EXISTS "storage_attachments_delete" ON storage.objects;

-- 3. Drop table RLS policies
DROP POLICY IF EXISTS "attachments_select_staff" ON public.log_attachments;
DROP POLICY IF EXISTS "attachments_insert_staff" ON public.log_attachments;
DROP POLICY IF EXISTS "attachments_delete_staff" ON public.log_attachments;

-- 4. Drop log_attachments table
DROP TABLE IF EXISTS public.log_attachments CASCADE;

-- Note: Storage buckets in Supabase are protected against direct SQL deletion.
-- If you wish to delete the 'logbook-attachments' bucket completely, please do so
-- via the Supabase Dashboard > Storage section.
