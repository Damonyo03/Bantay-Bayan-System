-- ==============================================================================
-- BANTAY BAYAN: VEHICLE TRIP MONITORING MIGRATION
-- Phase 3: Vehicle Fleet, Live Trips, Stops, Passengers & Auto-Logging
-- Idempotent & Non-Destructive
-- ==============================================================================

-- 1. Create Vehicles Table (if not exists) & Seed Existing 15 Barangay Vehicles
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    plate_number TEXT NOT NULL,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'on_trip', 'maintenance', 'decommissioned')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

INSERT INTO public.vehicles (name, plate_number, status) VALUES
    ('Trimo #1', '1312 - 0438584', 'available'),
    ('Trimo #2', '1312 - 0438585', 'available'),
    ('Trimo #3', 'For Registration', 'available'),
    ('Transformative #1', 'SNN 3519', 'available'),
    ('Transformative #2', 'SNN 2501', 'available'),
    ('APY', 'SNN 1977', 'available'),
    ('L300', '1312 - 0438510', 'available'),
    ('Traviz', 'SNA 5654', 'available'),
    ('Ambulance (Innova)', '1301 - 2076919', 'available'),
    ('Red Plate', 'SND 7512', 'available'),
    ('Harabas', 'SNA 8450', 'available'),
    ('Revo', 'XJF 830', 'available'),
    ('New Ambulance', 'CNB 1823', 'available'),
    ('Foot Patrol / Walking', 'N/A', 'available'),
    ('Command Post', 'N/A', 'available')
ON CONFLICT (name) DO NOTHING;

-- 2. Create vehicle_trips Table
CREATE TABLE IF NOT EXISTS public.vehicle_trips (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id UUID REFERENCES public.vehicles(id) ON UPDATE CASCADE ON DELETE RESTRICT NOT NULL,
    driver_id UUID REFERENCES public.profiles(id) ON UPDATE CASCADE ON DELETE SET NULL,
    driver_name TEXT NOT NULL,
    purpose TEXT NOT NULL,
    status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'ongoing', 'completed', 'cancelled')) NOT NULL,
    odometer_start NUMERIC,
    odometer_end NUMERIC,
    remarks TEXT,
    logged_by UUID DEFAULT auth.uid() REFERENCES public.profiles(id) ON UPDATE CASCADE ON DELETE SET NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Constraints: No vehicle or registered driver can be on two ongoing trips concurrently
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_ongoing_trip_per_vehicle 
    ON public.vehicle_trips (vehicle_id) 
    WHERE (status = 'ongoing');

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_ongoing_trip_per_driver 
    ON public.vehicle_trips (driver_id) 
    WHERE (status = 'ongoing' AND driver_id IS NOT NULL);

-- 4. Create trip_passengers Table
CREATE TABLE IF NOT EXISTS public.trip_passengers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trip_id UUID REFERENCES public.vehicle_trips(id) ON DELETE CASCADE NOT NULL,
    person_id UUID REFERENCES public.profiles(id) ON UPDATE CASCADE ON DELETE SET NULL,
    passenger_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 5. Create trip_stops Table
