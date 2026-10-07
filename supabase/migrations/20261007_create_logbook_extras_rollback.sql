-- ==============================================================================
-- ROLLBACK SCRIPT: 20261007_create_logbook_extras_rollback.sql
-- Description: Safely removes shift_handovers table, trigger, and functions.
-- ==============================================================================

-- 1. Remove from Realtime publication
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'shift_handovers'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.shift_handovers;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 2. Drop Trigger
DROP TRIGGER IF EXISTS trg_log_shift_handover_event ON public.shift_handovers;

-- 3. Drop Trigger Function
DROP FUNCTION IF EXISTS public.fn_log_shift_handover_event();

-- 4. Drop Policies & Table
DROP POLICY IF EXISTS "Allow authenticated users to view shift handovers" ON public.shift_handovers;
DROP POLICY IF EXISTS "Allow authenticated users to create shift handovers" ON public.shift_handovers;
DROP POLICY IF EXISTS "Allow authenticated users to acknowledge shift handovers" ON public.shift_handovers;

DROP TABLE IF EXISTS public.shift_handovers CASCADE;
