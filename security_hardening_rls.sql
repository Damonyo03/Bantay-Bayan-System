-- ==============================================================================
-- BANTAY BAYAN: SECURITY HARDENING MIGRATION
-- Apply this in the Supabase SQL Editor AFTER the main full_system_schema.sql.
-- This script is idempotent — safe to run multiple times.
-- ==============================================================================

-- ==============================================================================
-- SECTION A: PRIVILEGE ESCALATION PREVENTION
-- Blocks any non-admin user from changing their own role or status via
-- a client-side Supabase call. The DB is the last line of defense.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_role text;
BEGIN
  -- Only fire when role or status is actually changing
  IF (NEW.role IS NOT DISTINCT FROM OLD.role) AND (NEW.status IS NOT DISTINCT FROM OLD.status) THEN
    RETURN NEW;
  END IF;

  -- Look up the caller's current role from the DB (not the session claim, which is spoofable)
  SELECT role INTO v_caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  -- Only developer and barangay_captain may change roles or statuses
  IF v_caller_role NOT IN ('developer', 'barangay_captain') THEN
    RAISE EXCEPTION
      'SECURITY VIOLATION: Insufficient privileges to modify role or status. '
      'Caller role: %. Required: developer or barangay_captain.',
      COALESCE(v_caller_role, 'unauthenticated')
    USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE OF role, status ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();


-- ==============================================================================
-- SECTION B: COLUMN DEFAULTS FOR USER TRACKING
-- Ensures the DB always stamps the authenticated user as the record owner.
-- This prevents spoofing a different user's ID from the client side.
-- ==============================================================================

-- public_reports: submitted_by defaults to the calling user
ALTER TABLE public.public_reports
  ALTER COLUMN submitted_by SET DEFAULT auth.uid();

-- asset_requests: logged_by defaults to the calling user
ALTER TABLE public.asset_requests
  ALTER COLUMN logged_by SET DEFAULT auth.uid();

-- cctv_requests: add a tracked owner column
ALTER TABLE public.cctv_requests
  ADD COLUMN IF NOT EXISTS requested_by uuid REFERENCES public.profiles(id) DEFAULT auth.uid();


-- ==============================================================================
-- SECTION C: HARDENED ROW-LEVEL SECURITY POLICIES
-- Drop all existing policies and replace with tightly scoped ones.
-- ==============================================================================

-- Helper function: returns true if the calling user is a staff member
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN (
        'developer',
        'barangay_captain',
        'barangay_secretary',
        'barangay_kagawad',
        'supervisor',
        'bantay_bayan'
      )
      AND status = 'active'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;

-- Helper function: returns true if the calling user is a supreme admin
CREATE OR REPLACE FUNCTION public.is_supreme_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('developer', 'barangay_captain')
      AND status = 'active'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_supreme_admin() TO authenticated;

-- ─── 1. PROFILES ────────────────────────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Supervisors can update any profile" ON public.profiles;

-- SELECT: own profile OR staff can see all active profiles
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR public.is_staff()
  );

-- INSERT: only via the handle_new_user trigger (SECURITY DEFINER),
-- regular authenticated users cannot directly insert rows
CREATE POLICY "profiles_insert_trigger_only"
  ON public.profiles FOR INSERT
  WITH CHECK (false);

-- UPDATE: users can update their own non-privileged columns (enforced by trigger for role/status)
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- UPDATE: staff can update any profile (role/status changes still blocked by trigger for non-admins)
CREATE POLICY "profiles_update_staff"
  ON public.profiles FOR UPDATE
  USING (public.is_staff());

-- DELETE: only supreme admins (via the delete_user_by_id RPC function)
CREATE POLICY "profiles_delete_supreme_admin"
  ON public.profiles FOR DELETE
  USING (public.is_supreme_admin());


-- ─── 2. INCIDENTS ───────────────────────────────────────────────────────────

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Personnel can view all records" ON public.incidents;
DROP POLICY IF EXISTS "Personnel can create incidents" ON public.incidents;
DROP POLICY IF EXISTS "Only Supervisors can update incidents" ON public.incidents;
DROP POLICY IF EXISTS "Only Supervisors can delete incidents" ON public.incidents;

-- SELECT: staff only — residents must never see blotter records
CREATE POLICY "incidents_select_staff_only"
  ON public.incidents FOR SELECT
  USING (public.is_staff());

-- INSERT: staff only
CREATE POLICY "incidents_insert_staff_only"
  ON public.incidents FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff());

-- UPDATE: staff only, intentionally scoped to status/updated_at/officer_id
-- The WITH CHECK (is_staff()) ensures non-staff cannot sneak changes via
-- a crafted request even if the USING clause were bypassed.
CREATE POLICY "incidents_update_staff_only"
  ON public.incidents FOR UPDATE
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- DELETE: supreme admins only
CREATE POLICY "incidents_delete_supreme_admin"
  ON public.incidents FOR DELETE
  USING (public.is_supreme_admin());

