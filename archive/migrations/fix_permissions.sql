
-- FIX PERMISSIONS FOR SUPERVISORS
-- Run this in Supabase SQL Editor

-- 1. Enable RLS on incidents table if not already enabled
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing update policy if it exists to avoid conflict
DROP POLICY IF EXISTS "Supervisors can update incidents" ON incidents;

-- 3. Create Policy: Supervisors can update any incident
CREATE POLICY "Supervisors can update incidents"
ON incidents FOR UPDATE
USING (
  exists (select 1 from profiles where id = auth.uid() and role = 'supervisor')
)
WITH CHECK (
  exists (select 1 from profiles where id = auth.uid() and role = 'supervisor')
);

-- 4. Create Policy: Everyone can view incidents
DROP POLICY IF EXISTS "Everyone can view incidents" ON incidents;
CREATE POLICY "Everyone can view incidents"
ON incidents FOR SELECT
USING ( true );

-- 5. Force schema cache reload
NOTIFY pgrst, 'reload schema';
