// === File: supabase/functions/notify-worker/index.ts ===
// 运行环境：Supabase Edge Functions（Deno）
// 仅新增，不依赖你现有代码。
// 需要的环境变量：SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, RESEND_API_KEY, MAIL_FROM
// （可选）CRON_SECRET：若设置，则必须在请求头 x-cron-secret 中携带同值，避免外部触发。

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type QueueKind = 'request_created' | 'approved' | 'rejected' | 'location_unlocked'
type QueueStatus = 'queued' | 'processing' | 'sent' | 'failed'

type QueueItem = {
  id: number
  kind: QueueKind
  event_id: number | null
  join_request_id: number | null
  requester_id: string | null
  user_id: string | null
  payload: any
  status: QueueStatus
  attempts: number
  last_error: string | null
  created_at: string
  updated_at: string
}

type LogStatus = 'sent' | 'failed'

const BATCH_SIZE = 10
const MAX_ATTEMPTS = 3

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions'
const RESEND_ENDPOINT = 'https://api.resend.com/emails'

// ---- boot ----
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || ''
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''
const MAIL_FROM = Deno.env.get('MAIL_FROM') || ''
const CRON_SECRET = Deno.env.get('CRON_SECRET') || '' // 可选

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

Deno.serve(async (req) => {
  // 可选安全：若配置了 CRON_SECRET，要求 header 携带匹配值
  if (CRON_SECRET) {
    const h = req.headers.get('x-cron-secret')
    if (h !== CRON_SECRET) {
      return json({ ok: false, error: 'unauthorized' }, 401)
    }
  }

  try {
    const result = await processBatch()
    return json({ ok: true, ...result }, 200)
  } catch (e) {
    return json({ ok: false, error: eToMsg(e) }, 500)
  }
})

// ---- core ----
async function processBatch() {
  // 1) 选出队列中的前 N 条（简单模式：两步法；单实例 cron 足够安全）
  const { data: queued, error: qErr } = await admin
    .from('notifications_queue')
    .select('*')
    .eq('status', 'queued')
    .lt('attempts', MAX_ATTEMPTS)
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE)

  if (qErr) throw new Error(`fetch_queue_failed: ${qErr.message}`)
  if (!queued || queued.length === 0) return { claimed: 0, processed: 0 }

  // 2) 标记为 processing + attempts+1
  const ids = queued.map((r) => r.id)
  const { error: updErr } = await admin
    .from('notifications_queue')
    .update({ status: 'processing', attempts: admin.rpc ? undefined : undefined })
    .in('id', ids)
  // 上面 update 无法 attempts+1，因此分两步：先 set processing，再逐条 +1
  if (updErr) throw new Error(`mark_processing_failed: ${updErr.message}`)

  for (const id of ids) {
    await admin.rpc('sql_increment_attempts', { p_table: 'notifications_queue', p_id: id })
      .catch(async () => {
        // 若没有 helper RPC，则直接手工 update（简化容错）
        const { data, error } = await admin.from('notifications_queue').select('attempts').eq('id', id).single()
        if (!error && data) {
          await admin.from('notifications_queue').update({ attempts: (data.attempts ?? 0) + 1 }).eq('id', id)
        }
      })
  }

  // 3) 逐条处理
  let processed = 0
  for (const job of queued as QueueItem[]) {
    try {
      const summary = await handleJob(job)
      await setQueueStatus(job.id, summary.anySent ? 'sent' : 'failed', summary.errorCombined || null)
      processed++
    } catch (e) {
      await setQueueStatus(job.id, 'failed', eToMsg(e))
    }
  }

  return { claimed: queued.length, processed }
}

async function handleJob(job: QueueItem) {
  // 拉取上下文：事件、join_request、参与人、收件人邮箱
  const ctx = await buildContext(job)

  // 生成文案（尽量少调 AI：申请者/参会者用 AI，主办方走模板）
  const copies = await buildCopies(job.kind, ctx)

  // 发送：返回每个收件人的结果并写入日志
  const results = await sendAll(job, copies, ctx)

  const anySent = results.some((r) => r.status === 'sent')
  const errorCombined = results.filter((r) => r.status === 'failed').map((r) => r.error).filter(Boolean).join(' | ') || null
  return { anySent, errorCombined }
}

