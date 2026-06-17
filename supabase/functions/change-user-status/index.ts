import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ---------------------------------------------------------------------------
// change-user-status Edge Function
// ---------------------------------------------------------------------------
// Changes any user's status (active | inactive | pending | rejected | deactivated).
// Only callers with role 'developer' or 'barangay_captain' are permitted.
// All other callers receive HTTP 403.
//
// Expected request body:
//   {
//     "target_user_id": "<uuid>",
//     "new_status": "active" | "inactive" | "pending" | "rejected" | "deactivated"
//   }
//
// Responses:
//   200 OK      — { "success": true, "message": "..." }
//   400 Bad Req — { "error": "..." }
//   403 Forbid  — { "error": "Forbidden: insufficient privileges." }
//   500 Error   — { "error": "<message>" }
// ---------------------------------------------------------------------------

const ALLOWED_ROLES = ['developer', 'barangay_captain'] as const
const VALID_STATUSES = ['active', 'inactive', 'pending', 'rejected', 'deactivated'] as const
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    // ── 1. Authenticate the caller ──────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Missing Authorization header.' }, 401)
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const supabaseCaller = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseCaller.auth.getUser()
    if (userError || !user) {
      return json({ error: 'Unauthorized: invalid or expired token.' }, 401)
    }

    // ── 2. Server-side role check ────────────────────────────────────────────
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
        {
          error: `Forbidden: role '${callerProfile.role}' cannot change user status. ` +
                 `Required: developer or barangay_captain.`,
        },
        403
      )
    }

    if (callerProfile.status !== 'active') {
      return json({ error: 'Forbidden: caller account is not active.' }, 403)
    }

    // ── 3. Parse and validate the request body ───────────────────────────────
    const body = await req.json()
    const { target_user_id, new_status } = body

    if (!target_user_id || !UUID_REGEX.test(target_user_id)) {
      return json({ error: 'target_user_id must be a valid UUID.' }, 400)
    }

    if (!new_status || !VALID_STATUSES.includes(new_status as typeof VALID_STATUSES[number])) {
      return json(
        { error: `new_status must be one of: ${VALID_STATUSES.join(', ')}.` },
        400
      )
    }

    // ── 4. Fetch the target user's current status ────────────────────────────
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('role, status')
      .eq('id', target_user_id)
      .single()

    // Prevent demoting another Developer (only the developer themselves can do this)
    if (
      targetProfile?.role === 'developer' &&
      callerProfile.role !== 'developer'
    ) {
      return json(
        { error: 'Forbidden: only a developer can modify another developer\'s status.' },
        403
      )
    }

    // ── 5. Apply the status change ───────────────────────────────────────────
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ status: new_status, last_active_at: new Date().toISOString() })
      .eq('id', target_user_id)

    if (updateError) {
      return json({ error: `Database error: ${updateError.message}` }, 500)
    }

    // ── 6. Write audit log ───────────────────────────────────────────────────
    await supabaseAdmin.from('audit_logs').insert({
      table_name: 'profiles',
      record_id: target_user_id,
      operation: 'STATUS_CHANGE',
      performed_by: user.id,
      old_data: { status: targetProfile?.status },
      new_data: { status: new_status, changed_by: user.id, changed_at: new Date().toISOString() },
    })

    return json(
      { success: true, message: `User status updated to '${new_status}'.` },
      200
    )
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
