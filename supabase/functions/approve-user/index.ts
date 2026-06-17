import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ---------------------------------------------------------------------------
// approve-user Edge Function
// ---------------------------------------------------------------------------
// Approves a pending user application by setting their status to 'active'.
// Only callers whose JWT encodes a role of 'developer' or 'barangay_captain'
// are permitted. All other callers receive HTTP 403.
//
// Expected request body:
//   { "target_user_id": "<uuid>" }
//
// Responses:
//   200 OK      — { "success": true, "message": "User approved." }
//   400 Bad Req — { "error": "target_user_id is required." }
//   403 Forbid  — { "error": "Forbidden: insufficient privileges." }
//   500 Error   — { "error": "<message>" }
// ---------------------------------------------------------------------------

const ALLOWED_ROLES = ['developer', 'barangay_captain'] as const
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    // ── 1. Authenticate the caller ──────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Missing Authorization header.' }, 401)
    }

    // Use the service-role client to bypass RLS for admin operations,
    // but we verify the caller's JWT claims manually below.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Use the anon client scoped to the caller's JWT to verify identity
    const supabaseCaller = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseCaller.auth.getUser()
    if (userError || !user) {
      return json({ error: 'Unauthorized: invalid token.' }, 401)
    }

    // ── 2. Server-side role check ────────────────────────────────────────────
    // Look up the caller's role directly from the database — do NOT trust
    // the JWT claim alone since it may be stale.
    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single()

    if (profileError || !callerProfile) {
      return json({ error: 'Caller profile not found.' }, 403)
    }

    if (!ALLOWED_ROLES.includes(callerProfile.role as typeof ALLOWED_ROLES[number])) {
      return json(
        { error: `Forbidden: role '${callerProfile.role}' cannot approve users. Required: developer or barangay_captain.` },
        403
      )
    }

    if (callerProfile.status !== 'active') {
      return json({ error: 'Forbidden: caller account is not active.' }, 403)
    }

    // ── 3. Parse and validate the request body ───────────────────────────────
    const body = await req.json()
    const { target_user_id } = body

    if (!target_user_id || typeof target_user_id !== 'string') {
      return json({ error: 'target_user_id is required and must be a string (UUID).' }, 400)
    }

    // Basic UUID format validation
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!UUID_REGEX.test(target_user_id)) {
      return json({ error: 'target_user_id must be a valid UUID.' }, 400)
    }

    // ── 4. Execute the approval ──────────────────────────────────────────────
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ status: 'active', last_active_at: new Date().toISOString() })
      .eq('id', target_user_id)
      .eq('status', 'pending')    // Only approve users who are still pending

    if (updateError) {
      return json({ error: `Database error: ${updateError.message}` }, 500)
    }

    // ── 5. Write an audit log entry ──────────────────────────────────────────
    await supabaseAdmin.from('audit_logs').insert({
      table_name: 'profiles',
      record_id: target_user_id,
      operation: 'APPROVE',
      performed_by: user.id,
      new_data: { status: 'active', approved_by: user.id, approved_at: new Date().toISOString() },
    })

    return json({ success: true, message: 'User approved successfully.' }, 200)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return json({ error: message }, 500)
  }
})

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}
