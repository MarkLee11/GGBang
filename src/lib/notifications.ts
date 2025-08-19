// 文件：src/lib/notifications.ts
import { supabase } from './supabase'

// 定义通知任务的数据结构
export interface NotificationJob {
  kind: 'request_created' | 'approved' | 'rejected' | 'location_unlocked'
  event_id: number
  join_request_id?: number
  requester_id?: string
  user_id?: string
  payload?: Record<string, any>
}

/**
 * 向 notifications_queue 表插入一条任务
 * @param job NotificationJob 对象
 */
export async function insertNotificationQueue(job: NotificationJob) {
  const { data, error } = await supabase
    .from('notifications_queue')
    .insert([
      {
        kind: job.kind,
        event_id: job.event_id,
        join_request_id: job.join_request_id ?? null,
        requester_id: job.requester_id ?? null,
        user_id: job.user_id ?? null,
        payload: job.payload ?? {},
        status: 'queued',
        attempts: 0
      }
    ])
    .select()

  if (error) {
    console.error('插入通知队列失败:', error)
    throw error
  }

  return data
}
