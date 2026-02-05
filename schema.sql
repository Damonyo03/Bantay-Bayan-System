
-- ==========================================
-- BANTAY BAYAN: RLS FIXES (PROFILES & STORAGE)
-- Run this in Supabase SQL Editor
-- ==========================================

-- 1. PROFILES TABLE POLICIES
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Add missing columns to prevent schema errors
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS preferred_shift text DEFAULT '1st',
ADD COLUMN IF NOT EXISTS preferred_day_off text DEFAULT 'Sunday';

-- Drop potentially conflicting policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Update own profile or Supervisor update" ON profiles;

-- Policy: Everyone can view profiles (Essential for .select() to return data after update)
CREATE POLICY "Public profiles are viewable by everyone" 
ON profiles FOR SELECT 
USING ( true );

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING ( auth.uid() = id )
WITH CHECK ( auth.uid() = id );

-- Policy: Supervisors can update any profile (Avoid recursion by using auth.jwt() if possible, but subquery works in PG)
CREATE POLICY "Supervisors can update any profile" 
ON profiles FOR UPDATE 
USING ( 
  exists (select 1 from profiles where id = auth.uid() and role = 'supervisor')
);

-- 2. STORAGE POLICIES (AVATARS)
-- Ensure bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies
DROP POLICY IF EXISTS "Avatar Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Avatar User Manage" ON storage.objects;
DROP POLICY IF EXISTS "Avatar Auth Upload" ON storage.objects;
DROP POLICY IF EXISTS "Avatar Auth Update" ON storage.objects;

-- Policy: Public Read Access
CREATE POLICY "Avatar Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- Policy: Authenticated User Full Access to Own Folder (userId/*)
CREATE POLICY "Avatar User Manage"
ON storage.objects FOR ALL
USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
