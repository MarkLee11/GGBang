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
 * Withdraw a pending join request
 */
export async function withdrawJoinRequest(requestId: number) {
  const { data: authData, error: authErr } = await supabase.auth.getUser()
  if (authErr || !authData?.user) {
    return { success: false, error: 'Please sign in first.' }
  }

  // Check if the request belongs to the current user and is pending
  const { data: request, error: fetchError } = await supabase
    .from('join_requests')
    .select('id, requester_id, status')
    .eq('id', requestId)
    .single()

  if (fetchError || !request) {
    return { success: false, error: 'Request not found.' }
  }

  if (request.requester_id !== authData.user.id) {
    return { success: false, error: 'You can only withdraw your own requests.' }
  }

  if (request.status !== 'pending') {
    return { success: false, error: 'Only pending requests can be withdrawn.' }
  }

  // Delete the request
  const { error } = await supabase
    .from('join_requests')
    .delete()
    .eq('id', requestId)

  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true }
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

/**
 * Approve a join request and add user to event attendees
 */
export async function approveJoinRequest(requestId: number) {
  const { data: authData, error: authErr } = await supabase.auth.getUser()
  if (authErr || !authData?.user) {
    return { success: false, error: 'Please sign in first.' }
  }

  try {
    // Start a transaction
    const { data: request, error: fetchError } = await supabase
      .from('join_requests')
      .select(`
        id, 
        event_id, 
        requester_id, 
        status,
        events!inner (
          id,
          user_id,
          title,
          capacity
        )
      `)
      .eq('id', requestId)
      .eq('status', 'pending')
      .single()

    if (fetchError || !request) {
      return { success: false, error: 'Request not found or not pending.' }
    }

    // Verify user is the event host
    if (request.events.user_id !== authData.user.id) {
      return { success: false, error: 'Only event hosts can approve requests.' }
    }

    // Check capacity if event has a limit
    if (request.events.capacity) {
      const { count: currentAttendees, error: countError } = await supabase
        .from('event_attendees')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', request.event_id)

      if (countError) {
        return { success: false, error: 'Failed to check event capacity.' }
      }

      if (currentAttendees !== null && currentAttendees >= request.events.capacity) {
        return { success: false, error: 'Event is at full capacity.' }
      }
    }

    // Update request status to approved
    const { error: updateError } = await supabase
      .from('join_requests')
      .update({ 
        status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)

    if (updateError) {
      return { success: false, error: 'Failed to approve request.' }
    }

    // Add user to event attendees
    const { error: attendeeError } = await supabase
      .from('event_attendees')
      .insert({
        event_id: request.event_id,
        user_id: request.requester_id,
        joined_at: new Date().toISOString()
      })

    if (attendeeError) {
      // Rollback request status if attendee insertion fails
      await supabase
        .from('join_requests')
        .update({ 
          status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)
      
      return { success: false, error: 'Failed to add user to event attendees.' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error approving join request:', error)
    return { success: false, error: 'An unexpected error occurred.' }
  }
}

/**
 * Reject a join request
 */
export async function rejectJoinRequest(requestId: number, note?: string) {
  const { data: authData, error: authErr } = await supabase.auth.getUser()
  if (authErr || !authData?.user) {
    return { success: false, error: 'Please sign in first.' }
  }

  try {
    // Get request details and verify host
    const { data: request, error: fetchError } = await supabase
      .from('join_requests')
      .select(`
        id, 
        event_id, 
        status,
        events!inner (
          id,
          user_id,
          title
        )
      `)
      .eq('id', requestId)
      .eq('status', 'pending')
      .single()

    if (fetchError || !request) {
      return { success: false, error: 'Request not found or not pending.' }
    }

    // Verify user is the event host
    if (request.events.user_id !== authData.user.id) {
      return { success: false, error: 'Only event hosts can reject requests.' }
    }

    // Update request status to rejected
    const { error: updateError } = await supabase
      .from('join_requests')
      .update({ 
        status: 'rejected',
        note: note?.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)

    if (updateError) {
      return { success: false, error: 'Failed to reject request.' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error rejecting join request:', error)
    return { success: false, error: 'An unexpected error occurred.' }
  }
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