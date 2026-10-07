-- ==============================================================================
-- BANTAY BAYAN: LOGBOOK CORE MODULE MIGRATION
-- Phase 1: Immutable Append-Only Electronic Logbook
-- Idempotent & Non-Destructive
-- ==============================================================================

-- 1. Create Logbook Category Enum (if not exists)
DO $$ BEGIN
    CREATE TYPE public.logbook_category AS ENUM (
        'cctv_request', 
        'blotter', 
        'vehicle', 
        'asset', 
        'queue', 
        'incident', 
        'handover', 
        'correction', 
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Ensure all enum values exist
ALTER TYPE public.logbook_category ADD VALUE IF NOT EXISTS 'cctv_request';
ALTER TYPE public.logbook_category ADD VALUE IF NOT EXISTS 'blotter';
ALTER TYPE public.logbook_category ADD VALUE IF NOT EXISTS 'vehicle';
ALTER TYPE public.logbook_category ADD VALUE IF NOT EXISTS 'asset';
ALTER TYPE public.logbook_category ADD VALUE IF NOT EXISTS 'queue';
ALTER TYPE public.logbook_category ADD VALUE IF NOT EXISTS 'incident';
ALTER TYPE public.logbook_category ADD VALUE IF NOT EXISTS 'handover';
ALTER TYPE public.logbook_category ADD VALUE IF NOT EXISTS 'correction';
ALTER TYPE public.logbook_category ADD VALUE IF NOT EXISTS 'other';

-- 2. Create logbook_entries Table
CREATE TABLE IF NOT EXISTS public.logbook_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    reported_by UUID DEFAULT auth.uid() REFERENCES public.profiles(id) ON UPDATE CASCADE ON DELETE SET NULL,
    reporter_name TEXT NOT NULL,
    reporter_role TEXT NOT NULL,
    category public.logbook_category NOT NULL DEFAULT 'other',
    action TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    reference_type TEXT,
    reference_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    corrects_entry_id UUID REFERENCES public.logbook_entries(id) ON DELETE SET NULL
);

-- Indexing for fast chronological grouping and category filtering
CREATE INDEX IF NOT EXISTS idx_logbook_created_at ON public.logbook_entries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logbook_category ON public.logbook_entries (category);
CREATE INDEX IF NOT EXISTS idx_logbook_reported_by ON public.logbook_entries (reported_by);
CREATE INDEX IF NOT EXISTS idx_logbook_reference ON public.logbook_entries (reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_logbook_corrects_id ON public.logbook_entries (corrects_entry_id);

-- 3. Row Level Security (RLS)
ALTER TABLE public.logbook_entries ENABLE ROW LEVEL SECURITY;

-- SELECT Policy: Staff only
DROP POLICY IF EXISTS "logbook_select_staff_only" ON public.logbook_entries;
CREATE POLICY "logbook_select_staff_only"
    ON public.logbook_entries FOR SELECT
    USING (public.is_staff());

-- INSERT Policy: Staff only, reported_by MUST match calling auth.uid()
DROP POLICY IF EXISTS "logbook_insert_staff_only" ON public.logbook_entries;
CREATE POLICY "logbook_insert_staff_only"
    ON public.logbook_entries FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_staff() 
        AND auth.uid() = reported_by
    );

-- STRICT IMMUTABILITY: Deny UPDATE and DELETE for ALL users including admins
DROP POLICY IF EXISTS "logbook_deny_update" ON public.logbook_entries;
CREATE POLICY "logbook_deny_update"
    ON public.logbook_entries FOR UPDATE
    USING (false)
    WITH CHECK (false);

DROP POLICY IF EXISTS "logbook_deny_delete" ON public.logbook_entries;
CREATE POLICY "logbook_deny_delete"
    ON public.logbook_entries FOR DELETE
    USING (false);

-- 4. Server-Side SQL Function: log_event(...)
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

GRANT EXECUTE ON FUNCTION public.log_event(
    public.logbook_category, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, UUID
) TO authenticated;

-- Refresh Schema Cache
NOTIFY pgrst, 'reload schema';
