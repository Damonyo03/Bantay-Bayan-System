-- Rollback: 20261008_create_vehicle_qr_codes_rollback.sql
-- Description: Drop qr_code_token column and index from public.vehicles

DROP INDEX IF EXISTS public.idx_vehicles_qr_code_token;

ALTER TABLE public.vehicles 
DROP COLUMN IF EXISTS qr_code_token;
