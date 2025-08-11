import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface JoinRequestWithProfile {
  id: number
  event_id: number
  requester_id: string
  message: string | null
  note: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
  profiles: {
    user_id: string
    created_at: string
    updated_at: string
    display_name: string | null
    profile_images: string[] | null
    bio: string | null
    age: number | null
    city: string | null
    country: string | null
    interests: string[] | null
    preferences: string[] | null
    height_cm: number | null
    weight_kg: number | null
    body_type: 'slim' | 'average' | 'athletic' | 'muscular' | 'bear' | 'chubby' | 'stocky' | 'other' | null
    relationship_status: 'single' | 'taken' | 'married' | 'open' | 'complicated' | 'not_specified' | null
    is_verified: boolean | null
    last_seen: string | null
  } | null
}

export interface EventCapacityInfo {
  capacity: number | null
  currentAttendees: number
  pendingRequests: number
  approvedRequests: number
}

export interface UseEventRequestsResult {
  requests: JoinRequestWithProfile[]
  capacityInfo: EventCapacityInfo | null
  loading: boolean
  error: string | null
  refreshRequests: () => Promise<void>
}

export function useEventRequests(eventId: number | null, isHost: boolean): UseEventRequestsResult {
  const [requests, setRequests] = useState<JoinRequestWithProfile[]>([])
  const [capacityInfo, setCapacityInfo] = useState<EventCapacityInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRequests = useCallback(async () => {
    if (!eventId || !isHost) {
      setRequests([])
      setCapacityInfo(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log('🔍 Fetching join requests for event:', eventId)
      
      // Fetch join requests with profile information
      const { data: requestsData, error: requestsError } = await supabase
        .from('join_requests')
        .select(`
          id,
          event_id,
          requester_id,
          message,
          note,
          status,
          created_at,
          updated_at,
          profiles!inner (
            user_id,
            created_at,
            updated_at,
            display_name,
            profile_images,
            bio,
            age,
            city,
            country,
            interests,
            preferences,
            height_cm,
            weight_kg,
            body_type,
            relationship_status,
            is_verified,
            last_seen
          )
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })

      if (requestsError) {
        console.error('❌ Error fetching join requests:', requestsError)
        throw requestsError
      }

      console.log('✅ Join requests fetched:', requestsData?.length || 0)

      // Fetch event capacity info
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('capacity')
        .eq('id', eventId)
        .single()

      if (eventError) {
        console.error('❌ Error fetching event data:', eventError)
        throw eventError
      }

      console.log('✅ Event data fetched:', eventData)

      // Count current attendees
      const { count: attendeeCount, error: attendeeError } = await supabase
        .from('event_attendees')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)

      if (attendeeError) {
        console.error('❌ Error counting attendees:', attendeeError)
        throw attendeeError
      }

      console.log('✅ Attendee count:', attendeeCount)

      // Count requests by status
      const pendingCount = requestsData?.filter(r => r.status === 'pending').length || 0
      const approvedCount = requestsData?.filter(r => r.status === 'approved').length || 0

      const capacityInfoData = {
        capacity: eventData?.capacity || null,
        currentAttendees: attendeeCount || 0,
        pendingRequests: pendingCount,
        approvedRequests: approvedCount
      }

      console.log('✅ Capacity info:', capacityInfoData)

      setRequests(requestsData || [])
      setCapacityInfo(capacityInfoData)

    } catch (err) {
      console.error('❌ Error in fetchRequests:', err)
      let errorMessage = 'Failed to fetch requests'
      
      if (err instanceof Error) {
        errorMessage = err.message
      } else if (typeof err === 'object' && err !== null) {
        // 处理 Supabase 错误对象
        if ('message' in err) {
          errorMessage = String(err.message)
        } else if ('error' in err) {
          errorMessage = String(err.error)
        } else {
          errorMessage = JSON.stringify(err)
        }
      }
      
      setError(errorMessage)
      
      // Set empty data on error to prevent UI from showing wrong state
      setRequests([])
      setCapacityInfo(null)
    } finally {
      setLoading(false)
    }
  }, [eventId, isHost])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  return {
    requests,
    capacityInfo,
    loading,
    error,
    refreshRequests: fetchRequests
  }
}
