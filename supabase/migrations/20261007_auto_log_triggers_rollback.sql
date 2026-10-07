-- ==============================================================================
-- ROLLBACK SCRIPT: AUTO-LOGGING TRIGGERS
-- ==============================================================================
DROP TRIGGER IF EXISTS trg_auto_log_cctv ON public.cctv_requests;
DROP TRIGGER IF EXISTS trg_auto_log_incidents ON public.incidents;
DROP TRIGGER IF EXISTS trg_auto_log_assets ON public.asset_requests;
DROP TRIGGER IF EXISTS trg_auto_log_public_reports ON public.public_reports;
DROP TRIGGER IF EXISTS trg_auto_log_dispatch ON public.dispatch_logs;
DROP FUNCTION IF EXISTS public.trg_auto_log_event_func();