// ---- ctx & copies ----
type UserBrief = { id: string; email: string | null; name: string }
type EventBrief = { id: number; title: string; startsAt?: string | null; hostId: string | null }

type Context = {
  event: EventBrief
  requester: UserBrief | null
  host: UserBrief | null
  attendees: UserBrief[] // location_unlocked 用
  hostNote?: string
}

async function buildContext(job: QueueItem): Promise<Context> {
  const event = await fetchEvent(job.event_id)
  const requester = job.requester_id ? await fetchUser(job.requester_id) : null
  const host = job.user_id ? await fetchUser(job.user_id) : (event.hostId ? await fetchUser(event.hostId) : null)
  const attendees = job.kind === 'location_unlocked' && event.id
    ? await fetchAttendees(event.id)
    : []
  const hostNote = job.payload?.hostNote ?? job.payload?.note ?? undefined

  return { event, requester, host, attendees, hostNote }
}

async function fetchEvent(eventId: number | null): Promise<EventBrief> {
  if (!eventId) return { id: 0, title: 'the event', startsAt: null, hostId: null }
  const { data, error } = await admin
    .from('events')
    .select('id, title, starts_at, user_id')
    .eq('id', eventId)
    .single()
  if (error || !data) return { id: eventId, title: 'the event', startsAt: null, hostId: null }
  return {
    id: data.id,
    title: data.title || 'the event',
    startsAt: data.starts_at ?? null,
    hostId: data.user_id ?? null,
  }
}

async function fetchUser(userId: string): Promise<UserBrief> {
  let email: string | null = null
  try {
    const { data } = await admin.auth.admin.getUserById(userId)
    email = (data?.user?.email as string) || null
  } catch {}
  // display_name
  let name = 'the user'
  try {
    const { data } = await admin.from('profiles').select('display_name').eq('id', userId).single()
    name = (data?.display_name || '').trim() || name
  } catch {}
  return { id: userId, email, name }
}

async function fetchAttendees(eventId: number): Promise<UserBrief[]> {
  const { data, error } = await admin
    .from('event_attendees')
    .select('user_id')
    .eq('event_id', eventId)
  if (error || !data) return []
  const uniq = Array.from(new Set(data.map((r: any) => r.user_id).filter(Boolean)))
  const res: UserBrief[] = []
  for (const uid of uniq) {
    res.push(await fetchUser(uid))
  }
  return res
}

// ---- copy generation ----
type Copies = {
  toRequester?: { subject: string; text: string; aiUsed: boolean }
  toHost?: { subject: string; text: string; aiUsed: boolean }
  toAttendees?: { subject: string; text: string; aiUsed: boolean } // location_unlocked
}

async function buildCopies(kind: QueueKind, ctx: Context): Promise<Copies> {
  const title = ctx.event.title
  const timeStr = ctx.event.startsAt ? ` (${ctx.event.startsAt})` : ''
  const hostName = ctx.host?.name || 'the host'
  const requesterName = ctx.requester?.name || 'the requester'
  const note = ctx.hostNote ? ` Note: ${ctx.hostNote}` : ''

  // host 文案统一模板（不调 AI）
  const hostCopies: Record<QueueKind, { subject: string; text: string }> = {
    request_created: {
      subject: `New join request: ${title}`,
      text: `You received a new join request from ${requesterName} for “${title}”${timeStr}. Please review it in your host panel.`,
    },
    approved: {
      subject: `Approved: ${requesterName} for “${title}”`,
      text: `You approved ${requesterName} to join “${title}”${timeStr}.`,
    },
    rejected: {
      subject: `Rejected: ${requesterName} for “${title}”`,
      text: `You rejected ${requesterName}'s request for “${title}”${timeStr}.`,
    },
    location_unlocked: {
      subject: `Location unlocked: “${title}”`,
      text: `You revealed the exact location for “${title}”${timeStr}.`,
    },
  }

  // requester / attendees 文案（优先 AI，失败走兜底）
  switch (kind) {
    case 'request_created': {
      const text = await aiNotice('request_created', {
        eventTitle: title,
        eventDateTime: ctx.event.startsAt ?? undefined,
        requesterName,
        hostName,
      })
      return {
        toRequester: { subject: 'Your join request was submitted', text: text.text, aiUsed: text.aiUsed },
        toHost: { ...hostCopies.request_created, aiUsed: false },
      }
    }
    case 'approved': {
      const text = await aiNotice('approved', {
        eventTitle: title,
        eventDateTime: ctx.event.startsAt ?? undefined,
        requesterName,
        hostName,
      })
      return {
        toRequester: { subject: 'You’ve been approved to join the event', text: text.text, aiUsed: text.aiUsed },
        toHost: { ...hostCopies.approved, aiUsed: false },
      }
    }
    case 'rejected': {
      const text = await aiNotice('rejected', {
        eventTitle: title,
        eventDateTime: ctx.event.startsAt ?? undefined,
        requesterName,
        hostName,
        hostNote: ctx.hostNote,
      })
      return {
        toRequester: { subject: 'Your join request was updated', text: text.text, aiUsed: text.aiUsed },
        toHost: { ...hostCopies.rejected, aiUsed: false },
      }
    }
    case 'location_unlocked': {
      // 给参会者一封统一 AI 文案（避免对每人都调一次）
      const attText = await aiNotice('approved', {
        eventTitle: title,
        eventDateTime: ctx.event.startsAt ?? undefined,
        requesterName: 'attendee',
        hostName,
      }, /*hint=*/'Context: The host revealed the exact location. Tell attendees where to find details in the app.')
      return {
        toAttendees: { subject: `Location revealed: “${title}”`, text: attText.text, aiUsed: attText.aiUsed },
        toHost: { ...hostCopies.location_unlocked, aiUsed: false },
      }
    }
  }
}

