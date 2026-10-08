-- ==============================================================================
-- BANTAY BAYAN: ROLLBACK FOR VEHICLE CUSTOM FIELDS & ADMIN CRUD SUPPORT
-- ==============================================================================

-- 1. Drop Storage Policies
DROP POLICY IF EXISTS "vehicle_photos_public_read" ON storage.objects;
DROP POLICY IF EXISTS "vehicle_photos_staff_upload" ON storage.objects;
DROP POLICY IF EXISTS "vehicle_photos_staff_update" ON storage.objects;
DROP POLICY IF EXISTS "vehicle_photos_staff_delete" ON storage.objects;

-- 2. Drop RLS Policies
DROP POLICY IF EXISTS "vehicles_insert_staff" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_delete_staff" ON public.vehicles;

-- 3. Drop Custom Columns
ALTER TABLE public.vehicles
    DROP COLUMN IF EXISTS color,
    DROP COLUMN IF EXISTS model,
    DROP COLUMN IF EXISTS year,
    DROP COLUMN IF EXISTS fuel_type,
    DROP COLUMN IF EXISTS image_url,
    DROP COLUMN IF EXISTS notes;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
