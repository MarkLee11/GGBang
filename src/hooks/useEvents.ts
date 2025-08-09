import { useState, useEffect } from 'react'
import { supabase, type Event } from '../lib/supabase'
import { type FilterOptions } from '../components/CategoryFilter'

export const useEvents = (category: string = 'All', filters?: FilterOptions) => {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true })

      // Filter by category if not 'All'
      if (category !== 'All') {
        query = query.eq('category', category)
      }

      // Apply additional filters if provided
      if (filters) {
        if (filters.dateFrom) {
          query = query.gte('date', filters.dateFrom)
        }
        if (filters.dateTo) {
          query = query.lte('date', filters.dateTo)
        }
        if (filters.city) {
          query = query.ilike('location', `%${filters.city}%`)
        }
        if (filters.country) {
          query = query.ilike('country', `%${filters.country}%`)
        }
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        throw fetchError
      }

      setEvents(data || [])
    } catch (err) {
      console.error('Error fetching events:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch events')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [category, filters])
  
  return { events, loading, error, refetch: fetchEvents }
}