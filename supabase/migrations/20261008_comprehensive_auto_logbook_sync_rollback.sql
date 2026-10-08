-- Rollback Migration: 20261008_comprehensive_auto_logbook_sync_rollback.sql

BEGIN;

DROP TRIGGER IF EXISTS trg_auto_log_incidents ON public.incidents;
DROP TRIGGER IF EXISTS trg_auto_log_cctv ON public.cctv_requests;
DROP TRIGGER IF EXISTS trg_auto_log_assets ON public.asset_requests;
DROP TRIGGER IF EXISTS trg_auto_log_public_reports ON public.public_reports;
DROP TRIGGER IF EXISTS trg_auto_log_dispatch ON public.dispatch_logs;
DROP TRIGGER IF EXISTS trg_vehicle_trip_lifecycle ON public.vehicle_trips;
DROP TRIGGER IF EXISTS trg_trip_stop_log ON public.trip_stops;

DROP FUNCTION IF EXISTS public.trg_auto_log_event_func();

COMMIT;
