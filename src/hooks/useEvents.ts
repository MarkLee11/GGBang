import { useState, useEffect } from 'react'
import { supabase, type Event, isSupabaseConfigured, getEvents } from '../lib/supabase'
import { type FilterOptions } from '../components/CategoryFilter'

export const useEvents = (category: string = 'All', filters?: FilterOptions) => {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = async () => {
    try {
      setLoading(true)
      setError(null)

      // If Supabase is not configured, use mock data
      if (!isSupabaseConfigured) {
        const mockEvents = await getEvents()
        let filteredEvents = mockEvents

        // Apply category filter
        if (category !== 'All') {
          filteredEvents = filteredEvents.filter(event => event.category === category)
        }

        // Apply additional filters if provided
        if (filters) {
          if (filters.dateFrom) {
            filteredEvents = filteredEvents.filter(event => event.date >= filters.dateFrom!)
          }
          if (filters.dateTo) {
            filteredEvents = filteredEvents.filter(event => event.date <= filters.dateTo!)
          }
          if (filters.city) {
            filteredEvents = filteredEvents.filter(event => 
              event.location?.toLowerCase().includes(filters.city!.toLowerCase())
            )
          }
          if (filters.country) {
            filteredEvents = filteredEvents.filter(event => 
              event.country?.toLowerCase().includes(filters.country!.toLowerCase())
            )
          }
        }

        setEvents(filteredEvents)
        setLoading(false)
        return
      }

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
        console.error('Supabase query error:', fetchError)
        throw fetchError
      }

      setEvents(data || [])
    } catch (err) {
      console.error('Error fetching events:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch events')
      
      // Fall back to mock data on error
      try {
        const mockEvents = await getEvents()
        setEvents(mockEvents)
        setError(null) // Clear error since we have fallback data
      } catch (fallbackErr) {
        setError('Failed to load events')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [category, filters])
  
  return { events, loading, error, refetch: fetchEvents }
}