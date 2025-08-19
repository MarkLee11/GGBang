// === File: src/lib/notificationsAdmin.ts ===
import { supabase } from './supabase'

export type Kind = 'request_created' | 'approved' | 'rejected' | 'location_unlocked'

export type QueueItem = {
  id: number
  kind: Kind
  event_id: number | null
  join_request_id: number | null
  requester_id: string | null
  host_id: string | null
  payload: Record<string, any>
  status: 'queued' | 'processing' | 'sent' | 'failed'
  attempts: number
  last_error: string | null
  created_at: string
  updated_at: string
}

export type PeekResult = {
  ok: boolean
  summary?: { queued: number; processing: number; sent: number; failed: number }
  recent?: QueueItem[]
  error?: string
}

type InvokeOpts = { adminSecret?: string }

async function callAdmin<T>(body: any, opts?: InvokeOpts): Promise<T> {
  const { data, error } = await supabase.functions.invoke('notifications-admin', {
    body,
    headers: opts?.adminSecret ? { 'x-admin-secret': opts.adminSecret } : undefined,
  })
  if (error) throw new Error(error.message || 'notifications-admin invoke error')
  return data as T
}

/** 查看队列概况与最近记录 */
export async function peekQueue(limit = 50, opts?: InvokeOpts) {
  return callAdmin<PeekResult>({ action: 'peek', limit }, opts)
}

/** 批量重入队失败任务 */
export async function requeueFailed(params: {
  kind?: Kind
  event_id?: number
  since_hours?: number
  limit?: number
  reset_attempts?: boolean
}, opts?: InvokeOpts) {
  return callAdmin<{ ok: boolean; requeued?: number; ids?: number[]; error?: string }>(
    { action: 'requeue_failed', ...params },
    opts
  )
}

/** 单条重入队 */
export async function requeueOne(queue_id: number, reset_attempts = true, opts?: InvokeOpts) {
  return callAdmin<{ ok: boolean; requeued?: number; id?: number; error?: string }>(
    { action: 'requeue_one', queue_id, reset_attempts },
    opts
  )
}