// ---- OpenAI (inline, no dependency) ----
async function aiNotice(
  kind: 'request_created' | 'approved' | 'rejected',
  ctx: { eventTitle: string; eventDateTime?: string; requesterName?: string; hostName?: string; hostNote?: string },
  extraHint?: string
): Promise<{ text: string; aiUsed: boolean }> {
  const fb = fallbackText(kind, ctx)
  if (!OPENAI_API_KEY) return { text: fb, aiUsed: false }

  const lines = [
    `Event title: ${ctx.eventTitle}`,
    ctx.eventDateTime ? `Event time: ${ctx.eventDateTime}` : '',
    ctx.hostName ? `Host: ${ctx.hostName}` : '',
    ctx.requesterName ? `Requester: ${ctx.requesterName}` : '',
    ctx.hostNote ? `Host note: ${ctx.hostNote}` : '',
    '',
    'Write a short (1–2 sentences) notification text, friendly and clear.',
    'Do not include markdown or emojis.',
  ]
  if (extraHint) lines.push(extraHint)

  switch (kind) {
    case 'request_created':
      lines.push('Context: The requester just submitted a join request. Confirm submission and next steps.')
      break
    case 'approved':
      lines.push('Context: The host approved the requester. Confirm approval and what happens next.')
      break
    case 'rejected':
      lines.push('Context: The host rejected the request. Be polite, optionally reference the host note if present.')
      break
  }

  try {
    const resp = await fetch(OPENAI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        messages: [
          { role: 'system', content: 'You are a helpful notification copywriter. Keep messages to 1–2 sentences. No emojis, no markdown.' },
          { role: 'user', content: lines.filter(Boolean).join('\n') },
        ],
      }),
    })
    if (!resp.ok) return { text: fb, aiUsed: false }
    const data = await resp.json()
    const text: string = data?.choices?.[0]?.message?.content?.trim() || fb
    return { text: text.length > 360 ? text.slice(0, 360) + '…' : text, aiUsed: true }
  } catch {
    return { text: fb, aiUsed: false }
  }
}

function fallbackText(
  kind: 'request_created' | 'approved' | 'rejected',
  ctx: { eventTitle: string; eventDateTime?: string; hostName?: string; hostNote?: string }
) {
  const title = ctx.eventTitle || 'the event'
  const time = ctx.eventDateTime ? ` (${ctx.eventDateTime})` : ''
  const host = ctx.hostName ? ` by ${ctx.hostName}` : ''
  const note = ctx.hostNote ? ` Note: ${ctx.hostNote}` : ''
  if (kind === 'request_created') return `Your request to join “${title}”${time} has been sent and is pending host review.${note}`
  if (kind === 'approved') return `You’re approved to join “${title}”${time}${host}. See you there!${note}`
  return `Your request to join “${title}”${time}${host} was not approved.${note}`
}

