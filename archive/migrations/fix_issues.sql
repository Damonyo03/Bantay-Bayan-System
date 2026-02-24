
-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. Ensure 'updated_at' column exists on incidents table (prevents code error)
ALTER TABLE public.incidents 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. Enable RLS on relevant tables
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_parties ENABLE ROW LEVEL SECURITY;

-- 3. INCIDENT POLICIES
-- Clear existing to avoid conflicts
DROP POLICY IF EXISTS "Supervisors can update incidents" ON incidents;
DROP POLICY IF EXISTS "Everyone can view incidents" ON incidents;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON incidents;

-- Policy: Everyone can read
CREATE POLICY "Everyone can view incidents"
ON public.incidents FOR SELECT
USING ( true );

-- Policy: Supervisors can update
CREATE POLICY "Supervisors can update incidents"
ON public.incidents FOR UPDATE
USING (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'supervisor')
)
WITH CHECK (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'supervisor')
);

-- Policy: Authenticated users can insert (for reporting)
CREATE POLICY "Enable insert for authenticated users only"
ON public.incidents FOR INSERT
WITH CHECK ( auth.role() = 'authenticated' );


-- 4. INCIDENT PARTIES POLICIES
-- Clear existing
DROP POLICY IF EXISTS "Public view parties" ON incident_parties;
DROP POLICY IF EXISTS "Auth insert parties" ON incident_parties;

-- Policy: Everyone can read parties
CREATE POLICY "Public view parties"
ON public.incident_parties FOR SELECT
USING ( true );

-- Policy: Authenticated users can insert parties
CREATE POLICY "Auth insert parties"
ON public.incident_parties FOR INSERT
WITH CHECK ( auth.role() = 'authenticated' );

-- 5. Force refresh
NOTIFY pgrst, 'reload schema';
