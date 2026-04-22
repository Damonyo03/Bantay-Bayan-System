-- ==========================================
-- BANTAY BAYAN: RESIDENT REGISTRATION SCHEMA (V2)
-- ==========================================

-- 1. Create custom enum for account status
DO $$ BEGIN
    CREATE TYPE registration_status AS ENUM ('pending', 'active', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create the users table
CREATE TABLE IF NOT EXISTS public.users (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    first_name text NOT NULL,
    last_name text NOT NULL,
    address text NOT NULL,
    contact_number text UNIQUE NOT NULL,
    password_hash text NOT NULL,
    valid_id_url text, -- This stores the file path (e.g., 'ids/09123456789.jpg')
    status registration_status DEFAULT 'pending',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 3. Storage Setup: Identity IDs
-- Create a PRIVATE bucket for sensitive ID documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('identity-docs', 'identity-docs', false)
ON CONFLICT (id) DO NOTHING;

-- 4. RLS Policies for Storage
-- Allow anyone to upload (registrants)
CREATE POLICY "Enable upload for all" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'identity-docs');

-- Allow only service_role (Admin Action) to select/read
-- Note: We use Signed URLs for Admin viewing, so the bucket remains private.
CREATE POLICY "Admins can view private IDs" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'identity-docs' AND (auth.role() = 'service_role'));
