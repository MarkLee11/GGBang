// === src/lib/api.ts ===
import { supabase } from './supabase'

/**
 * Send a join request for the current user.
 */
export async function requestToJoin(eventId: number, message?: string) {
  // 取当前登录用户 UID
  const { data: authData, error: authErr } = await supabase.auth.getUser()
  if (authErr || !authData?.user) {
    return { ok: false, message: 'Please sign in first.' }
  }
  const requesterId = authData.user.id

  // 插入 join_requests
  const { error } = await supabase.from('join_requests').insert({
    event_id: eventId,
    requester_id: requesterId,
    status: 'pending',
    message: message || null,
  })

  if (error) {
    return { ok: false, message: error.message }
  }
  return { ok: true }
}

/**
 * Host unlocks exact location for approved members by toggling a flag.
 * 返回 { success, error? } 以配合现有调用。
 */
export async function unlockEventLocation(eventId: number) {
  const { error } = await supabase
    .from('events')
    .update({ place_exact_visible: true })
    .eq('id', eventId)

  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true }
}
export async function approveJoinRequest(requestId: number) {
    const { error } = await supabase
      .from('join_requests')
      .update({ status: 'approved' })
      .eq('id', requestId)
  
    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true }
  }
  
  // Reject a join request
  export async function rejectJoinRequest(requestId: number) {
    const { error } = await supabase
      .from('join_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId)
  
    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true }
  }
  export async function submitJoinRequest(eventId: number, requesterId: string, message: string = '') {
    const { error } = await supabase
      .from('join_requests')
      .insert([
        {
          event_id: eventId,
          requester_id: requesterId,
          status: 'pending',
          message: message
        }
      ])
  
    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true }
  }