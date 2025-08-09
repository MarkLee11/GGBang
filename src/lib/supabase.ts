import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Log configuration status
console.log('Supabase Configuration:')
console.log('URL configured:', !!supabaseUrl)
console.log('Anon Key configured:', !!supabaseAnonKey)

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase environment variables are missing!')
  console.warn('Please add to your .env file:')
  console.warn('VITE_SUPABASE_URL=your_supabase_project_url')
  console.warn('VITE_SUPABASE_ANON_KEY=your_supabase_anon_key')
}

// Create Supabase client
export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
)

// Export a flag to check if Supabase is properly configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

// Database types
export type Event = {
  id: number
  created_at: string
  title: string
  description: string | null
  date: string  // YYYY-MM-DD
  time: string  // HH:MM:SS
  location: string | null
  country: string | null
  organizer: string | null
  category: string
  image: string | null
  user_id: string | null
  capacity: number | null
  privacy: 'public' | 'link' | 'invite' | string | null
  place_hint: string | null
  place_exact: string | null
  place_exact_visible: boolean | null
}

export type EventAttendee = {
  id: string
  event_id: number
  user_id: string  // UUID referencing auth.users(id)
  created_at: string
  updated_at: string
}

export type JoinRequest = {
  id: number
  event_id: number
  requester_id: string  // UUID referencing auth.users(id)
  message: string | null
  waitlist: boolean
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
}

export type Profile = {
  user_id: string  // UUID referencing auth.users(id)
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
  body_type: string | null
  relationship_status: string | null
  hiv_status: string | null
  prep_usage: boolean | null
  last_online: string | null
  social_links: any | null
}

// Fetch events with required fields
export async function getEvents(): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select(`
      id,
      created_at,
      title,
      description,
      date,
      time,
      location,
      country,
      organizer,
      category,
      image,
      user_id,
      capacity,
      privacy,
      place_hint,
      place_exact,
      place_exact_visible
    `)
    .order('date', { ascending: true })

  if (error) {
    console.error('Error fetching events:', error)
    return []
  }

  return data as Event[]
}
