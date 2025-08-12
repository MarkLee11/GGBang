import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { type Profile } from '../lib/supabase'

export function useHostProfile(eventId: number | null) {
  const [hostProfile, setHostProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchHostProfile = useCallback(async () => {
    if (!eventId) return

    setLoading(true)
    setError(null)

    try {
      // 1. 获取活动的 user_id
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('user_id')
        .eq('id', eventId)
        .single()

      if (eventError) throw eventError
      if (!eventData?.user_id) throw new Error('Event not found')

      // 2. 获取主办方的资料
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', eventData.user_id)
        .single()

      if (profileError) throw profileError
      setHostProfile(profileData)

    } catch (err: any) {
      console.error('Error fetching host profile:', err)
      setError(err.message || 'Failed to fetch host profile')
      setHostProfile(null)
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    fetchHostProfile()
  }, [fetchHostProfile])

  return {
    hostProfile,
    loading,
    error,
    refreshHostProfile: fetchHostProfile
  }
}
