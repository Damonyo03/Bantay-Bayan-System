-- Migration: 20261008_create_vehicle_qr_codes.sql
-- Description: Add qr_code_token column and index to public.vehicles table for opaque QR vehicle scanning
-- Idempotent and self-healing if public.vehicles was not yet created

-- 1. Ensure public.vehicles table exists
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    plate_number TEXT NOT NULL,
    type TEXT DEFAULT 'Patrol Vehicle',
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'on_trip', 'maintenance', 'decommissioned')),
    qr_code_token TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Add qr_code_token column if table existed without it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'vehicles' 
          AND column_name = 'qr_code_token'
    ) THEN
        ALTER TABLE public.vehicles 
        ADD COLUMN qr_code_token TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'vehicles' 
          AND column_name = 'type'
    ) THEN
        ALTER TABLE public.vehicles 
        ADD COLUMN type TEXT DEFAULT 'Patrol Vehicle';
    END IF;
END $$;

-- 3. Seed default 15 Barangay vehicles if the table was just initialized
INSERT INTO public.vehicles (name, plate_number, status, qr_code_token) VALUES
    ('Trimo #1', '1312 - 0438584', 'available', gen_random_uuid()::TEXT),
    ('Trimo #2', '1312 - 0438585', 'available', gen_random_uuid()::TEXT),
    ('Trimo #3', 'For Registration', 'available', gen_random_uuid()::TEXT),
    ('Transformative #1', 'SNN 3519', 'available', gen_random_uuid()::TEXT),
    ('Transformative #2', 'SNN 2501', 'available', gen_random_uuid()::TEXT),
    ('APY', 'SNN 1977', 'available', gen_random_uuid()::TEXT),
    ('L300', '1312 - 0438510', 'available', gen_random_uuid()::TEXT),
    ('Traviz', 'SNA 5654', 'available', gen_random_uuid()::TEXT),
    ('Ambulance (Innova)', '1301 - 2076919', 'available', gen_random_uuid()::TEXT),
    ('Red Plate', 'SND 7512', 'available', gen_random_uuid()::TEXT),
    ('Harabas', 'SNA 8450', 'available', gen_random_uuid()::TEXT),
    ('Revo', 'XJF 830', 'available', gen_random_uuid()::TEXT),
    ('New Ambulance', 'CNB 1823', 'available', gen_random_uuid()::TEXT),
    ('Foot Patrol / Walking', 'N/A', 'available', gen_random_uuid()::TEXT),
    ('Command Post', 'N/A', 'available', gen_random_uuid()::TEXT)
ON CONFLICT (name) DO NOTHING;

-- 4. Backfill any existing vehicle records that have NULL qr_code_token
UPDATE public.vehicles
SET qr_code_token = gen_random_uuid()::TEXT
WHERE qr_code_token IS NULL;

-- 5. Create index on qr_code_token for fast lookup
CREATE INDEX IF NOT EXISTS idx_vehicles_qr_code_token ON public.vehicles(qr_code_token);
