-- ==============================================================================
-- BANTAY BAYAN: AUTO-LOGGING TRIGGERS MIGRATION
-- Phase 2: Automatic Module Integration via Database Triggers
-- Idempotent & Non-Destructive
-- ==============================================================================

-- 1. Master Auto-Logging Trigger Function
CREATE OR REPLACE FUNCTION public.trg_auto_log_event_func()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_name TEXT;
    v_caller_role TEXT;
    v_category public.logbook_category;
    v_action TEXT;
    v_title TEXT;
    v_desc TEXT;
    v_ref_type TEXT;
    v_ref_id TEXT;
    v_case_num TEXT;
BEGIN
    BEGIN
        -- 1. Resolve Actor
        v_caller_id := auth.uid();
        
        IF v_caller_id IS NOT NULL THEN
            SELECT full_name, role::text INTO v_caller_name, v_caller_role
            FROM public.profiles
            WHERE id = v_caller_id;
        END IF;

        IF v_caller_name IS NULL THEN
            v_caller_name := 'System';
            v_caller_role := 'system';
        END IF;

        -- 2. Determine Event Details by Table and Operation
        IF TG_TABLE_NAME = 'incidents' THEN
            v_category := CASE WHEN NEW.type = 'Logistics' THEN 'vehicle'::public.logbook_category ELSE 'blotter'::public.logbook_category END;
            v_ref_type := 'incident';
            v_ref_id := NEW.case_number;

            IF TG_OP = 'INSERT' THEN
                v_action := 'created';
                v_title := 'New ' || NEW.type || ' Blotter Logged: ' || NEW.case_number;
                v_desc := 'Location: ' || NEW.location || '. Initial Status: ' || NEW.status;
            ELSIF TG_OP = 'UPDATE' THEN
                IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
                    RETURN NEW; -- Only log on status transitions
                END IF;
                v_action := 'status_changed';
                v_title := 'Blotter Status Changed: ' || NEW.case_number;
                v_desc := 'Status transitioned from ' || OLD.status || ' to ' || NEW.status || '.';
            END IF;

        ELSIF TG_TABLE_NAME = 'cctv_requests' THEN
            v_category := 'cctv_request'::public.logbook_category;
            v_ref_type := 'cctv_request';
            v_ref_id := NEW.request_number;

            IF TG_OP = 'INSERT' THEN
                v_action := 'created';
                v_title := 'New CCTV Request: ' || NEW.request_number;
                v_desc := 'Requested for incident type: ' || COALESCE(NEW.incident_type, 'General') || ' at ' || COALESCE(NEW.location, 'Unspecified') || '.';
            END IF;

        ELSIF TG_TABLE_NAME = 'asset_requests' THEN
            v_category := 'asset'::public.logbook_category;
            v_ref_type := 'asset';
            v_ref_id := NEW.id::text;

            IF TG_OP = 'INSERT' THEN
                v_action := 'created';
                v_title := 'New Equipment Borrowing Request Logged';
                v_desc := 'Borrower: ' || NEW.borrower_name || '. Purpose: ' || COALESCE(NEW.purpose, 'N/A') || '.';
            ELSIF TG_OP = 'UPDATE' THEN
                IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
                    RETURN NEW;
                END IF;
                v_action := CASE 
                    WHEN NEW.status = 'Released' THEN 'released'
                    WHEN NEW.status = 'Returned' THEN 'returned'
                    ELSE 'status_changed'
                END;
                v_title := 'Equipment Request ' || NEW.status;
                v_desc := 'Status updated from ' || OLD.status || ' to ' || NEW.status || ' for borrower: ' || NEW.borrower_name || '.';
            END IF;

        ELSIF TG_TABLE_NAME = 'public_reports' THEN
            v_category := 'queue'::public.logbook_category;
            v_ref_type := 'public_report';
            v_ref_id := NEW.reference_number;

            IF TG_OP = 'INSERT' THEN
                v_action := 'created';
                v_title := 'Public Incident Report Received: ' || NEW.reference_number;
                v_desc := 'Type: ' || NEW.type || ' at location: ' || NEW.location || '.';
            ELSIF TG_OP = 'UPDATE' THEN
                IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
                    RETURN NEW;
                END IF;
                v_action := 'status_changed';
                v_title := 'Public Report Status: ' || NEW.reference_number;
                v_desc := 'Status changed from ' || OLD.status || ' to ' || NEW.status || '.';
            END IF;

        ELSIF TG_TABLE_NAME = 'dispatch_logs' THEN
            v_category := 'vehicle'::public.logbook_category;
            v_ref_type := 'incident';
            
            -- Lookup parent incident case number
            SELECT case_number INTO v_case_num FROM public.incidents WHERE id = NEW.incident_id;
            v_ref_id := COALESCE(v_case_num, NEW.incident_id::text);

            IF TG_OP = 'INSERT' THEN
                v_action := 'dispatched';
                v_title := 'Response Unit Dispatched: ' || NEW.unit_name;
                v_desc := 'Unit assigned with initial movement status: ' || NEW.status || '.';
            ELSIF TG_OP = 'UPDATE' THEN
                IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
                    RETURN NEW;
                END IF;
                v_action := 'status_changed';
                v_title := 'Unit Movement Update: ' || NEW.unit_name;
                v_desc := 'Movement status changed from ' || OLD.status || ' to ' || NEW.status || '.';
            END IF;
        END IF;

        -- 3. Write Immutable Entry to logbook_entries
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
            metadata
        ) VALUES (
            v_caller_id,
            v_caller_name,
            v_caller_role,
            v_category,
            v_action,
            v_title,
            v_desc,
            v_ref_type,
            v_ref_id,
            jsonb_build_object(
                'source', 'database_trigger',
                'table', TG_TABLE_NAME,
                'operation', TG_OP
            )
        );

    EXCEPTION WHEN OTHERS THEN
        -- Safe fallback: Log trigger exception to debug_logs, never fail the primary transaction
        BEGIN
            INSERT INTO public.debug_logs (event_type, error_message, data)
            VALUES (
                'auto_log_trigger_error',
                SQLERRM,
                jsonb_build_object('table', TG_TABLE_NAME, 'op', TG_OP)
            );
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END;

    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

