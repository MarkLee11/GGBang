import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { EventCapacityInfo } from '../lib/supabase'

// Hook to get event capacity and user status
export const useEventStatus = (eventId: number, userId?: string) => {
  const [eventInfo, setEventInfo] = useState<EventCapacityInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEventStatus = async () => {
    if (!eventId) return

    setLoading(true)
    setError(null)

    try {
      // Get event details
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('id, capacity, user_id')
        .eq('id', eventId)
        .single()

      if (eventError) throw eventError

      // Get current attendees count
      const { count: attendeesCount, error: attendeesError } = await supabase
        .from('event_attendees')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)

      if (attendeesError) throw attendeesError

      // Get pending requests count
      const { count: pendingCount, error: pendingError } = await supabase
        .from('join_requests')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('status', 'pending')

      if (pendingError) throw pendingError

      // Determine user status if userId provided
      let userStatus: EventCapacityInfo['userStatus'] = 'none'
      
      if (userId) {
        // Check if user is attending
        const { data: attendeeData } = await supabase
          .from('event_attendees')
          .select('id')
          .eq('event_id', eventId)
          .eq('user_id', userId)
          .maybeSingle()

        if (attendeeData) {
          userStatus = 'attending'
        } else {
          // Check join request status
          const { data: requestData } = await supabase
            .from('join_requests')
            .select('status')
            .eq('event_id', eventId)
            .eq('requester_id', userId)
            .maybeSingle()

          if (requestData) {
            userStatus = requestData.status as EventCapacityInfo['userStatus']
          }
        }
      }

      const info: EventCapacityInfo = {
        capacity: eventData.capacity || 0,
        currentAttendees: attendeesCount || 0,
        availableSpots: Math.max(0, (eventData.capacity || 0) - (attendeesCount || 0)),
        pendingRequests: pendingCount || 0,
        isHost: userId === eventData.user_id,
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
    
    // Listen to event_attendees changes
    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'event_attendees',
      filter: `event_id=eq.${eventId}`
    }, () => {
      fetchEventStatus()
    })

    // Listen to join_requests changes
    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'join_requests',
      filter: `event_id=eq.${eventId}`
    }, () => {
      fetchEventStatus()
    })

    channel.subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [eventId, userId])

  const refetch = () => {
    fetchEventStatus()
  }

  return {
    eventInfo,
    loading,
    error,
    refetch,
    // Convenience getters
    isFull: eventInfo ? eventInfo.currentAttendees >= eventInfo.capacity : false,
    canJoin: eventInfo ? eventInfo.availableSpots > 0 && eventInfo.userStatus === 'none' : false,
    isHost: eventInfo?.isHost || false,
    userStatus: eventInfo?.userStatus || 'none'
  }
}
