/* import { useState, useEffect } from 'react'
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
}*/
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { JoinRequestWithProfile, RequestStats } from '../lib/supabase';

export const useHostRequests = (eventId: number, refreshAttendees?: () => void) => {
  const [requests, setRequests] = useState<JoinRequestWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<RequestStats>({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0
  });

  const fetchRequests = async () => {
    if (!eventId) return;

    setLoading(true);
    setError(null);

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
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const requestsData = data as JoinRequestWithProfile[];
      setRequests(requestsData);

      // 计算统计数据
      const newStats = requestsData.reduce((acc, request) => {
        acc[request.status]++;
        acc.total++;
        return acc;
      }, {
        pending: 0,
        approved: 0,
        rejected: 0,
        total: 0
      } as RequestStats);

      setStats(newStats);
    } catch (err) {
      console.error('Error fetching host requests:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  };

  // ✅ 新增批准方法
  const approveRequest = async (requestId: number, requesterId: string) => {
    try {
      // 更新 join_requests 状态
      const { error: updateError } = await supabase
        .from('join_requests')
        .update({ status: 'approved' })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // 添加到 event_attendees
      const { error: insertError } = await supabase
        .from('event_attendees')
        .insert([{ event_id: eventId, user_id: requesterId }]);

      if (insertError) throw insertError;

      // 本地刷新 join_requests 列表
      await fetchRequests();

      // 🔄 立即刷新 Attendees 列表
      if (refreshAttendees) {
        refreshAttendees();
      }

    } catch (err) {
      console.error('Error approving request:', err);
    }
  };

  useEffect(() => {
    fetchRequests();

    const subscription = supabase
      .channel(`join_requests_${eventId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'join_requests',
        filter: `event_id=eq.${eventId}`
      }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [eventId]);

  const getRequestsByStatus = (status: 'pending' | 'approved' | 'rejected') => {
    return requests.filter(request => request.status === status);
  };

  return {
    requests,
    loading,
    error,
    stats,
    refetch: fetchRequests,
    approveRequest, // ✅ 新增
    pendingRequests: getRequestsByStatus('pending'),
    approvedRequests: getRequestsByStatus('approved'),
    rejectedRequests: getRequestsByStatus('rejected')
  };
};