// ---- sending & logging ----
async function sendAll(job: QueueItem, copies: Copies, ctx: Context) {
  const results: { status: LogStatus; error?: string }[] = []

  // target sets by kind
  if (copies.toRequester && ctx.requester?.email) {
    const r = await sendOne(job, ctx.requester.id, ctx.requester.email, copies.toRequester.subject, copies.toRequester.text, copies.toRequester.aiUsed)
    results.push(r)
  }
  if (copies.toHost && ctx.host?.email) {
    const r = await sendOne(job, ctx.host.id, ctx.host.email, copies.toHost.subject, copies.toHost.text, copies.toHost.aiUsed)
    results.push(r)
  }
  if (copies.toAttendees && ctx.attendees.length) {
    // 批量：统一文案群发（逐个调用，避免泄露邮箱）
    for (const a of ctx.attendees) {
      if (!a.email) continue
      const r = await sendOne(job, a.id, a.email, copies.toAttendees.subject, copies.toAttendees.text, copies.toAttendees.aiUsed)
      results.push(r)
    }
  }

  // 若一个也没投递（都无邮箱），补一条失败日志，避免队列卡死
  if (results.length === 0) {
    await writeLog(job, null, null, '(no recipients)', '(no recipients)', false, 'failed', 'no_recipients')
    results.push({ status: 'failed', error: 'no_recipients' })
  }
  return results
}

async function sendOne(
  job: QueueItem,
  recipientUserId: string | null,
  recipientEmail: string | null,
  subject: string,
  body: string,
  aiUsed: boolean
): Promise<{ status: LogStatus; error?: string }> {
  if (!recipientEmail || !RESEND_API_KEY || !MAIL_FROM) {
    await writeLog(job, recipientUserId, recipientEmail, subject, body, aiUsed, 'failed', missingMailEnv(recipientEmail))
    return { status: 'failed', error: missingMailEnv(recipientEmail) }
  }

  try {
    const resp = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: MAIL_FROM,
        to: [recipientEmail],
        subject,
        text: body,
      }),
    })
    const status = resp.status
    const text = await safeText(resp)
    let id: string | undefined
    try {
      const j = JSON.parse(text || '{}')
      id = j?.id
    } catch {}

    if (!resp.ok) {
      await writeLog(job, recipientUserId, recipientEmail, subject, body, aiUsed, 'failed', `resend_${status}: ${short(text)}`)
      return { status: 'failed', error: `resend_${status}` }
    }

    await writeLog(job, recipientUserId, recipientEmail, subject, body, aiUsed, 'sent', undefined, id)
    return { status: 'sent' }
  } catch (e) {
    const emsg = eToMsg(e)
    await writeLog(job, recipientUserId, recipientEmail, subject, body, aiUsed, 'failed', emsg)
    return { status: 'failed', error: emsg }
  }
}

async function writeLog(
  job: QueueItem,
  recipientUserId: string | null,
  recipientEmail: string | null,
  subject: string,
  body: string,
  aiUsed: boolean,
  status: LogStatus,
  error?: string,
  providerMessageId?: string
) {
  await admin.from('notifications_log').insert({
    queue_id: job.id,
    kind: job.kind,
    event_id: job.event_id,
    join_request_id: job.join_request_id,
    recipient_user_id: recipientUserId,
    recipient_email: recipientEmail,
    subject,
    body,
    ai_used: aiUsed,
    provider: 'resend',
    provider_message_id: providerMessageId,
    status: status,
    error: error ?? null,
  })
}

async function setQueueStatus(id: number, status: QueueStatus, error: string | null) {
  await admin.from('notifications_queue').update({ status, last_error: error }).eq('id', id)
}

// ---- utils ----
function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } })
}
function eToMsg(e: unknown) {
  return e instanceof Error ? e.message : String(e)
}
async function safeText(resp: Response) {
  try { return await resp.text() } catch { return '<no-body>' }
}
function short(s: string, n = 300) { return s.length > n ? s.slice(0, n) + '…' : s }
function missingMailEnv(email?: string | null) {
  if (!email) return 'no_recipient_email'
  if (!RESEND_API_KEY) return 'missing_RESEND_API_KEY'
  if (!MAIL_FROM) return 'missing_MAIL_FROM'
  return 'unknown_mail_error'
}