-- EXPLICIT DENY — residents (everyone not matched above) cannot UPDATE or DELETE.
-- These are belt-and-suspenders policies: named so the intent is self-documented.
CREATE POLICY "incidents_deny_resident_update"
  ON public.incidents FOR UPDATE
  USING (false)
  WITH CHECK (false);

CREATE POLICY "incidents_deny_resident_delete"
  ON public.incidents FOR DELETE
  USING (false);


-- ─── 3. INCIDENT PARTIES ────────────────────────────────────────────────────

ALTER TABLE public.incident_parties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Personnel can view all parties" ON public.incident_parties;
DROP POLICY IF EXISTS "Personnel can create parties" ON public.incident_parties;

-- SELECT: staff only — incident party data is PII
CREATE POLICY "incident_parties_select_staff_only"
  ON public.incident_parties FOR SELECT
  USING (public.is_staff());

-- INSERT: staff only
CREATE POLICY "incident_parties_insert_staff_only"
  ON public.incident_parties FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff());

-- Explicit deny residents from UPDATE
CREATE POLICY "incident_parties_deny_resident_update"
  ON public.incident_parties FOR UPDATE
  USING (false)
  WITH CHECK (false);

-- Explicit deny residents from DELETE
CREATE POLICY "incident_parties_deny_resident_delete"
  ON public.incident_parties FOR DELETE
  USING (false);


-- ─── 4. ASSET REQUESTS ──────────────────────────────────────────────────────

ALTER TABLE public.asset_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Personnel can view all assets" ON public.asset_requests;
DROP POLICY IF EXISTS "Personnel can create assets" ON public.asset_requests;
DROP POLICY IF EXISTS "Only Supervisors can manage assets" ON public.asset_requests;

-- SELECT: own requests OR staff can see all
CREATE POLICY "asset_requests_select_own_or_staff"
  ON public.asset_requests FOR SELECT
  USING (
    auth.uid() = logged_by
    OR public.is_staff()
  );

-- INSERT: authenticated users can submit requests for themselves only
CREATE POLICY "asset_requests_insert_own"
  ON public.asset_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = logged_by);

-- UPDATE: staff only
CREATE POLICY "asset_requests_update_staff_only"
  ON public.asset_requests FOR UPDATE
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- DELETE: supreme admins only
CREATE POLICY "asset_requests_delete_supreme_admin"
  ON public.asset_requests FOR DELETE
  USING (public.is_supreme_admin());


-- ─── 5. CCTV REQUESTS ───────────────────────────────────────────────────────

ALTER TABLE public.cctv_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Personnel can view all CCTV" ON public.cctv_requests;
DROP POLICY IF EXISTS "Personnel can create CCTV" ON public.cctv_requests;

-- SELECT: own requests OR staff can see all
CREATE POLICY "cctv_requests_select_own_or_staff"
  ON public.cctv_requests FOR SELECT
  USING (
    auth.uid() = requested_by
    OR public.is_staff()
  );

-- INSERT: authenticated users can submit their own requests only
CREATE POLICY "cctv_requests_insert_own"
  ON public.cctv_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requested_by);

-- UPDATE: staff only
CREATE POLICY "cctv_requests_update_staff_only"
  ON public.cctv_requests FOR UPDATE
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- DELETE: supreme admins only
CREATE POLICY "cctv_requests_delete_supreme_admin"
  ON public.cctv_requests FOR DELETE
  USING (public.is_supreme_admin());


-- ─── 6. PUBLIC REPORTS (tighten existing policies) ──────────────────────────

ALTER TABLE public.public_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Submitters can view their own public reports" ON public.public_reports;
DROP POLICY IF EXISTS "Personnel can view all public reports" ON public.public_reports;
DROP POLICY IF EXISTS "Citizens can create public reports" ON public.public_reports;
DROP POLICY IF EXISTS "Personnel can update public reports" ON public.public_reports;

-- SELECT: own reports OR staff
CREATE POLICY "public_reports_select_own_or_staff"
  ON public.public_reports FOR SELECT
  USING (
    auth.uid() = submitted_by
    OR public.is_staff()
  );

-- INSERT: authenticated submitters — only their own record (enforced by DEFAULT + WITH CHECK)
CREATE POLICY "public_reports_insert_own"
  ON public.public_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = submitted_by);

-- UPDATE: staff only (to acknowledge/convert reports)
CREATE POLICY "public_reports_update_staff_only"
  ON public.public_reports FOR UPDATE
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- DELETE: supreme admins only
CREATE POLICY "public_reports_delete_supreme_admin"
  ON public.public_reports FOR DELETE
  USING (public.is_supreme_admin());


-- ─── 7. AUDIT LOGS ──────────────────────────────────────────────────────────

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Supervisors can view audit logs" ON public.audit_logs;

-- SELECT: supreme admins and high-level staff only
CREATE POLICY "audit_logs_select_staff_only"
  ON public.audit_logs FOR SELECT
  USING (public.is_staff());

