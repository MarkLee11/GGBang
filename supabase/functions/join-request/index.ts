
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { 
  corsHeaders, 
  createAuthenticatedClient,
  createAdminClient,
  validateAuth, 
  validateJsonBody, 
  createSuccessResponse, 
  createErrorResponse,
  handleCors,
  isEventInPast
} from '../_shared/utils.ts'
import { ERROR_CODES, ERROR_MESSAGES, type JoinRequestBody } from '../_shared/types.ts'
import { sendNotificationToUser } from '../_shared/notifications.ts'

// Validator for request body
function isJoinRequestBody(data: any): data is JoinRequestBody {
  return typeof data === 'object' && 
         typeof data.eventId === 'number' &&
         (data.message === undefined || typeof data.message === 'string')
}

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  // Only allow POST method
  if (req.method !== 'POST') {
    return createErrorResponse(ERROR_CODES.VALIDATION_ERROR, 'Method not allowed', 405)
  }

  try {
    // Validate JSON body
    const bodyResult = await validateJsonBody(req, isJoinRequestBody)
    if ('error' in bodyResult) return bodyResult.error
    const { eventId, message = '' } = bodyResult.data

    // Create authenticated client
    const supabase = createAuthenticatedClient(req)
    
    // Validate authentication
    const authResult = await validateAuth(supabase)
    if ('error' in authResult) return authResult.error
    const { user } = authResult

    // Check if event exists and get details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, user_id, date, time, capacity')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return createErrorResponse(ERROR_CODES.NOT_FOUND, 'Event not found', 404)
    }

    // Cannot apply to own event
    if (event.user_id === user.id) {
      return createErrorResponse(ERROR_CODES.OWN_EVENT, ERROR_MESSAGES[ERROR_CODES.OWN_EVENT], 403)
    }

    // Check if event is in the past
    if (isEventInPast(event)) {
      return createErrorResponse(ERROR_CODES.PAST_EVENT, ERROR_MESSAGES[ERROR_CODES.PAST_EVENT], 422)
    }

    // Check for existing request
    const { data: existingRequest, error: requestError } = await supabase
      .from('join_requests')
      .select('id, status')
      .eq('event_id', eventId)
      .eq('requester_id', user.id)
      .single()

    if (!requestError && existingRequest) {
      if (existingRequest.status === 'pending') {
        return createErrorResponse(ERROR_CODES.DUPLICATE_REQUEST, 'You already have a pending request for this event', 409)
      }
      if (existingRequest.status === 'approved') {
        return createErrorResponse(ERROR_CODES.DUPLICATE_REQUEST, 'You are already approved for this event', 409)
      }
    }

    // Check if user is already attending
    const { data: existingAttendee, error: attendeeError } = await supabase
      .from('event_attendees')
      .select('event_id')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .single()

    if (!attendeeError && existingAttendee) {
      return createErrorResponse(ERROR_CODES.DUPLICATE_REQUEST, 'You are already attending this event', 409)
    }

    // Check current capacity if event has capacity limit
    if (event.capacity) {
      const { count: currentAttendees, error: countError } = await supabase
        .from('event_attendees')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)

      if (countError) {
        console.error('Error checking capacity:', countError)
        return createErrorResponse(ERROR_CODES.INTERNAL_ERROR, ERROR_MESSAGES[ERROR_CODES.INTERNAL_ERROR], 500)
      }

      if (currentAttendees !== null && currentAttendees >= event.capacity) {
        return createErrorResponse(ERROR_CODES.EVENT_FULL, ERROR_MESSAGES[ERROR_CODES.EVENT_FULL], 409)
      }
    }

    // Create join request
    const { data: joinRequest, error: insertError } = await supabase
      .from('join_requests')
      .insert({
        event_id: eventId,
        requester_id: user.id,
        message: message.trim(),
        status: 'pending'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating join request:', insertError)
      return createErrorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to create join request', 500)
    }

    // Send notification to event host
    try {
      const adminClient = createAdminClient()
      
      // Get requester profile
      const { data: requesterProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .single()

      // Send notification to host
      const notificationResult = await sendNotificationToUser(
        event.user_id,
        'request_created',
        event,
        adminClient,
        requesterProfile || { display_name: 'Someone' },
        null
      )

      console.log('Host notification result:', notificationResult)
    } catch (notificationError) {
      // Don't fail the request if notification fails
      console.error('Failed to send host notification:', notificationError)
    }

    return createSuccessResponse({ 
      request: joinRequest,
      message: 'Join request submitted successfully'
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return createErrorResponse(ERROR_CODES.INTERNAL_ERROR, ERROR_MESSAGES[ERROR_CODES.INTERNAL_ERROR], 500)
  }
})