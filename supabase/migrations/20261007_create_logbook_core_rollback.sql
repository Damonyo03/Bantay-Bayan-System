-- ==============================================================================
-- ROLLBACK SCRIPT: LOGBOOK CORE MODULE
-- ==============================================================================
DROP FUNCTION IF EXISTS public.log_event(public.logbook_category, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, UUID);
DROP TABLE IF EXISTS public.logbook_entries CASCADE;
DROP TYPE IF EXISTS public.logbook_category CASCADE;
NOTIFY pgrst, 'reload schema';