CREATE TABLE IF NOT EXISTS public.trip_stops (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trip_id UUID REFERENCES public.vehicle_trips(id) ON DELETE CASCADE NOT NULL,
    place TEXT NOT NULL,
    arrival_time TIMESTAMPTZ,
    departure_time TIMESTAMPTZ,
    manual_time_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexing
CREATE INDEX IF NOT EXISTS idx_trips_created_at ON public.vehicle_trips (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle_id ON public.vehicle_trips (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver_id ON public.vehicle_trips (driver_id);
CREATE INDEX IF NOT EXISTS idx_trip_stops_trip_id ON public.trip_stops (trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_passengers_trip_id ON public.trip_passengers (trip_id);

-- 6. Row Level Security (RLS)
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_stops ENABLE ROW LEVEL SECURITY;

-- Vehicles Policies
DROP POLICY IF EXISTS "vehicles_select_staff" ON public.vehicles;
CREATE POLICY "vehicles_select_staff" ON public.vehicles FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS "vehicles_update_staff" ON public.vehicles;
CREATE POLICY "vehicles_update_staff" ON public.vehicles FOR UPDATE USING (public.is_staff()) WITH CHECK (public.is_staff());

-- Vehicle Trips Policies
DROP POLICY IF EXISTS "trips_select_staff" ON public.vehicle_trips;
CREATE POLICY "trips_select_staff" ON public.vehicle_trips FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS "trips_insert_staff" ON public.vehicle_trips;
CREATE POLICY "trips_insert_staff" ON public.vehicle_trips FOR INSERT TO authenticated WITH CHECK (public.is_staff());

-- Updates allowed only on trips that are not yet completed
DROP POLICY IF EXISTS "trips_update_non_completed" ON public.vehicle_trips;
CREATE POLICY "trips_update_non_completed" ON public.vehicle_trips FOR UPDATE 
    USING (public.is_staff() AND status != 'completed')
    WITH CHECK (public.is_staff());

-- No Deletes on Trips
DROP POLICY IF EXISTS "trips_deny_delete" ON public.vehicle_trips;
CREATE POLICY "trips_deny_delete" ON public.vehicle_trips FOR DELETE USING (false);

-- Passengers & Stops Policies
DROP POLICY IF EXISTS "passengers_select_staff" ON public.trip_passengers;
CREATE POLICY "passengers_select_staff" ON public.trip_passengers FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "stops_select_staff" ON public.trip_stops;
CREATE POLICY "stops_select_staff" ON public.trip_stops FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

-- 7. Trigger: Auto-Log Vehicle Trips to Logbook and Sync Vehicle Status
CREATE OR REPLACE FUNCTION public.trg_vehicle_trip_lifecycle_func()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_vehicle_name TEXT;
    v_passengers TEXT;
BEGIN
    BEGIN
        SELECT name INTO v_vehicle_name FROM public.vehicles WHERE id = NEW.vehicle_id;

        -- Collect passenger list
        SELECT string_agg(passenger_name, ', ') INTO v_passengers 
        FROM public.trip_passengers 
        WHERE trip_id = NEW.id;

        IF v_passengers IS NULL THEN
            v_passengers := 'None listed';
        END IF;

        -- Trip Started
        IF (TG_OP = 'INSERT' AND NEW.status = 'ongoing') OR (TG_OP = 'UPDATE' AND OLD.status != 'ongoing' AND NEW.status = 'ongoing') THEN
            UPDATE public.vehicles SET status = 'on_trip' WHERE id = NEW.vehicle_id;
            
            PERFORM public.log_event(
                'vehicle'::public.logbook_category,
                'trip_started',
                'Trip Started: ' || COALESCE(v_vehicle_name, 'Vehicle'),
                'Vehicle departed for: ' || NEW.purpose || '. Driver: ' || NEW.driver_name || '. Passengers: ' || v_passengers,
                'vehicle_trip',
                NEW.id::text,
                jsonb_build_object('vehicle_id', NEW.vehicle_id, 'driver', NEW.driver_name, 'odometer_start', NEW.odometer_start)
            );

        -- Trip Completed
        ELSIF (TG_OP = 'UPDATE' AND OLD.status != 'completed' AND NEW.status = 'completed') THEN
            UPDATE public.vehicles SET status = 'available' WHERE id = NEW.vehicle_id;
            
            PERFORM public.log_event(
                'vehicle'::public.logbook_category,
                'trip_completed',
                'Trip Completed: ' || COALESCE(v_vehicle_name, 'Vehicle'),
                'Vehicle trip ended. Purpose: ' || NEW.purpose || '. Driver: ' || NEW.driver_name || '. Remarks: ' || COALESCE(NEW.remarks, 'None'),
                'vehicle_trip',
                NEW.id::text,
                jsonb_build_object('vehicle_id', NEW.vehicle_id, 'odometer_end', NEW.odometer_end, 'completed_at', NEW.completed_at)
            );

        -- Trip Cancelled
        ELSIF (TG_OP = 'UPDATE' AND OLD.status != 'cancelled' AND NEW.status = 'cancelled') THEN
            UPDATE public.vehicles SET status = 'available' WHERE id = NEW.vehicle_id;
        END IF;

    EXCEPTION WHEN OTHERS THEN
        BEGIN
            INSERT INTO public.debug_logs (event_type, error_message, data)
            VALUES ('vehicle_trip_trigger_error', SQLERRM, jsonb_build_object('trip_id', NEW.id));
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vehicle_trip_lifecycle ON public.vehicle_trips;
CREATE TRIGGER trg_vehicle_trip_lifecycle
    AFTER INSERT OR UPDATE OF status ON public.vehicle_trips
    FOR EACH ROW EXECUTE FUNCTION public.trg_vehicle_trip_lifecycle_func();

-- 8. Trigger: Auto-Log Trip Stops (Arrivals and Departures)
CREATE OR REPLACE FUNCTION public.trg_trip_stop_log_func()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_vehicle_name TEXT;
    v_driver_name TEXT;
    v_passengers TEXT;
    v_trip_rec RECORD;
BEGIN
    BEGIN
        SELECT t.id, t.vehicle_id, t.driver_name, v.name as vehicle_name
        INTO v_trip_rec
        FROM public.vehicle_trips t
        JOIN public.vehicles v ON v.id = t.vehicle_id
        WHERE t.id = NEW.trip_id;

        SELECT string_agg(passenger_name, ', ') INTO v_passengers 
        FROM public.trip_passengers 
        WHERE trip_id = NEW.trip_id;

        IF v_passengers IS NULL THEN
            v_passengers := 'None listed';
        END IF;

        -- Arrival logged
        IF (TG_OP = 'INSERT' AND NEW.arrival_time IS NOT NULL) OR (TG_OP = 'UPDATE' AND OLD.arrival_time IS NULL AND NEW.arrival_time IS NOT NULL) THEN
            PERFORM public.log_event(
                'vehicle'::public.logbook_category,
                'stop_arrival',
                COALESCE(v_trip_rec.vehicle_name, 'Vehicle') || ' Arrived at ' || NEW.place,
                'Arrival recorded at ' || NEW.place || '. Driver: ' || v_trip_rec.driver_name || '. Passengers: ' || v_passengers || CASE WHEN NEW.manual_time_reason IS NOT NULL THEN ' (Manual Time: ' || NEW.manual_time_reason || ')' ELSE '' END,
                'vehicle_trip',
                NEW.trip_id::text,
                jsonb_build_object('place', NEW.place, 'arrival_time', NEW.arrival_time, 'manual_reason', NEW.manual_time_reason)
            );
        END IF;

        -- Departure logged
        IF (TG_OP = 'UPDATE' AND OLD.departure_time IS NULL AND NEW.departure_time IS NOT NULL) THEN
            PERFORM public.log_event(
                'vehicle'::public.logbook_category,
                'stop_departure',
                COALESCE(v_trip_rec.vehicle_name, 'Vehicle') || ' Departed from ' || NEW.place,
                'Departure recorded from ' || NEW.place || '. Driver: ' || v_trip_rec.driver_name || CASE WHEN NEW.manual_time_reason IS NOT NULL THEN ' (Manual Time: ' || NEW.manual_time_reason || ')' ELSE '' END,
                'vehicle_trip',
                NEW.trip_id::text,
                jsonb_build_object('place', NEW.place, 'departure_time', NEW.departure_time, 'manual_reason', NEW.manual_time_reason)
            );
        END IF;

    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trip_stop_log ON public.trip_stops;
CREATE TRIGGER trg_trip_stop_log
    AFTER INSERT OR UPDATE OF arrival_time, departure_time ON public.trip_stops
    FOR EACH ROW EXECUTE FUNCTION public.trg_trip_stop_log_func();

-- Enable Realtime
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicles, public.vehicle_trips, public.trip_stops;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN undefined_object THEN null;
END $$;

NOTIFY pgrst, 'reload schema';
