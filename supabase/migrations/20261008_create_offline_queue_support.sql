-- ==============================================================================
-- BANTAY BAYAN: OFFLINE QUEUE & SYNC SUPPORT MIGRATION
-- Adds client_timestamp, idempotency_key, and conflict/duplicate handling
-- Idempotent & Non-Destructive
-- ==============================================================================

-- 1. Add client_timestamp and idempotency_key columns to logbook_entries
ALTER TABLE public.logbook_entries 
    ADD COLUMN IF NOT EXISTS client_timestamp TIMESTAMPTZ DEFAULT now(),
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_logbook_entries_idempotency 
    ON public.logbook_entries (idempotency_key) 
    WHERE (idempotency_key IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_logbook_entries_client_timestamp 
    ON public.logbook_entries (client_timestamp DESC);

-- 2. Add client_timestamp and idempotency_key columns to vehicle_trips
ALTER TABLE public.vehicle_trips 
    ADD COLUMN IF NOT EXISTS client_timestamp TIMESTAMPTZ DEFAULT now(),
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_trips_idempotency 
    ON public.vehicle_trips (idempotency_key) 
    WHERE (idempotency_key IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_vehicle_trips_client_timestamp 
    ON public.vehicle_trips (client_timestamp DESC);

-- 3. Add client_timestamp and idempotency_key columns to trip_stops
ALTER TABLE public.trip_stops 
    ADD COLUMN IF NOT EXISTS client_timestamp TIMESTAMPTZ DEFAULT now(),
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_trip_stops_idempotency 
    ON public.trip_stops (idempotency_key) 
    WHERE (idempotency_key IS NOT NULL);

-- 4. Add client_timestamp and idempotency_key columns to shift_handovers
ALTER TABLE public.shift_handovers 
    ADD COLUMN IF NOT EXISTS client_timestamp TIMESTAMPTZ DEFAULT now(),
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_shift_handovers_idempotency 
    ON public.shift_handovers (idempotency_key) 
    WHERE (idempotency_key IS NOT NULL);

-- 5. Update/Enhance log_event RPC function to support client_timestamp & idempotency_key
CREATE OR REPLACE FUNCTION public.log_event(
    p_category public.logbook_category,
    p_action TEXT,
    p_title TEXT,
    p_description TEXT,
    p_reference_type TEXT DEFAULT NULL,
    p_reference_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_corrects_entry_id UUID DEFAULT NULL,
    p_client_timestamp TIMESTAMPTZ DEFAULT NULL,
    p_idempotency_key TEXT DEFAULT NULL
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
    v_existing_id UUID;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller must be authenticated.' USING ERRCODE = '42501';
    END IF;

    -- Duplicate prevention: Check if idempotency key was already recorded
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id INTO v_existing_id 
        FROM public.logbook_entries 
        WHERE idempotency_key = p_idempotency_key;

        IF v_existing_id IS NOT NULL THEN
            RETURN v_existing_id;
        END IF;
    END IF;

    -- Lookup snapshot from public.profiles
    SELECT full_name, role::text INTO v_caller_name, v_caller_role
    FROM public.profiles
    WHERE id = v_caller_id;

    IF v_caller_name IS NULL THEN
        v_caller_name := 'System / Staff';
        v_caller_role := 'staff';
    END IF;

    -- Ensure caller is active staff
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
        corrects_entry_id,
        client_timestamp,
        idempotency_key
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
        p_corrects_entry_id,
        COALESCE(p_client_timestamp, now()),
        p_idempotency_key
    )
    RETURNING id INTO v_new_id;

    RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_event(
    public.logbook_category, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, UUID, TIMESTAMPTZ, TEXT
) TO authenticated;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
