-- ==============================================================================
-- MIGRATION: 20261007_create_logbook_extras.sql
-- Description: Creates shift_handovers table with RLS, indices, auto-logging
--              triggers, and Supabase Realtime publication.
-- ==============================================================================

-- 1. Create shift_handovers table
CREATE TABLE IF NOT EXISTS public.shift_handovers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outgoing_user UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    outgoing_name TEXT NOT NULL,
    incoming_user UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    incoming_name TEXT,
    shift_name TEXT NOT NULL DEFAULT 'Day Shift',
    notes TEXT NOT NULL,
    pending_items TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    acknowledged_by_name TEXT
);

-- 2. Indices for fast querying
CREATE INDEX IF NOT EXISTS idx_shift_handovers_created_at 
    ON public.shift_handovers(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shift_handovers_acknowledged_at 
    ON public.shift_handovers(acknowledged_at);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.shift_handovers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to prevent duplicate policy errors
DROP POLICY IF EXISTS "Allow authenticated users to view shift handovers" ON public.shift_handovers;
DROP POLICY IF EXISTS "Allow authenticated users to create shift handovers" ON public.shift_handovers;
DROP POLICY IF EXISTS "Allow authenticated users to acknowledge shift handovers" ON public.shift_handovers;

-- Read policy
CREATE POLICY "Allow authenticated users to view shift handovers"
    ON public.shift_handovers
    FOR SELECT
    TO authenticated
    USING (true);

-- Insert policy (outgoing officer)
CREATE POLICY "Allow authenticated users to create shift handovers"
    ON public.shift_handovers
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Update policy (incoming officer acknowledging handover)
CREATE POLICY "Allow authenticated users to acknowledge shift handovers"
    ON public.shift_handovers
    FOR UPDATE
    TO authenticated
    USING (acknowledged_at IS NULL)
    WITH CHECK (true);

-- 4. Auto-logging Trigger for Shift Handovers
CREATE OR REPLACE FUNCTION public.fn_log_shift_handover_event()
RETURNS TRIGGER AS $$
DECLARE
    v_title TEXT;
    v_user UUID;
BEGIN
    v_user := auth.uid();

    -- CASE A: New Handover Created
    IF TG_OP = 'INSERT' THEN
        v_title := format('Shift handover logged by %s (%s)', NEW.outgoing_name, NEW.shift_name);
        
        BEGIN
            PERFORM public.log_event(
                p_category := 'handover'::public.logbook_category,
                p_action := 'created',
                p_title := v_title,
                p_details := jsonb_build_object(
                    'shift_name', NEW.shift_name,
                    'outgoing_officer', NEW.outgoing_name,
                    'incoming_target', COALESCE(NEW.incoming_name, 'Unassigned'),
                    'notes', NEW.notes,
                    'pending_items', NEW.pending_items
                ),
                p_reference_type := 'shift_handover',
                p_reference_id := NEW.id,
                p_reported_by := COALESCE(v_user, NEW.outgoing_user),
                p_source_module := 'shift_handovers'
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Logbook trigger failed for shift handover insert: %', SQLERRM;
        END;

    -- CASE B: Handover Acknowledged
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.acknowledged_at IS NULL AND NEW.acknowledged_at IS NOT NULL THEN
            v_title := format('Shift handover acknowledged by %s', COALESCE(NEW.acknowledged_by_name, NEW.incoming_name, 'Relieving Officer'));
            
            BEGIN
                PERFORM public.log_event(
                    p_category := 'handover'::public.logbook_category,
                    p_action := 'acknowledged',
                    p_title := v_title,
                    p_details := jsonb_build_object(
                        'shift_name', NEW.shift_name,
                        'outgoing_officer', NEW.outgoing_name,
                        'acknowledged_by', COALESCE(NEW.acknowledged_by_name, NEW.incoming_name, 'Relieving Officer'),
                        'acknowledged_at', NEW.acknowledged_at
                    ),
                    p_reference_type := 'shift_handover',
                    p_reference_id := NEW.id,
                    p_reported_by := COALESCE(v_user, NEW.acknowledged_by),
                    p_source_module := 'shift_handovers'
                );
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Logbook trigger failed for shift handover update: %', SQLERRM;
            END;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trg_log_shift_handover_event ON public.shift_handovers;

-- Create trigger on shift_handovers
CREATE TRIGGER trg_log_shift_handover_event
    AFTER INSERT OR UPDATE ON public.shift_handovers
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_log_shift_handover_event();

-- 5. Add shift_handovers to Realtime Publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'shift_handovers'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.shift_handovers;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Realtime publication configuration skipped: %', SQLERRM;
END $$;
