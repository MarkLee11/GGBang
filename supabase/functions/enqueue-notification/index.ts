// === File: supabase/functions/enqueue-notification/index.ts ===
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type Kind = 'request_created' | 'approved' | 'rejected' | 'location_unlocked'

type Body = {
  kind: Kind
  event_id: number
  join_request_id?: number | null
  requester_id?: string | null
  user_id?: string | null
  payload?: Record<string, unknown>
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // 用于服务端写表
const ENQUEUE_SECRET = Deno.env.get('ENQUEUE_SECRET') || ''          // 可选：额外保护

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

Deno.serve(async (req) => {
  // 可选的二次校验：如果设置了 ENQUEUE_SECRET，要求头部匹配
  if (ENQUEUE_SECRET) {
    const h = req.headers.get('x-enqueue-secret')
    if (h !== ENQUEUE_SECRET) {
      return json({ ok: false, error: 'unauthorized' }, 401)
    }
  }

  if (req.method !== 'POST') {
    return json({ ok: false, error: 'method_not_allowed' }, 405)
  }

  let body: Body
  try {
    body = await req.json()
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400)
  }

  // 简单校验
  if (!body?.kind || !body?.event_id) {
    return json({ ok: false, error: 'missing_kind_or_event_id' }, 400)
  }

  // 入队
  const { error } = await admin.from('notifications_queue').insert({
    kind: body.kind,
    event_id: body.event_id,
    join_request_id: body.join_request_id ?? null,
    requester_id: body.requester_id ?? null,
    user_id: body.user_id ?? null,
    payload: body.payload ?? {},
    status: 'queued',
    attempts: 0,
  })

  if (error) {
    return json({ ok: false, error: `insert_failed: ${error.message}` }, 500)
  }

  return json({ ok: true }, 200)
})

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } })
}
