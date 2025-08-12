// === src/hooks/useEventAttendees.ts ===
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface EventAttendee {
  id: number
  event_id: number
  user_id: string
  created_at: string
  profiles: {
    user_id: string
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

export function useEventAttendees(eventId: number, isHost?: boolean) {
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 封装成可复用的刷新方法
  const fetchAttendees = useCallback(async () => {
    if (!eventId || !isHost) return;

    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('event_attendees')
        .select(`
          id,
          event_id,
          user_id,
          created_at,
          profiles!inner (
            user_id,
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
        .order('created_at', { ascending: true });

      if (error) throw error;
      setAttendees(data || []);
    } catch (err: any) {
      console.error('Error fetching attendees:', err);
      setError(err.message || 'Failed to fetch attendees');
      setAttendees([]);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (!eventId || !isHost) return;
    fetchAttendees();

    // ✅ 实时订阅（数据变化时自动刷新）
    const channel = supabase
      .channel(`attendees_${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_attendees',
          filter: `event_id=eq.${eventId}`
        },
        () => {
          fetchAttendees();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, fetchAttendees]);

  return {
    attendees,
    loading,
    error,
    refreshAttendees: fetchAttendees // ✅ 暴露给外部，批准后可立即刷新
  };
}
