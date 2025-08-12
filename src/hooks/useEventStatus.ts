// === REPLACE FILE: src/hooks/useEventStatus.ts ===
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { EventCapacityInfo } from '../lib/supabase'

// Hook to get event capacity and user status
export const useEventStatus = (eventId: number, userId?: string) => {
  const [eventInfo, setEventInfo] = useState<EventCapacityInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requestId, setRequestId] = useState<number | null>(null)

  const fetchEventStatus = async () => {
    if (!eventId) return

    setLoading(true)
    setError(null)

    try {
      // 1) 取活动信息（maybeSingle 避免 406）
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('id, capacity, user_id')
        .eq('id', eventId)
        .maybeSingle()

      if (eventError) throw eventError
      /*if (!eventData) {
        setEventInfo(null)
        setError('Event not found')
        return
      }*/
        if (!eventData) {
          setEventInfo(null)
          setError('Event not found')
          setRequestId(null)
          return
        }
        

      // 2) 当前参会人数（HEAD + count，永不 406）
      const { count: attendeesCount, error: attendeesError } = await supabase
        .from('event_attendees')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', eventId)

      if (attendeesError) throw attendeesError

      // 3) 待审批请求数（HEAD + count）
      const { count: pendingCount, error: pendingError } = await supabase
        .from('join_requests')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('status', 'pending')

      if (pendingError) throw pendingError

      // 4) 该用户的状态
      // 4) 该用户的状态（未传 userId 时，自动用当前登录用户）
let userStatus: EventCapacityInfo['userStatus'] = 'none'

// 自动回退到当前 session 的用户
const { data: authUserData } = await supabase.auth.getUser()
const uid = userId ?? authUserData?.user?.id ?? null

if (uid) {
  // 是否已在参会名单 —— 用 HEAD + count（不会 406）
  const { count: selfCount, error: selfErr } = await supabase
    .from('event_attendees')
    .select('id', { head: true, count: 'exact' })
    .eq('event_id', eventId)
    .eq('user_id', uid)

  if (selfErr) throw selfErr

  if ((selfCount ?? 0) > 0) {
    userStatus = 'attending'
    setRequestId(null)
  } else {
    // 最近一次 join_request（拿到 id + status）
    const { data: requestData, error: reqErr } = await supabase
      .from('join_requests')
      .select('id,status')
      .eq('event_id', eventId)
      .eq('requester_id', uid)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle() // 0 行 -> null，不 406

    if (reqErr) throw reqErr

    if (requestData) {
      setRequestId(requestData.id)
      userStatus = requestData.status as EventCapacityInfo['userStatus']
    } else {
      setRequestId(null)
    }
  }
} else {
  setRequestId(null)
}


      const capacity = eventData.capacity || 0
      const current = attendeesCount || 0

      const info: EventCapacityInfo = {
        capacity,
        currentAttendees: current,
        availableSpots: Math.max(0, capacity - current),
        pendingRequests: pendingCount || 0,
        isHost: (userId ?? authUserData?.user?.id ?? '') === eventData.user_id,

        userStatus
      }

      setEventInfo(info)

    } catch (err) {
      console.error('Error fetching event status:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch event status')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEventStatus()

    // Subscribe to real-time updates
    const channel = supabase.channel(`event_status_${eventId}`)

    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'event_attendees',
      filter: `event_id=eq.${eventId}`
    }, () => fetchEventStatus())

    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'join_requests',
      filter: `event_id=eq.${eventId}`
    }, () => fetchEventStatus())

    channel.subscribe()
    return () => { channel.unsubscribe() }
  }, [eventId, userId])

  const refetch = () => { fetchEventStatus() }

  return {
  eventInfo,
  loading,
  error,
  refetch,
  refreshStatus: refetch,                          // 给 EventModal 用的 refreshStatus
  // Convenience getters
  isFull: eventInfo ? eventInfo.currentAttendees >= eventInfo.capacity : false,
  canJoin: eventInfo ? eventInfo.availableSpots > 0 && eventInfo.userStatus === 'none' : false,
  isHost: eventInfo?.isHost || false,
  userStatus: eventInfo?.userStatus || 'none',
  status: eventInfo?.userStatus || 'none',         // 直接提供 status，便于解构 { status: userStatus }
  requestId                                         // 供撤回/按钮状态使用
}

}
