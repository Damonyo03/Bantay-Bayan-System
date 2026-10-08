-- ==============================================================================
-- BANTAY BAYAN: COMPREHENSIVE AUTO-LOGBOOK SYNCHRONIZATION MIGRATION
-- Automatically mirrors ALL blotters, CCTV requests, vehicle monitoring,
-- equipment borrowing/assets, and dispatch actions into logbook_entries.
-- Idempotent, Null-Safe, and Non-Destructive
-- ==============================================================================

BEGIN;

-- 1. Master Auto-Logging Trigger Function (Null-safe, FK-safe, Enum-safe)
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
    v_vehicle_name TEXT;
    v_trip_rec RECORD;
BEGIN
    BEGIN
        -- 1. Resolve Actor safely
        v_caller_id := auth.uid();
        
        IF v_caller_id IS NOT NULL THEN
            SELECT full_name, role::text INTO v_caller_name, v_caller_role
            FROM public.profiles
            WHERE id = v_caller_id;
            
            -- If user id is not in public.profiles, nullify to prevent FK violation
            IF v_caller_name IS NULL THEN
                v_caller_id := NULL;
                v_caller_name := 'Bantay Bayan Staff';
                v_caller_role := 'staff';
            END IF;
        ELSE
            v_caller_name := 'System';
            v_caller_role := 'system';
        END IF;

        -- 2. Determine Event Details by Table and Operation
        IF TG_TABLE_NAME = 'incidents' THEN
            v_category := CASE 
                WHEN COALESCE(NEW.type, '') = 'Logistics' THEN 'vehicle'::public.logbook_category 
                ELSE 'blotter'::public.logbook_category 
            END;
            v_ref_type := 'incident';
            v_ref_id := COALESCE(NEW.case_number, NEW.id::text);

            IF TG_OP = 'INSERT' THEN
                v_action := 'created';
                v_title := 'New ' || COALESCE(NEW.type, 'Incident') || ' Blotter Logged: ' || COALESCE(NEW.case_number, 'Unassigned');
                v_desc := 'Location: ' || COALESCE(NEW.location, 'Not specified') || ' | Initial Status: ' || COALESCE(NEW.status, 'Pending') || CASE WHEN NEW.narrative IS NOT NULL AND NEW.narrative != '' THEN ' | Narrative: ' || LEFT(NEW.narrative, 150) ELSE '' END;
            ELSIF TG_OP = 'UPDATE' THEN
                IF OLD.status IS NOT DISTINCT FROM NEW.status AND OLD.is_restricted_entry IS NOT DISTINCT FROM NEW.is_restricted_entry THEN
                    RETURN NEW;
                END IF;
                v_action := 'status_changed';
                v_title := 'Blotter Status Changed: ' || COALESCE(NEW.case_number, NEW.id::text);
                v_desc := 'Status updated from ' || COALESCE(OLD.status, 'N/A') || ' to ' || COALESCE(NEW.status, 'N/A') || CASE WHEN NEW.is_restricted_entry != OLD.is_restricted_entry THEN ' (Restricted Entry: ' || NEW.is_restricted_entry::text || ')' ELSE '' END;
            END IF;

        ELSIF TG_TABLE_NAME = 'cctv_requests' THEN
            v_category := 'cctv_request'::public.logbook_category;
            v_ref_type := 'cctv_request';
            v_ref_id := COALESCE(NEW.request_number, NEW.id::text);

            IF TG_OP = 'INSERT' THEN
                v_action := 'created';
                v_title := 'New CCTV Request Logged: ' || COALESCE(NEW.request_number, 'Unassigned');
                v_desc := 'Incident Type: ' || COALESCE(NEW.incident_type, 'General') || ' | Location: ' || COALESCE(NEW.location, 'Unspecified') || ' | Requestor: ' || COALESCE(NEW.requestor_name, 'N/A');
            ELSIF TG_OP = 'UPDATE' THEN
                IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
                    RETURN NEW;
                END IF;
                v_action := 'status_changed';
                v_title := 'CCTV Request ' || COALESCE(NEW.status, 'Updated') || ': ' || COALESCE(NEW.request_number, NEW.id::text);
                v_desc := 'Status changed from ' || COALESCE(OLD.status, 'N/A') || ' to ' || COALESCE(NEW.status, 'N/A');
            END IF;

        ELSIF TG_TABLE_NAME = 'asset_requests' THEN
            v_category := 'asset'::public.logbook_category;
            v_ref_type := 'asset_request';
            v_ref_id := NEW.id::text;

            IF TG_OP = 'INSERT' THEN
                v_action := 'created';
                v_title := 'New Equipment Borrowing Request Logged';
                v_desc := 'Borrower: ' || COALESCE(NEW.borrower_name, 'N/A') || ' | Purpose: ' || COALESCE(NEW.purpose, 'N/A');
            ELSIF TG_OP = 'UPDATE' THEN
                IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
                    RETURN NEW;
                END IF;
                v_action := CASE 
                    WHEN NEW.status = 'Released' THEN 'released'
                    WHEN NEW.status = 'Returned' THEN 'returned'
                    ELSE 'status_changed'
                END;
                v_title := 'Equipment Borrowing ' || COALESCE(NEW.status, 'Updated');
                v_desc := 'Status updated from ' || COALESCE(OLD.status, 'N/A') || ' to ' || COALESCE(NEW.status, 'N/A') || ' for borrower: ' || COALESCE(NEW.borrower_name, 'N/A');
            END IF;

        ELSIF TG_TABLE_NAME = 'assets' THEN
            v_category := 'asset'::public.logbook_category;
            v_ref_type := 'asset';
            v_ref_id := NEW.id::text;

            IF TG_OP = 'INSERT' THEN
                v_action := 'registered';
                v_title := 'New Equipment Registered: ' || COALESCE(NEW.name, 'Asset');
                v_desc := 'Category: ' || COALESCE(NEW.category, 'General') || ' | Initial Condition: ' || COALESCE(NEW.condition, 'Good');
            ELSIF TG_OP = 'UPDATE' THEN
                IF OLD.status IS NOT DISTINCT FROM NEW.status AND OLD.condition IS NOT DISTINCT FROM NEW.condition THEN
                    RETURN NEW;
                END IF;
                v_action := 'status_changed';
                v_title := 'Equipment Status Changed: ' || COALESCE(NEW.name, 'Asset');
                v_desc := 'Condition: ' || COALESCE(NEW.condition, 'N/A') || ' | Status: ' || COALESCE(NEW.status, 'N/A');
            END IF;

        ELSIF TG_TABLE_NAME = 'public_reports' THEN
            v_category := 'queue'::public.logbook_category;
            v_ref_type := 'public_report';
            v_ref_id := COALESCE(NEW.reference_number, NEW.id::text);

            IF TG_OP = 'INSERT' THEN
                v_action := 'created';
                v_title := 'Public Incident Report Received: ' || COALESCE(NEW.reference_number, 'Unassigned');
                v_desc := 'Type: ' || COALESCE(NEW.type, 'General') || ' | Location: ' || COALESCE(NEW.location, 'Unspecified');
            ELSIF TG_OP = 'UPDATE' THEN
                IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
                    RETURN NEW;
                END IF;
                v_action := 'status_changed';
                v_title := 'Public Report Status: ' || COALESCE(NEW.reference_number, NEW.id::text);
                v_desc := 'Status changed from ' || COALESCE(OLD.status, 'N/A') || ' to ' || COALESCE(NEW.status, 'N/A');
            END IF;

        ELSIF TG_TABLE_NAME = 'dispatch_logs' THEN
            v_category := 'vehicle'::public.logbook_category;
            v_ref_type := 'incident';
            
            SELECT case_number INTO v_case_num FROM public.incidents WHERE id = NEW.incident_id;
            v_ref_id := COALESCE(v_case_num, NEW.incident_id::text);

            IF TG_OP = 'INSERT' THEN
                v_action := 'dispatched';
                v_title := 'Response Unit Dispatched: ' || COALESCE(NEW.unit_name, 'Unit');
                v_desc := 'Unit assigned with initial movement status: ' || COALESCE(NEW.status, 'En Route');
            ELSIF TG_OP = 'UPDATE' THEN
                IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
                    RETURN NEW;
                END IF;
                v_action := 'status_changed';
                v_title := 'Unit Movement Update: ' || COALESCE(NEW.unit_name, 'Unit');
                v_desc := 'Movement status changed from ' || COALESCE(OLD.status, 'N/A') || ' to ' || COALESCE(NEW.status, 'N/A');
            END IF;

        ELSIF TG_TABLE_NAME = 'vehicle_trips' THEN
            v_category := 'vehicle'::public.logbook_category;
            v_ref_type := 'vehicle_trip';
            v_ref_id := NEW.id::text;

            SELECT name INTO v_vehicle_name FROM public.vehicles WHERE id = NEW.vehicle_id;
            v_vehicle_name := COALESCE(v_vehicle_name, 'Patrol Vehicle');

            IF TG_OP = 'INSERT' THEN
                v_action := 'trip_started';
                v_title := v_vehicle_name || ' Dispatched on Trip';
                v_desc := 'Driver: ' || COALESCE(NEW.driver_name, 'N/A') || ' | Purpose: ' || COALESCE(NEW.purpose, 'Patrol / Response') || CASE WHEN NEW.odometer_start IS NOT NULL THEN ' | Start Odo: ' || NEW.odometer_start::text || ' km' ELSE '' END;
            ELSIF TG_OP = 'UPDATE' THEN
                IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
                    RETURN NEW;
                END IF;
                v_action := 'trip_' || NEW.status;
                v_title := v_vehicle_name || ' Trip ' || INITCAP(NEW.status);
                v_desc := 'Trip status changed to ' || NEW.status || CASE WHEN NEW.odometer_end IS NOT NULL THEN ' | End Odo: ' || NEW.odometer_end::text || ' km' ELSE '' END || CASE WHEN NEW.remarks IS NOT NULL AND NEW.remarks != '' THEN ' | Remarks: ' || NEW.remarks ELSE '' END;
            END IF;

        ELSIF TG_TABLE_NAME = 'trip_stops' THEN
            v_category := 'vehicle'::public.logbook_category;
            v_ref_type := 'vehicle_trip';
            v_ref_id := NEW.trip_id::text;

            SELECT t.id, t.driver_name, v.name as vehicle_name
            INTO v_trip_rec
            FROM public.vehicle_trips t
            JOIN public.vehicles v ON v.id = t.vehicle_id
            WHERE t.id = NEW.trip_id;

            v_vehicle_name := COALESCE(v_trip_rec.vehicle_name, 'Patrol Vehicle');

            IF (TG_OP = 'INSERT' AND NEW.arrival_time IS NOT NULL) OR (TG_OP = 'UPDATE' AND OLD.arrival_time IS NULL AND NEW.arrival_time IS NOT NULL) THEN
                v_action := 'stop_arrival';
                v_title := v_vehicle_name || ' Arrived at ' || COALESCE(NEW.place, 'Waypoint');
                v_desc := 'Arrival stamped at ' || COALESCE(NEW.place, 'Waypoint') || ' | Driver: ' || COALESCE(v_trip_rec.driver_name, 'N/A') || CASE WHEN NEW.manual_time_reason IS NOT NULL THEN ' (Manual Time: ' || NEW.manual_time_reason || ')' ELSE '' END;
            ELSIF (TG_OP = 'UPDATE' AND OLD.departure_time IS NULL AND NEW.departure_time IS NOT NULL) THEN
                v_action := 'stop_departure';
                v_title := v_vehicle_name || ' Departed from ' || COALESCE(NEW.place, 'Waypoint');
                v_desc := 'Departure stamped from ' || COALESCE(NEW.place, 'Waypoint') || ' | Driver: ' || COALESCE(v_trip_rec.driver_name, 'N/A') || CASE WHEN NEW.manual_time_reason IS NOT NULL THEN ' (Manual Time: ' || NEW.manual_time_reason || ')' ELSE '' END;
            ELSE
                RETURN NEW;
            END IF;
        END IF;

        -- 3. Fallbacks to guarantee NOT NULL constraints
        v_title := COALESCE(v_title, 'System Event Recorded');
        v_desc := COALESCE(v_desc, 'Action performed on ' || TG_TABLE_NAME);
        v_action := COALESCE(v_action, 'recorded');
        v_category := COALESCE(v_category, 'other'::public.logbook_category);

        -- 4. Write Immutable Entry to logbook_entries
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
        -- Silent safe catch: trigger will never fail primary insert/update
        NULL;
    END;

    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

