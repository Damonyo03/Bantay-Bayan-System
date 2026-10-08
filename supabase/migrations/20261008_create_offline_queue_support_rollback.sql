-- ==============================================================================
-- BANTAY BAYAN: ROLLBACK FOR OFFLINE QUEUE & SYNC SUPPORT
-- ==============================================================================

-- 1. Drop Indices
DROP INDEX IF EXISTS public.idx_logbook_entries_idempotency;
DROP INDEX IF EXISTS public.idx_logbook_entries_client_timestamp;
DROP INDEX IF EXISTS public.idx_vehicle_trips_idempotency;
DROP INDEX IF EXISTS public.idx_vehicle_trips_client_timestamp;
DROP INDEX IF EXISTS public.idx_trip_stops_idempotency;
DROP INDEX IF EXISTS public.idx_shift_handovers_idempotency;

-- 2. Drop Columns
ALTER TABLE public.logbook_entries
    DROP COLUMN IF EXISTS client_timestamp,
    DROP COLUMN IF EXISTS idempotency_key;

ALTER TABLE public.vehicle_trips
    DROP COLUMN IF EXISTS client_timestamp,
    DROP COLUMN IF EXISTS idempotency_key;

ALTER TABLE public.trip_stops
    DROP COLUMN IF EXISTS client_timestamp,
    DROP COLUMN IF EXISTS idempotency_key;

ALTER TABLE public.shift_handovers
    DROP COLUMN IF EXISTS client_timestamp,
    DROP COLUMN IF EXISTS idempotency_key;

-- 3. Restore log_event function without extra parameters
CREATE OR REPLACE FUNCTION public.log_event(
    p_category public.logbook_category,
    p_action TEXT,
    p_title TEXT,
    p_description TEXT,
    p_reference_type TEXT DEFAULT NULL,
    p_reference_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_corrects_entry_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_name TEXT;
    v_caller_role TEXT;
    v_new_id UUID;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller must be authenticated.' USING ERRCODE = '42501';
    END IF;

    SELECT full_name, role::text INTO v_caller_name, v_caller_role
    FROM public.profiles
    WHERE id = v_caller_id;

    IF v_caller_name IS NULL THEN
        v_caller_name := 'System / Staff';
        v_caller_role := 'staff';
    END IF;

    IF NOT public.is_staff() THEN
        RAISE EXCEPTION 'Unauthorized: Only active staff may write to the logbook.' USING ERRCODE = '42501';
    END IF;

    INSERT INTO public.logbook_entries (
        reported_by,
        reporter_name,
        reporter_role,
        category,
        action,
        title,
        description,
        reference_type,
        reference_id,
        metadata,
        corrects_entry_id
    ) VALUES (
        v_caller_id,
        v_caller_name,
        v_caller_role,
        p_category,
        p_action,
        p_title,
        p_description,
        p_reference_type,
        p_reference_id,
        COALESCE(p_metadata, '{}'::jsonb),
        p_corrects_entry_id
    )
    RETURNING id INTO v_new_id;

    RETURN v_new_id;
END;
$$;

NOTIFY pgrst, 'reload schema';
