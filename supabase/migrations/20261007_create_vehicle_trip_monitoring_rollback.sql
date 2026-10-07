-- ==============================================================================
-- ROLLBACK SCRIPT: VEHICLE TRIP MONITORING
-- ==============================================================================
DROP TRIGGER IF EXISTS trg_trip_stop_log ON public.trip_stops;
DROP FUNCTION IF EXISTS public.trg_trip_stop_log_func();
DROP TRIGGER IF EXISTS trg_vehicle_trip_lifecycle ON public.vehicle_trips;
DROP FUNCTION IF EXISTS public.trg_vehicle_trip_lifecycle_func();
DROP TABLE IF EXISTS public.trip_stops CASCADE;
DROP TABLE IF EXISTS public.trip_passengers CASCADE;
DROP TABLE IF EXISTS public.vehicle_trips CASCADE;
DROP TABLE IF EXISTS public.vehicles CASCADE;
NOTIFY pgrst, 'reload schema';
