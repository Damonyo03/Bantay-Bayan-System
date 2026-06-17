import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ---------------------------------------------------------------------------
// submit-public-report Edge Function
// ---------------------------------------------------------------------------
// Acts as the secure gateway for inserting a new citizen report into the
// public_reports table.  Implements:
//
//   • Input validation for required fields
//   • IP-based rate limiting: max 5 submissions per IP address per hour
//     (HTTP 429 if exceeded)
//   • Auto-generates a reference_number so clients cannot forge it
//   • Appends submitted_by from the authenticated JWT (cannot be spoofed)
//
// Expected request body:
//   {
//     "type":      "Medical" | "Fire" | "Theft" | "Disturbance" | "Traffic" | "Logistics" | "Other",
//     "narrative": string (min 10 chars),
//     "location":  string (min 3 chars)
//   }
//
// Responses:
//   201 Created  — { "success": true, "reference_number": "RPT-2024-XXXX" }
//   400 Bad Req  — { "error": "..." }
//   401 Unauth   — { "error": "..." }
//   429 Too Many — { "error": "Rate limit exceeded. Max 5 reports per hour." }
//   500 Error    — { "error": "..." }
// ---------------------------------------------------------------------------

const VALID_TYPES = ['Medical', 'Fire', 'Theft', 'Disturbance', 'Traffic', 'Logistics', 'Other'] as const
const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MINUTES = 60
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed. Use POST.' }, 405)
  }

  try {
    // ── 1. Authenticate the caller ──────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Authentication required to submit a report.' }, 401)
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

    // ── 2. IP-based rate limiting ────────────────────────────────────────────
    // Extract caller IP from Deno / Cloudflare headers
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('cf-connecting-ip') ||
      'unknown'

    const windowStart = new Date(
      Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000
    ).toISOString()

    // Count submissions from this IP in the last hour
    const { count, error: countError } = await supabaseAdmin
      .from('rate_limit_log')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', clientIp)
      .eq('action', 'submit-public-report')
      .gte('created_at', windowStart)

    if (countError) {
      // Non-fatal: if we cannot check the rate limit, allow the request but log it
      console.error('Rate limit check failed:', countError.message)
    } else if ((count ?? 0) >= RATE_LIMIT_MAX) {
      return json(
        {
          error: `Rate limit exceeded. You may submit a maximum of ${RATE_LIMIT_MAX} reports per hour. Please try again later.`,
        },
        429
      )
    }

    // ── 3. Parse and validate the request body ───────────────────────────────
    const body = await req.json()
    const { type, narrative, location } = body

    if (!type || !VALID_TYPES.includes(type as typeof VALID_TYPES[number])) {
      return json(
        { error: `'type' must be one of: ${VALID_TYPES.join(', ')}.` },
        400
      )
    }

    if (!narrative || typeof narrative !== 'string' || narrative.trim().length < 10) {
      return json(
        { error: "'narrative' is required and must be at least 10 characters." },
        400
      )
    }

    if (!location || typeof location !== 'string' || location.trim().length < 3) {
      return json(
        { error: "'location' is required and must be at least 3 characters." },
        400
      )
    }

    // ── 4. Generate a unique reference number ────────────────────────────────
    const year = new Date().getFullYear()
    const suffix = Math.floor(1000 + Math.random() * 9000)
    const referenceNumber = `RPT-${year}-${suffix}`

    // ── 5. Insert the report using the service-role client ───────────────────
    // submitted_by is taken from the verified JWT — cannot be spoofed by the body
    const { data: newReport, error: insertError } = await supabaseAdmin
      .from('public_reports')
      .insert({
        reference_number: referenceNumber,
        type: type,
        narrative: narrative.trim(),
        location: location.trim(),
        status: 'Pending Review',
        submitted_by: user.id,
      })
      .select('reference_number')
      .single()

    if (insertError) {
      return json({ error: `Failed to submit report: ${insertError.message}` }, 500)
    }

    // ── 6. Record the rate limit hit ─────────────────────────────────────────
    await supabaseAdmin.from('rate_limit_log').insert({
      ip_address: clientIp,
      action: 'submit-public-report',
    })

    // ── 7. Purge stale rate limit records (best-effort) ──────────────────────
    supabaseAdmin.rpc('purge_old_rate_limit_log').then(() => {}).catch(() => {})

    return json(
      {
        success: true,
        reference_number: newReport.reference_number,
        message: 'Your report has been submitted and is pending review.',
      },
      201
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
