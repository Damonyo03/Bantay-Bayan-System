-- ==============================================================================
-- BANTAY BAYAN: VEHICLE CUSTOM FIELDS & ADMIN CRUD SUPPORT
-- Allows dynamic admin customization of vehicles (photos, color, model, notes, etc.)
-- Idempotent & Non-Destructive
-- ==============================================================================

-- 1. Add Custom Dynamic Fields to public.vehicles
ALTER TABLE public.vehicles
    ADD COLUMN IF NOT EXISTS color TEXT,
    ADD COLUMN IF NOT EXISTS model TEXT,
    ADD COLUMN IF NOT EXISTS year TEXT,
    ADD COLUMN IF NOT EXISTS fuel_type TEXT,
    ADD COLUMN IF NOT EXISTS image_url TEXT,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Patrol Vehicle';

-- 2. Add Insert and Delete RLS Policies for Staff on public.vehicles
DROP POLICY IF EXISTS "vehicles_insert_staff" ON public.vehicles;
CREATE POLICY "vehicles_insert_staff"
    ON public.vehicles FOR INSERT
    TO authenticated
    WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "vehicles_delete_staff" ON public.vehicles;
CREATE POLICY "vehicles_delete_staff"
    ON public.vehicles FOR DELETE
    TO authenticated
    USING (public.is_staff());

-- 3. Create Storage Bucket for vehicle photos (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'vehicle-photos',
    'vehicle-photos',
    true,
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

-- 4. Storage Policies for vehicle-photos Bucket
DROP POLICY IF EXISTS "vehicle_photos_public_read" ON storage.objects;
CREATE POLICY "vehicle_photos_public_read"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'vehicle-photos');

DROP POLICY IF EXISTS "vehicle_photos_staff_upload" ON storage.objects;
CREATE POLICY "vehicle_photos_staff_upload"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'vehicle-photos'
        AND public.is_staff()
    );

DROP POLICY IF EXISTS "vehicle_photos_staff_update" ON storage.objects;
CREATE POLICY "vehicle_photos_staff_update"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'vehicle-photos' AND public.is_staff())
    WITH CHECK (bucket_id = 'vehicle-photos' AND public.is_staff());

DROP POLICY IF EXISTS "vehicle_photos_staff_delete" ON storage.objects;
CREATE POLICY "vehicle_photos_staff_delete"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'vehicle-photos' AND public.is_staff());

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
