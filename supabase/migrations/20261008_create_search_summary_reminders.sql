-- ==============================================================================
-- MIGRATION: 20261008_create_search_summary_reminders.sql
-- Description: Creates global_search RPC function (SECURITY INVOKER) and
--              system_alert_settings table for configurable reminder thresholds.
-- ==============================================================================

-- 1. Create global_search RPC function
-- Uses SECURITY INVOKER so queries strictly adhere to the executing user's RLS policies
CREATE OR REPLACE FUNCTION public.global_search(
    p_query TEXT,
    p_limit INT DEFAULT 25
)
RETURNS TABLE (
    id TEXT,
    type TEXT,
    title TEXT,
    subtitle TEXT,
    details TEXT,
    status TEXT,
    created_at TIMESTAMPTZ,
    url_path TEXT
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_clean_query TEXT;
BEGIN
    -- Return empty set for blank queries
    IF p_query IS NULL OR trim(p_query) = '' THEN
        RETURN;
    END IF;

    v_clean_query := '%' || trim(p_query) || '%';

    RETURN QUERY
    -- 1. Blotters / Incidents
    SELECT 
        i.id::TEXT AS id,
        'blotter' AS type,
        COALESCE(i.case_number, 'Blotter Case') || ' — ' || COALESCE(i.type, 'Incident') AS title,
        'Location: ' || COALESCE(i.location, 'N/A') || ' | Officer: ' || COALESCE(i.officer_name, 'N/A') AS subtitle,
        i.narrative AS details,
        i.status AS status,
        i.created_at AS created_at,
        '/dashboard' AS url_path
    FROM public.incidents i
    WHERE (
        i.case_number ILIKE v_clean_query
        OR i.type ILIKE v_clean_query
        OR i.narrative ILIKE v_clean_query
        OR i.location ILIKE v_clean_query
        OR i.officer_name ILIKE v_clean_query
    )

    UNION ALL

    -- 2. Operations Logbook Entries
    SELECT 
        l.id::TEXT AS id,
        'logbook' AS type,
        l.title AS title,
        'Category: ' || l.category::TEXT || ' | By: ' || COALESCE(l.reporter_name, 'System') AS subtitle,
        l.description AS details,
        l.action AS status,
        l.created_at AS created_at,
        '/logbook' AS url_path
    FROM public.logbook_entries l
    WHERE (
        l.title ILIKE v_clean_query
        OR l.description ILIKE v_clean_query
        OR l.reporter_name ILIKE v_clean_query
        OR l.category::TEXT ILIKE v_clean_query
        OR l.reference_id::TEXT ILIKE v_clean_query
    )

    UNION ALL

    -- 3. CCTV Requests
    SELECT 
        c.id::TEXT AS id,
        'cctv_request' AS type,
        'CCTV Request #' || COALESCE(c.request_number, c.id::TEXT) AS title,
        'Requester: ' || COALESCE(c.requester_name, 'N/A') || ' | Case: ' || COALESCE(c.incident_type, 'N/A') AS subtitle,
        'Purpose: ' || COALESCE(c.purpose, 'N/A') || ' | Location: ' || COALESCE(c.location, 'N/A') AS details,
        c.status AS status,
        c.created_at AS created_at,
        '/download-forms' AS url_path
    FROM public.cctv_requests c
    WHERE (
        c.request_number ILIKE v_clean_query
        OR c.requester_name ILIKE v_clean_query
        OR c.incident_type ILIKE v_clean_query
        OR c.purpose ILIKE v_clean_query
        OR c.location ILIKE v_clean_query
    )

    UNION ALL

    -- 4. Vehicles & Fleet
    SELECT 
        v.id::TEXT AS id,
        'vehicle' AS type,
        v.name || ' (' || v.plate_number || ')' AS title,
        'Status: ' || v.status AS subtitle,
        'Barangay Fleet Unit' AS details,
        v.status AS status,
        v.created_at AS created_at,
        '/vehicles' AS url_path
    FROM public.vehicles v
    WHERE (
        v.name ILIKE v_clean_query
        OR v.plate_number ILIKE v_clean_query
    )

    UNION ALL

    -- 5. Vehicle Trips
    SELECT 
        vt.id::TEXT AS id,
        'vehicle_trip' AS type,
        'Trip: ' || COALESCE(vt.driver_name, 'Driver') || ' — ' || COALESCE(vt.purpose, 'Mission') AS title,
        'Status: ' || vt.status || ' | Started: ' || COALESCE(to_char(vt.started_at, 'Mon DD HH24:MI'), 'N/A') AS subtitle,
        vt.purpose AS details,
        vt.status AS status,
        vt.created_at AS created_at,
        '/vehicles' AS url_path
    FROM public.vehicle_trips vt
    WHERE (
        vt.driver_name ILIKE v_clean_query
        OR vt.purpose ILIKE v_clean_query
        OR vt.remarks ILIKE v_clean_query
    )

    ORDER BY created_at DESC
    LIMIT p_limit;
END;
$$;

-- 2. Create system_alert_settings table for configurable reminder thresholds
CREATE TABLE IF NOT EXISTS public.system_alert_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    value_numeric NUMERIC NOT NULL,
    unit TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Seed default settings
INSERT INTO public.system_alert_settings (key, label, value_numeric, unit, description)
VALUES 
    ('cctv_retention_warning_days', 'CCTV Footage Retention Warning', 7, 'days', 'Days remaining before CCTV footage expires / pending request threshold.'),
    ('vehicle_trip_timeout_hours', 'Vehicle Trip Update Timeout', 4, 'hours', 'Maximum hours a vehicle trip can be ongoing without an arrival or waypoint update.'),
    ('blotter_inactive_days', 'Inactive Blotter Case Threshold', 7, 'days', 'Maximum days an open blotter case remains without status updates or resolution.')
ON CONFLICT (key) DO UPDATE 
    SET label = EXCLUDED.label,
        unit = EXCLUDED.unit,
        description = EXCLUDED.description;

-- Enable Row Level Security (RLS)
ALTER TABLE public.system_alert_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all authenticated users to read alert settings" ON public.system_alert_settings;
DROP POLICY IF EXISTS "Allow admins to update alert settings" ON public.system_alert_settings;

-- Read policy: Any authenticated user can read alert thresholds
CREATE POLICY "Allow all authenticated users to read alert settings"
    ON public.system_alert_settings
    FOR SELECT
    TO authenticated
    USING (true);

-- Update policy: Only administrators can update alert thresholds
CREATE POLICY "Allow admins to update alert settings"
    ON public.system_alert_settings
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
              AND profiles.role IN ('barangay_captain', 'barangay_secretary', 'barangay_kagawad', 'developer')
        )
    )
    WITH CHECK (true);
