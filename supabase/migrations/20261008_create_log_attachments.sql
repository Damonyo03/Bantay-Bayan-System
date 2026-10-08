-- ==============================================================================
-- BANTAY BAYAN: LOGBOOK & VEHICLE PHOTO ATTACHMENTS MIGRATION
-- Idempotent & Non-Destructive
-- ==============================================================================

-- 1. Create log_attachments Table
CREATE TABLE IF NOT EXISTS public.log_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entry_id UUID REFERENCES public.logbook_entries(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES public.vehicle_trips(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    file_name TEXT,
    file_size INTEGER,
    mime_type TEXT DEFAULT 'image/jpeg',
    uploaded_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT check_attachment_parent CHECK (entry_id IS NOT NULL OR trip_id IS NOT NULL)
);

-- 2. Create Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_log_attachments_entry_id ON public.log_attachments (entry_id);
CREATE INDEX IF NOT EXISTS idx_log_attachments_trip_id ON public.log_attachments (trip_id);
CREATE INDEX IF NOT EXISTS idx_log_attachments_created_at ON public.log_attachments (created_at DESC);

-- 3. Enable RLS on log_attachments Table
ALTER TABLE public.log_attachments ENABLE ROW LEVEL SECURITY;

-- Helper function fallback for is_staff
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('barangay_captain', 'barangay_secretary', 'barangay_kagawad', 'supervisor', 'bantay_bayan', 'developer')
    );
END;
$$;

DROP POLICY IF EXISTS "attachments_select_staff" ON public.log_attachments;
CREATE POLICY "attachments_select_staff" ON public.log_attachments
    FOR SELECT TO authenticated
    USING (public.is_staff());

DROP POLICY IF EXISTS "attachments_insert_staff" ON public.log_attachments;
CREATE POLICY "attachments_insert_staff" ON public.log_attachments
    FOR INSERT TO authenticated
    WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "attachments_delete_staff" ON public.log_attachments;
CREATE POLICY "attachments_delete_staff" ON public.log_attachments
    FOR DELETE TO authenticated
    USING (public.is_staff());

-- 4. Create Private Storage Bucket for Attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('logbook-attachments', 'logbook-attachments', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- 5. Storage RLS Policies for logbook-attachments Bucket
DROP POLICY IF EXISTS "storage_attachments_select" ON storage.objects;
CREATE POLICY "storage_attachments_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'logbook-attachments' AND public.is_staff());

DROP POLICY IF EXISTS "storage_attachments_insert" ON storage.objects;
CREATE POLICY "storage_attachments_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'logbook-attachments' AND public.is_staff());

DROP POLICY IF EXISTS "storage_attachments_delete" ON storage.objects;
CREATE POLICY "storage_attachments_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'logbook-attachments' AND public.is_staff());

-- 6. Trigger to auto-log attachment upload to logbook
CREATE OR REPLACE FUNCTION public.trg_log_attachment_uploaded_func()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    BEGIN
        IF NEW.entry_id IS NOT NULL THEN
            PERFORM public.log_event(
                'other'::public.logbook_category,
                'attachment_added',
                'Photo Attached to Logbook Entry',
                'A photo attachment (' || COALESCE(NEW.file_name, 'photo.jpg') || ') was attached.',
                'log_attachment',
                NEW.id::text,
                jsonb_build_object('entry_id', NEW.entry_id, 'file_name', NEW.file_name)
            );
        ELSIF NEW.trip_id IS NOT NULL THEN
            PERFORM public.log_event(
                'vehicle'::public.logbook_category,
                'trip_photo_added',
                'Photo Attached to Vehicle Trip',
                'A vehicle verification photo (' || COALESCE(NEW.file_name, 'photo.jpg') || ') was recorded.',
                'vehicle_trip',
                NEW.trip_id::text,
                jsonb_build_object('trip_id', NEW.trip_id, 'file_name', NEW.file_name)
            );
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_attachment_uploaded ON public.log_attachments;
CREATE TRIGGER trg_log_attachment_uploaded
    AFTER INSERT ON public.log_attachments
    FOR EACH ROW EXECUTE FUNCTION public.trg_log_attachment_uploaded_func();
