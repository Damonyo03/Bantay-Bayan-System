-- Rollback Migration: 20261008_remove_seed_vehicles_rollback.sql
-- Description: Re-insert initial 15 seed vehicles if rollback is needed.

BEGIN;

INSERT INTO public.vehicles (name, plate_number, status, type) VALUES
    ('Mobile Patrol 01', 'SAB-1001', 'available', 'Patrol Car'),
    ('Mobile Patrol 02', 'SAB-1002', 'available', 'Patrol Car'),
    ('Mobile Patrol 03', 'SAB-1003', 'available', 'Patrol Car'),
    ('Mobile Patrol 04', 'SAB-1004', 'available', 'Patrol Car'),
    ('Mobile Patrol 05', 'SAB-1005', 'available', 'Patrol Car'),
    ('Barangay Motorcycle 01', 'MC-2001', 'available', 'Motorcycle'),
    ('Barangay Motorcycle 02', 'MC-2002', 'available', 'Motorcycle'),
    ('Barangay Motorcycle 03', 'MC-2003', 'available', 'Motorcycle'),
    ('Barangay Motorcycle 04', 'MC-2004', 'available', 'Motorcycle'),
    ('Barangay Motorcycle 05', 'MC-2005', 'available', 'Motorcycle'),
    ('Emergency Ambulance 01', 'AMB-3001', 'available', 'Ambulance'),
    ('Emergency Ambulance 02', 'AMB-3002', 'available', 'Ambulance'),
    ('Disaster Rescue Truck 01', 'RES-4001', 'available', 'Rescue Truck'),
    ('Barangay Van 01', 'VAN-5001', 'available', 'Utility Van'),
    ('Rescue Boat 01', 'BOT-6001', 'available', 'Rescue Boat')
ON CONFLICT (plate_number) DO NOTHING;

COMMIT;
