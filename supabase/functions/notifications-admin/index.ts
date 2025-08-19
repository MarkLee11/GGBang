// === File: supabase/functions/notifications-admin/index.ts ===
// 功能：peek / requeue_failed / requeue_one 管理通知队列
// 需要：SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// 可选：ADMIN_SECRET（二次保护；若设置则必须在请求头 x-admin-secret 里提供）

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type Kind = 'request_created' | 'approved' | 'rejected' | 'location_unlocked'
type Action = 'peek' | 'requeue_failed' | 'requeue_one'

type RequeueFailedBody = {
  action: 'requeue_failed'
  kind?: Kind
  event_id?: number
  since_hours?: number  // 仅重排最近 N 小时内失败的
  limit?: number        // 最多处理多少条（默认 100）
  reset_attempts?: boolean // 是否把 attempts 置 0（默认 false）
}

type RequeueOneBody = {
  action: 'requeue_one'
  queue_id: number
  reset_attempts?: boolean
}

type PeekBody = {
  action: 'peek'
  limit?: number // 最近 N 条（默认 50）
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ADMIN_SECRET = Deno.env.get('ADMIN_SECRET') || '' // 可选

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

Deno.serve(async (req) => {
  // 二次保护（可选）
  if (ADMIN_SECRET) {
    const h = req.headers.get('x-admin-secret')
    if (h !== ADMIN_SECRET) {
      return json({ ok: false, error: 'unauthorized' }, 401)
    }
  }

  if (req.method !== 'POST') {
    return json({ ok: false, error: 'method_not_allowed' }, 405)
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400)
  }

  const action: Action | undefined = body?.action
  if (!action) return json({ ok: false, error: 'missing_action' }, 400)

  try {
    if (action === 'peek') {
      const b = body as PeekBody
      const limit = clampInt(b.limit, 1, 200, 50)

      const [queuedCnt, processingCnt, failedCnt, recent] = await Promise.all([
        countByStatus('queued'),
        countByStatus('processing'),
        countByStatus('sent'),
        countByStatus('failed'),
      ]).then(async ([q, p, s, f]) => {
        const { data: list } = await admin
          .from('notifications_queue')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit)
        // @ts-ignore
        return [q, p, s, f, list]
      })

      return json({
        ok: true,
        summary: { queued: queuedCnt, processing: processingCnt, sent: failedCnt /* name typo fix below */, failed: failedCnt },
        recent: recent ?? [],
      })
    }

    if (action === 'requeue_failed') {
      const b = body as RequeueFailedBody
      const limit = clampInt(b.limit, 1, 1000, 100)
      const sinceHours = clampInt(b.since_hours, 1, 24 * 365, 168) // 默认近 7 天
      const resetAttempts = !!b.reset_attempts

      // 选出要重排的失败任务
      let sel = admin.from('notifications_queue')
        .select('id, kind, event_id, last_error, attempts, created_at')
        .eq('status', 'failed')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (b.kind) sel = sel.eq('kind', b.kind)
      if (b.event_id) sel = sel.eq('event_id', b.event_id)
      if (sinceHours) {
        const sinceIso = new Date(Date.now() - sinceHours * 3600 * 1000).toISOString()
        sel = sel.gte('created_at', sinceIso)
      }

      const { data: rows, error } = await sel
      if (error) return json({ ok: false, error: error.message }, 500)
      if (!rows || rows.length === 0) return json({ ok: true, requeued: 0 })

      // 更新为 queued；可选清零 attempts
      const ids = rows.map(r => r.id)
      const update: Record<string, any> = { status: 'queued' }
      if (resetAttempts) update.attempts = 0
      const { error: updErr } = await admin.from('notifications_queue').update(update).in('id', ids)
      if (updErr) return json({ ok: false, error: updErr.message }, 500)

      return json({ ok: true, requeued: ids.length, ids })
    }

    if (action === 'requeue_one') {
      const b = body as RequeueOneBody
      if (!b.queue_id) return json({ ok: false, error: 'missing_queue_id' }, 400)

      const update: Record<string, any> = { status: 'queued' }
      if (b.reset_attempts) update.attempts = 0

      const { error } = await admin.from('notifications_queue').update(update).eq('id', b.queue_id)
      if (error) return json({ ok: false, error: error.message }, 500)

      return json({ ok: true, requeued: 1, id: b.queue_id })
    }

    return json({ ok: false, error: 'unknown_action' }, 400)
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500)
  }
})

async function countByStatus(status: 'queued' | 'processing' | 'sent' | 'failed') {
  const { count } = await admin
    .from('notifications_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', status)
  return count ?? 0
}

function clampInt(v: any, min: number, max: number, fallback: number) {
  const n = Number.isFinite(v) ? v : Number.parseInt(v, 10)
  if (!Number.isFinite(n)) return fallback
  return Math.min(Math.max(n, min), max)
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } })
}