-- 2. Bind Triggers to All Source Tables

-- Incidents (Blotter)
DROP TRIGGER IF EXISTS trg_auto_log_incidents ON public.incidents;
CREATE TRIGGER trg_auto_log_incidents
    AFTER INSERT OR UPDATE OF status, is_restricted_entry ON public.incidents
    FOR EACH ROW EXECUTE FUNCTION public.trg_auto_log_event_func();

-- CCTV Requests
DROP TRIGGER IF EXISTS trg_auto_log_cctv ON public.cctv_requests;
CREATE TRIGGER trg_auto_log_cctv
    AFTER INSERT OR UPDATE OF status ON public.cctv_requests
    FOR EACH ROW EXECUTE FUNCTION public.trg_auto_log_event_func();

-- Asset Requests (Borrowing)
DROP TRIGGER IF EXISTS trg_auto_log_assets ON public.asset_requests;
CREATE TRIGGER trg_auto_log_assets
    AFTER INSERT OR UPDATE OF status ON public.asset_requests
    FOR EACH ROW EXECUTE FUNCTION public.trg_auto_log_event_func();

-- Assets (Equipment Catalog)
DROP TRIGGER IF EXISTS trg_auto_log_asset_items ON public.assets;
CREATE TRIGGER trg_auto_log_asset_items
    AFTER INSERT OR UPDATE OF status, condition ON public.assets
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

-- Vehicle Trips
DROP TRIGGER IF EXISTS trg_vehicle_trip_lifecycle ON public.vehicle_trips;
CREATE TRIGGER trg_vehicle_trip_lifecycle
    AFTER INSERT OR UPDATE OF status ON public.vehicle_trips
    FOR EACH ROW EXECUTE FUNCTION public.trg_auto_log_event_func();

-- Trip Stops
DROP TRIGGER IF EXISTS trg_trip_stop_log ON public.trip_stops;
CREATE TRIGGER trg_trip_stop_log
    AFTER INSERT OR UPDATE OF arrival_time, departure_time ON public.trip_stops
    FOR EACH ROW EXECUTE FUNCTION public.trg_auto_log_event_func();

COMMIT;