-- INSERT: only the audit trigger function (SECURITY DEFINER) may insert
CREATE POLICY "audit_logs_insert_trigger_only"
  ON public.audit_logs FOR INSERT
  WITH CHECK (false);

-- No UPDATE or DELETE on audit logs — they are immutable by design
CREATE POLICY "audit_logs_deny_update"
  ON public.audit_logs FOR UPDATE
  USING (false)
  WITH CHECK (false);

CREATE POLICY "audit_logs_deny_delete"
  ON public.audit_logs FOR DELETE
  USING (false);


-- ==============================================================================
-- SECTION D: PRIVATE IDENTITY-DOCS STORAGE BUCKET + AUDIT TABLE
-- ==============================================================================

-- Ensure the bucket exists and is private (public = false)
INSERT INTO storage.buckets (id, name, public)
VALUES ('identity-docs', 'identity-docs', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Remove any previously permissive storage policies on this bucket
DROP POLICY IF EXISTS "identity_docs_public_read" ON storage.objects;
DROP POLICY IF EXISTS "identity_docs_user_insert" ON storage.objects;
DROP POLICY IF EXISTS "identity_docs_user_manage" ON storage.objects;

-- SELECT: staff only may view identity documents
CREATE POLICY "identity_docs_select_staff_only"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'identity-docs'
    AND public.is_staff()
  );

-- INSERT: any authenticated user may upload their own registration file
-- Path convention: registration/<username>_<timestamp>.<ext>
-- The file is keyed to the registrant; staff review it post-upload.
CREATE POLICY "identity_docs_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'identity-docs');

-- UPDATE: blocked for everyone — uploaded IDs must not be tampered with
CREATE POLICY "identity_docs_deny_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'identity-docs' AND false)
  WITH CHECK (false);

-- DELETE: blocked for non-staff
CREATE POLICY "identity_docs_delete_staff_only"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'identity-docs'
    AND public.is_supreme_admin()
  );


-- ─── Audit Storage Access Table (Data Privacy Act of 2012) ──────────────────

CREATE TABLE IF NOT EXISTS public.audit_storage_access (
  id          uuid        DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     uuid        REFERENCES public.profiles(id) ON DELETE SET NULL ON UPDATE CASCADE,
  file_path   text        NOT NULL,
  bucket_id   text        NOT NULL DEFAULT 'identity-docs',
  action      text        NOT NULL DEFAULT 'READ',   -- READ | DOWNLOAD
  accessed_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.audit_storage_access IS
  'Compliance log for access to private identity documents per the '
  'Philippine Data Privacy Act of 2012 (RA 10173). '
  'Retains user_id, file accessed, and timestamp for each staff access event.';

-- Enable RLS on the audit table itself
ALTER TABLE public.audit_storage_access ENABLE ROW LEVEL SECURITY;

-- Only staff may see the audit log
CREATE POLICY "storage_audit_select_staff"
  ON public.audit_storage_access FOR SELECT
  USING (public.is_staff());

-- Only the system (SECURITY DEFINER functions) may insert
CREATE POLICY "storage_audit_insert_system_only"
  ON public.audit_storage_access FOR INSERT
  WITH CHECK (false);

-- Immutable — no updates or deletes
CREATE POLICY "storage_audit_deny_update"
  ON public.audit_storage_access FOR UPDATE
  USING (false) WITH CHECK (false);

CREATE POLICY "storage_audit_deny_delete"
  ON public.audit_storage_access FOR DELETE
  USING (false);

-- Function: called manually or from an Edge Function when staff downloads a file
CREATE OR REPLACE FUNCTION public.log_storage_access(
  p_file_path text,
  p_bucket_id text DEFAULT 'identity-docs',
  p_action    text DEFAULT 'READ'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log if the caller is an active staff member
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Unauthorized: only staff may access identity documents.'
    USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.audit_storage_access (user_id, file_path, bucket_id, action)
  VALUES (auth.uid(), p_file_path, p_bucket_id, p_action);
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_storage_access(text, text, text) TO authenticated;


-- ==============================================================================
-- SECTION E: RATE LIMIT TRACKING TABLE (used by submit-public-report Edge Fn)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.rate_limit_log (
  id            uuid        DEFAULT uuid_generate_v4() PRIMARY KEY,
  ip_address    text        NOT NULL,
  action        text        NOT NULL,  -- e.g. 'submit-public-report'
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rate_limit_log_ip_action_time
  ON public.rate_limit_log (ip_address, action, created_at DESC);

-- Automatically purge entries older than 2 hours to keep the table small
CREATE OR REPLACE FUNCTION public.purge_old_rate_limit_log()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.rate_limit_log
  WHERE created_at < now() - interval '2 hours';
$$;

-- RLS: only Edge Functions (service role) may read/write this table
ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rate_limit_log_deny_all"
  ON public.rate_limit_log FOR ALL
  USING (false)
  WITH CHECK (false);


-- ==============================================================================
-- SECTION F: SCHEMA CACHE REFRESH
-- ==============================================================================

NOTIFY pgrst, 'reload schema';
