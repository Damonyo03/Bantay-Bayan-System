-- ==============================================================================
-- BANTAY BAYAN: EQUIPMENT MONITORING PHOTO VERIFICATION SCHEMA
-- Execute this in the Supabase SQL Editor to enable photo documentation for assets.
-- ==============================================================================

-- 1. ADD PHOTO URL COLUMNS TO ASSET REQUESTS
ALTER TABLE public.asset_requests ADD COLUMN IF NOT EXISTS release_photo_url text;
ALTER TABLE public.asset_requests ADD COLUMN IF NOT EXISTS return_photo_url text;

-- 2. CREATE STORAGE BUCKET FOR ASSETS
-- Note: 'public' is set to true so that links are accessible for the audit trail.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('assets', 'assets', true) 
ON CONFLICT (id) DO NOTHING;

-- 3. STORAGE SECURITY POLICIES
-- Allow public read access to asset photos
DROP POLICY IF EXISTS "Asset Photos Public Access" ON storage.objects;
CREATE POLICY "Asset Photos Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'assets');

-- Allow authenticated personnel to upload and manage asset photos
DROP POLICY IF EXISTS "Asset Photos Manage" ON storage.objects;
CREATE POLICY "Asset Photos Manage" ON storage.objects FOR ALL 
USING (bucket_id = 'assets' AND auth.role() = 'authenticated')
WITH CHECK (bucket_id = 'assets' AND auth.role() = 'authenticated');

-- 4. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
