// 文件：src/hooks/useUserEventStatus.ts  （整文件替换）

import { useEffect, useState } from 'react'
import { supabase, getCurrentUserId } from '../lib/supabase'

type Status = 'none' | 'pending' | 'approved' | 'rejected'

export function useUserEventStatus(eventId?: number) {
  const [status, setStatus] = useState<Status>('none')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!eventId) {
        setStatus('none')
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      const uid = await getCurrentUserId()
      if (!uid) {
        // 未登录：视为无状态
        if (alive) {
          setStatus('none')
          setLoading(false)
        }
        return
      }

      // 1) 尝试查 join_requests
      const { data, error } = await supabase
        .from('join_requests')
        .select('id, status')
        .eq('event_id', eventId)
        .eq('requester_id', uid)
        .order('created_at', { ascending: false })
        .limit(1)

      if (!alive) return

      if (error) {
        // 常见：表策略/RLS/列名问题——不要让它把链路全打断
        console.warn('useUserEventStatus join_requests error:', error.message)
        // 回退为 none，让 UI 自行处理
        setStatus('none')
        setLoading(false)
        return
      }

      if (data && data.length > 0) {
        const s = (data[0].status ?? 'none') as Status
        setStatus(s)
      } else {
        setStatus('none')
      }
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [eventId])

  return { status, loading, error }
}
