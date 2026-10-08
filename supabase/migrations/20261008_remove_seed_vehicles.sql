-- Migration: 20261008_remove_seed_vehicles.sql
-- Description: Clean up pre-seeded default vehicles and initial test trips so fleet monitoring starts with a clean slate for admin registration.

BEGIN;

-- 1. Remove any mock / seed trip records safely to prevent FK constraint errors
DELETE FROM public.trip_passengers 
WHERE trip_id IN (SELECT id FROM public.vehicle_trips);

DELETE FROM public.trip_stops 
WHERE trip_id IN (SELECT id FROM public.vehicle_trips);

DELETE FROM public.vehicle_trips;

-- 2. Remove all existing pre-seeded vehicles from public.vehicles
DELETE FROM public.vehicles;

COMMIT;
