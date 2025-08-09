import { createClient } from '@supabase/supabase-js'

// Temporary hardcoded values for testing - replace with env vars later
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lymybduvqtbmaukhifzx.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5bXliZHV2cXRibWF1a2hpZnp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMDc0MzksImV4cCI6MjA2OTg4MzQzOX0.CNzMvltL-SIBv72V6sL5QYII2SxPCFY-kekAW25qv34'

// Log configuration status
console.log('Supabase Configuration:')
console.log('URL configured:', !!supabaseUrl)
console.log('Anon Key configured:', !!supabaseAnonKey)
console.log('isSupabaseConfigured:', !!(supabaseUrl && supabaseAnonKey))

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase environment variables are missing!')
  console.warn('Please add to your .env file:')
  console.warn('VITE_SUPABASE_URL=your_supabase_project_url')
  console.warn('VITE_SUPABASE_ANON_KEY=your_supabase_anon_key')
}

// Create Supabase client with fallback values for development
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
)

// Export a flag to check if Supabase is properly configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

// Database types
export type EventCategory = 'Bar' | 'Club' | 'Festival' | 'Social Meetup' | 'Home Party' | 'Other'
export type EventPrivacy = 'public' | 'link' | 'invite'
export type JoinRequestStatus = 'pending' | 'approved' | 'rejected'

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
  category: EventCategory
  image: string | null
  user_id: string | null  // UUID referencing auth.users(id)
  capacity: number | null
  privacy: EventPrivacy | null
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
  status: JoinRequestStatus
  created_at: string
  updated_at: string
}

// 公开的用户资料类型（不包含敏感信息）
export type PublicProfile = {
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
  body_type: 'slim' | 'average' | 'athletic' | 'muscular' | 'bear' | 'chubby' | 'stocky' | 'other' | null
  relationship_status: 'single' | 'taken' | 'married' | 'open' | 'complicated' | 'not_specified' | null
  is_verified: boolean | null
  last_seen: string | null
}

// 敏感用户资料类型（仅本人或特定权限可见）
export type SensitiveProfile = {
  hiv_status: 'negative' | 'positive' | 'unknown' | 'not_disclosed' | null
  prep_usage: 'on_prep' | 'not_on_prep' | 'considering' | 'not_disclosed' | null
  social_links: Record<string, string> | null
}

// 完整的用户资料类型（仅在服务端或本人查询时使用）
export type Profile = PublicProfile & SensitiveProfile & {
  can_view_sensitive?: boolean
}

// 兴趣分类
export type InterestCategory = {
  id: number
  category: string
  interests: string[]
  created_at: string
}

// 偏好选项
export type PreferenceOption = {
  id: number
  category: string
  options: string[]
  created_at: string
}

// Fetch events with required fields
export async function getEvents(): Promise<Event[]> {
  // Return mock data if Supabase is not configured
  if (!isSupabaseConfigured) {
    return getMockEvents()
  }

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
    return getMockEvents() // Fall back to mock data on error
  }

  return data as Event[]
}

// Mock events data for development and testing
function getMockEvents(): Event[] {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)

  return [
    {
      id: 1,
      created_at: new Date().toISOString(),
      title: 'Rainbow Bar Night',
      description: 'Join us for a fun night at the local rainbow bar with karaoke and dancing!',
      date: tomorrow.toISOString().split('T')[0],
      time: '20:00:00',
      location: 'Downtown Rainbow Bar',
      country: 'USA',
      organizer: 'Alex',
      category: 'Bar' as EventCategory,
      image: 'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=400',
      user_id: 'mock-user-1',
      capacity: 8,
      privacy: 'public' as EventPrivacy,
      place_hint: 'Near Central Station',
      place_exact: null,
      place_exact_visible: false
    },
    {
      id: 2,
      created_at: new Date().toISOString(),
      title: 'Pride Club Dance Party',
      description: 'Dance the night away at the biggest gay club in town!',
      date: nextWeek.toISOString().split('T')[0],
      time: '22:00:00',
      location: 'Pride Palace Club',
      country: 'USA',
      organizer: 'Jamie',
      category: 'Club' as EventCategory,
      image: 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=400',
      user_id: 'mock-user-2',
      capacity: 12,
      privacy: 'public' as EventPrivacy,
      place_hint: 'City Center',
      place_exact: null,
      place_exact_visible: false
    },
    {
      id: 3,
      created_at: new Date().toISOString(),
      title: 'Coffee & Chat Social',
      description: 'A relaxed afternoon meetup for coffee and friendly conversation.',
      date: today.toISOString().split('T')[0],
      time: '15:00:00',
      location: 'Rainbow Café',
      country: 'USA',
      organizer: 'Sam',
      category: 'Social Meetup' as EventCategory,
      image: 'https://images.pexels.com/photos/1024359/pexels-photo-1024359.jpeg?auto=compress&cs=tinysrgb&w=400',
      user_id: 'mock-user-3',
      capacity: 6,
      privacy: 'public' as EventPrivacy,
      place_hint: 'University District',
      place_exact: null,
      place_exact_visible: false
    }
  ]
}