-- 2. Attach Triggers to Core Tables

-- CCTV Requests
DROP TRIGGER IF EXISTS trg_auto_log_cctv ON public.cctv_requests;
CREATE TRIGGER trg_auto_log_cctv
    AFTER INSERT ON public.cctv_requests
    FOR EACH ROW EXECUTE FUNCTION public.trg_auto_log_event_func();

-- Incidents (Blotter)
DROP TRIGGER IF EXISTS trg_auto_log_incidents ON public.incidents;
CREATE TRIGGER trg_auto_log_incidents
    AFTER INSERT OR UPDATE OF status ON public.incidents
    FOR EACH ROW EXECUTE FUNCTION public.trg_auto_log_event_func();

-- Asset Requests
DROP TRIGGER IF EXISTS trg_auto_log_assets ON public.asset_requests;
CREATE TRIGGER trg_auto_log_assets
    AFTER INSERT OR UPDATE OF status ON public.asset_requests
    FOR EACH ROW EXECUTE FUNCTION public.trg_auto_log_event_func();

-- Public Reports
DROP TRIGGER IF EXISTS trg_auto_log_public_reports ON public.public_reports;
CREATE TRIGGER trg_auto_log_public_reports
    AFTER INSERT OR UPDATE OF status ON public.public_reports
    FOR EACH ROW EXECUTE FUNCTION public.trg_auto_log_event_func();

-- Dispatch Logs
DROP TRIGGER IF EXISTS trg_auto_log_dispatch ON public.dispatch_logs;
CREATE TRIGGER trg_auto_log_dispatch
    AFTER INSERT OR UPDATE OF status ON public.dispatch_logs
    FOR EACH ROW EXECUTE FUNCTION public.trg_auto_log_event_func();
