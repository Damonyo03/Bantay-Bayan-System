
-- ==============================================================================
-- MIGRATION SCRIPT: FIX SCHEMA CACHE ERROR
-- Run this in your Supabase SQL Editor (Table Editor -> SQL Query)
-- ==============================================================================

-- 1. Add missing columns safely
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS preferred_shift text DEFAULT '1st',
ADD COLUMN IF NOT EXISTS preferred_day_off text DEFAULT 'Sunday';

-- 2. Force PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';