// ================================
// 安全的查询函数
// ================================

// 获取公开的用户资料（不包含敏感信息）
export async function getPublicProfile(userId: string): Promise<PublicProfile | null> {
  if (!isSupabaseConfigured) {
    return null
  }

  const { data, error } = await supabase
    .from('public_profiles')  // 使用安全视图
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    console.error('Error fetching public profile:', error)
    return null
  }

  return data
}

// 获取当前用户的敏感资料（仅本人可见）
export async function getSensitiveProfile(): Promise<SensitiveProfile | null> {
  if (!isSupabaseConfigured) {
    return null
  }

  const { data, error } = await supabase
    .from('sensitive_profiles')  // 使用敏感资料视图
    .select('*')
    .single()

  if (error) {
    console.error('Error fetching sensitive profile:', error)
    return null
  }

  return data
}

// 获取当前用户的完整资料
export async function getCurrentUserProfile(): Promise<Profile | null> {
  if (!isSupabaseConfigured) {
    return null
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
    .single()

  if (error) {
    console.error('Error fetching current user profile:', error)
    return null
  }

  return data
}

// 获取用户的加入申请（仅自己的）
export async function getMyJoinRequests(): Promise<JoinRequest[]> {
  if (!isSupabaseConfigured) {
    return []
  }

  const { data, error } = await supabase
    .from('join_requests')
    .select(`
      *,
      events:event_id (
        id,
        title,
        date,
        time,
        location,
        category
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching join requests:', error)
    return []
  }

  return data || []
}

// 获取活动的加入申请（仅主办方可见）
export async function getEventJoinRequests(eventId: number): Promise<JoinRequest[]> {
  if (!isSupabaseConfigured) {
    return []
  }

  const { data, error } = await supabase
    .from('join_requests')
    .select(`
      *,
      profiles:requester_id (
        user_id,
        display_name,
        profile_images,
        age,
        city,
        country
      )
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching event join requests:', error)
    return []
  }

  return data || []
}



// 创建加入申请
export async function createJoinRequest(eventId: number, message: string = ''): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase not configured' }
  }

  const { data: user } = await supabase.auth.getUser()
  if (!user.user) {
    return { success: false, error: 'User not authenticated' }
  }

  const { error } = await supabase
    .from('join_requests')
    .insert({
      event_id: eventId,
      requester_id: user.user.id,
      message: message,
      status: 'pending' as JoinRequestStatus
    })

  if (error) {
    console.error('Error creating join request:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// ================================
// Frontend API Functions for Edge Functions
// ================================

// 获取Supabase配置
const getSupabaseConfig = () => ({
  url: import.meta.env.VITE_SUPABASE_URL || 'https://lymybduvqtbmaukhifzx.supabase.co',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5bXliZHV2cXRibWF1a2hpZnp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMDc0MzksImV4cCI6MjA2OTg4MzQzOX0.CNzMvltL-SIBv72V6sL5QYII2SxPCFY-kekAW25qv34'
})

// 调用Edge Function的通用函数
export async function callEdgeFunction(
  functionName: string, 
  body: any,
  accessToken?: string
): Promise<{ success: boolean; data?: any; error?: string; code?: string }> {
  const config = getSupabaseConfig()
  
  if (!accessToken) {
    const { data: { session } } = await supabase.auth.getSession()
    accessToken = session?.access_token
  }

  if (!accessToken) {
    return { success: false, error: 'Authentication required', code: 'UNAUTHORIZED' }
  }

  try {
    const response = await fetch(`${config.url}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    })

    const result = await response.json()

    if (!response.ok) {
      return { 
        success: false, 
        error: result.error || `HTTP ${response.status}`, 
        code: result.code || 'API_ERROR' 
      }
    }

    return { success: true, data: result }
  } catch (error) {
    console.error(`Error calling ${functionName}:`, error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Network error',
      code: 'NETWORK_ERROR'
    }
  }
}

// 申请加入活动
export async function requestJoinEvent(
  eventId: number, 
  message: string = ''
): Promise<{ success: boolean; data?: any; error?: string; code?: string }> {
  return callEdgeFunction('join-request', { eventId, message })
}

// 批准加入申请
export async function approveJoinRequest(
  requestId: number
): Promise<{ success: boolean; data?: any; error?: string; code?: string }> {
  return callEdgeFunction('join-approve', { requestId })
}

// 拒绝加入申请
export async function rejectJoinRequest(
  requestId: number,
  note?: string
): Promise<{ success: boolean; data?: any; error?: string; code?: string }> {
  return callEdgeFunction('join-reject', { requestId, note })
}

// 解锁活动位置
export async function unlockEventLocation(
  eventId: number
): Promise<{ success: boolean; data?: any; error?: string; code?: string }> {
  return callEdgeFunction('event-location-unlock', { eventId })
}

// ================================
// Extended Types for Frontend
// ================================

// 带有用户信息的加入申请类型
export type JoinRequestWithProfile = JoinRequest & {
  profiles?: {
    user_id: string
    display_name: string | null
    profile_images: string[] | null
    age: number | null
    city: string | null
    country: string | null
    bio: string | null
  }
  events?: {
    id: number
    title: string
    date: string
    time: string
    location: string | null
    category: EventCategory
  }
}

// API响应类型
export type ApiResponse<T = any> = {
  success: boolean
  data?: T
  error?: string
  code?: string
}

// 申请状态统计
export type RequestStats = {
  pending: number
  approved: number
  rejected: number
  total: number
}

// 事件容量状态
export type EventCapacityInfo = {
  capacity: number
  currentAttendees: number
  availableSpots: number
  pendingRequests: number
  isHost: boolean
  userStatus: 'none' | 'pending' | 'approved' | 'rejected' | 'attending'
}

// ================================
// Profile Management Functions
// ================================

// 获取兴趣分类选项
export async function getInterestCategories(): Promise<InterestCategory[]> {
  if (!isSupabaseConfigured) {
    return []
  }

  const { data, error } = await supabase
    .from('interest_categories')
    .select('*')
    .order('category')

  if (error) {
    console.error('Error fetching interest categories:', error)
    return []
  }

  return data || []
}

// 获取偏好选项
export async function getPreferenceOptions(): Promise<PreferenceOption[]> {
  if (!isSupabaseConfigured) {
    return []
  }

  const { data, error } = await supabase
    .from('preference_options')
    .select('*')
    .order('category')

  if (error) {
    console.error('Error fetching preference options:', error)
    return []
  }

  return data || []
}

// 上传图片到Supabase Storage
export async function uploadProfileImage(file: File, userId: string): Promise<{ success: boolean; url?: string; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('profile-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      throw uploadError
    }

    const { data: urlData } = supabase.storage
      .from('profile-images')
      .getPublicUrl(fileName)

    return { success: true, url: urlData.publicUrl }
  } catch (error) {
    console.error('Error uploading image:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Upload failed' }
  }
}

// 删除图片从Supabase Storage
export async function deleteProfileImage(imageUrl: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    // 从URL中提取文件路径
    const url = new URL(imageUrl)
    const pathSegments = url.pathname.split('/')
    const bucketIndex = pathSegments.findIndex(segment => segment === 'profile-images')
    
    if (bucketIndex === -1) {
      throw new Error('Invalid image URL')
    }

    const filePath = pathSegments.slice(bucketIndex + 1).join('/')

    const { error } = await supabase.storage
      .from('profile-images')
      .remove([filePath])

    if (error) {
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error('Error deleting image:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Delete failed' }
  }
}

// 更新用户profile
export async function updateUserProfile(updates: Partial<Profile>): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase not configured' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'User not authenticated' }
  }

  const { error } = await supabase
    .from('profiles')
    .upsert({
      user_id: user.id,
      ...updates,
      updated_at: new Date().toISOString()
    })

  if (error) {
    console.error('Error updating profile:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// 使用数据库函数获取完整profile信息
export async function getFullProfileInfo(
  targetUserId: string, 
  eventId?: number
): Promise<{ success: boolean; data?: Profile; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase not configured' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'User not authenticated' }
  }

  const { data, error } = await supabase
    .rpc('get_full_profile_info', {
      viewer_id: user.id,
      target_user_id: targetUserId,
      event_id: eventId || null
    })

  if (error) {
    console.error('Error fetching full profile:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

// 获取公开profile信息
export async function getPublicProfileInfo(targetUserId: string): Promise<{ success: boolean; data?: PublicProfile; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase not configured' }
  }

  const { data, error } = await supabase
    .rpc('get_public_profile_info', {
      target_user_id: targetUserId
    })

  if (error) {
    console.error('Error fetching public profile:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}
