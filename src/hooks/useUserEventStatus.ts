// 文件：src/hooks/useUserEventStatus.ts  （整文件替换）

import { useEffect, useState, useCallback } from 'react'
import { supabase, getCurrentUserId } from '../lib/supabase'

export type UserEventStatus = 'none' | 'pending' | 'approved' | 'rejected' | 'attending'

export interface UseUserEventStatusResult {
  status: UserEventStatus
  loading: boolean
  error: string | null
  refreshStatus: () => Promise<void>
  requestId?: number
}

export function useUserEventStatus(eventId?: number): UseUserEventStatusResult {
  const [status, setStatus] = useState<UserEventStatus>('none')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requestId, setRequestId] = useState<number | undefined>()

  const fetchStatus = useCallback(async () => {
    if (!eventId) {
      setStatus('none')
      setLoading(false)
      setRequestId(undefined)
      return
    }

    setLoading(true)
    setError(null)

    const uid = await getCurrentUserId()
    if (!uid) {
      // 未登录：视为无状态
      setStatus('none')
      setLoading(false)
      setRequestId(undefined)
      return
    }

    try {
      // 1) 检查是否已经是活动参与者
      const { data: attendeeData, error: attendeeError } = await supabase
        .from('event_attendees')
        .select('event_id')
        .eq('event_id', eventId)
        .eq('user_id', uid)
        .single()

      if (!attendeeError && attendeeData) {
        setStatus('attending')
        setLoading(false)
        setRequestId(undefined)
        return
      }

      // 2) 检查join_requests状态
      const { data: requestData, error: requestError } = await supabase
        .from('join_requests')
        .select('id, status')
        .eq('event_id', eventId)
        .eq('requester_id', uid)
        .order('created_at', { ascending: false })
        .limit(1)

      if (requestError) {
        // 常见：表策略/RLS/列名问题——不要让它把链路全打断
        console.warn('useUserEventStatus join_requests error:', requestError.message)
        // 回退为 none，让 UI 自行处理
        setStatus('none')
        setRequestId(undefined)
      } else if (requestData && requestData.length > 0) {
        const request = requestData[0]
        const s = (request.status ?? 'none') as UserEventStatus
        setStatus(s)
        setRequestId(request.id)
      } else {
        setStatus('none')
        setRequestId(undefined)
      }
    } catch (err) {
      console.error('Error fetching user event status:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch status')
      setStatus('none')
      setRequestId(undefined)
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  return { 
    status, 
    loading, 
    error, 
    refreshStatus: fetchStatus,
    requestId
  }
}
