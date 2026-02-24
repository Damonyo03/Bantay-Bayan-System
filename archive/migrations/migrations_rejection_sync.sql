-- ==============================================================================
-- BANTAY BAYAN: REJECTION & DELETION SYNC
-- Run this in the Supabase SQL Editor to support the new features.
-- ==============================================================================

-- 1. Update Profile Status (Handles both Enum and Text formats)
DO $$ 
BEGIN
    -- If the database uses an ENUM for status
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        BEGIN
            ALTER TYPE user_status ADD VALUE 'rejected';
        EXCEPTION
            WHEN duplicate_object THEN 
                RAISE NOTICE 'Value "rejected" already exists in user_status enum.';
        END;
    END IF;

    -- If the database uses a TEXT column with a CHECK constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'status' AND data_type = 'text'
    ) THEN
        ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
        ALTER TABLE profiles ADD CONSTRAINT profiles_status_check CHECK (status IN ('active', 'inactive', 'rejected'));
    END IF;
END $$;

-- 2. Create secure deletion function (Security Definer)
-- This allows supervisors to delete users from auth.users (and cascaded profiles)
-- safely from the frontend via the API.
CREATE OR REPLACE FUNCTION delete_user_by_id(user_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges
AS $$
BEGIN
  -- Verify the caller is an authenticated Supervisor
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'supervisor'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only supervisors can delete accounts.';
  END IF;

  -- Delete from auth (cascades to public.profiles)
  DELETE FROM auth.users WHERE id = user_uuid;
END;
$$;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION delete_user_by_id(UUID) TO authenticated;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
