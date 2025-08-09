import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { JoinRequestWithProfile, RequestStats } from '../lib/supabase'

// Hook for hosts to manage join requests for their events
export const useHostRequests = (eventId: number) => {
  const [requests, setRequests] = useState<JoinRequestWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<RequestStats>({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0
  })

  const fetchRequests = async () => {
    if (!eventId) return

    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('join_requests')
        .select(`
          *,
          profiles:requester_id (
            user_id,
            display_name,
            profile_images,
            age,
            city,
            country,
            bio
          )
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })

      if (fetchError) {
        throw fetchError
      }

      const requestsData = data as JoinRequestWithProfile[]
      setRequests(requestsData)

      // Calculate stats
      const newStats = requestsData.reduce((acc, request) => {
        acc[request.status]++
        acc.total++
        return acc
      }, {
        pending: 0,
        approved: 0,
        rejected: 0,
        total: 0
      } as RequestStats)

      setStats(newStats)

    } catch (err) {
      console.error('Error fetching host requests:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch requests')
    } finally {
      setLoading(false)
    }
  }

  // Subscribe to real-time updates
  useEffect(() => {
    fetchRequests()

    // Set up real-time subscription
    const subscription = supabase
      .channel(`join_requests_${eventId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'join_requests',
        filter: `event_id=eq.${eventId}`
      }, (payload) => {
        console.log('Join request change:', payload)
        fetchRequests() // Refetch data when changes occur
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [eventId])

  const refetch = () => {
    fetchRequests()
  }

  // Filter requests by status
  const getRequestsByStatus = (status: 'pending' | 'approved' | 'rejected') => {
    return requests.filter(request => request.status === status)
  }

  return {
    requests,
    loading,
    error,
    stats,
    refetch,
    getRequestsByStatus,
    pendingRequests: getRequestsByStatus('pending'),
    approvedRequests: getRequestsByStatus('approved'),
    rejectedRequests: getRequestsByStatus('rejected')
  }
}
