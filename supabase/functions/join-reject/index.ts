
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
  getEventHost
} from '../_shared/utils.ts'
import { ERROR_CODES, ERROR_MESSAGES, type ApproveRejectBody } from '../_shared/types.ts'
import { sendNotificationToUser } from '../_shared/notifications.ts'

// Validator for request body
function isApproveRejectBody(data: any): data is ApproveRejectBody {
  return typeof data === 'object' && 
         typeof data.requestId === 'number' &&
         (data.note === undefined || typeof data.note === 'string')
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
    const bodyResult = await validateJsonBody(req, isApproveRejectBody)
    if ('error' in bodyResult) return bodyResult.error
    const { requestId, note = '' } = bodyResult.data

    // Create authenticated client
    const supabase = createAuthenticatedClient(req)
    
    // Validate authentication
    const authResult = await validateAuth(supabase)
    if ('error' in authResult) return authResult.error
    const { user } = authResult

    // Get join request details
    const { data: joinRequest, error: requestError } = await supabase
      .from('join_requests')
      .select(`
        id, 
        event_id, 
        requester_id, 
        status,
        events!inner (
          id,
          user_id,
          title
        )
      `)
      .eq('id', requestId)
      .single()

    if (requestError || !joinRequest) {
      return createErrorResponse(ERROR_CODES.NOT_FOUND, 'Join request not found', 404)
    }

    // Verify user is the event host
    if (joinRequest.events.user_id !== user.id) {
      return createErrorResponse(ERROR_CODES.FORBIDDEN, 'Only event host can reject requests', 403)
    }

    // Check if request is still pending
    if (joinRequest.status !== 'pending') {
      return createErrorResponse(ERROR_CODES.CONFLICT, 'Request is not pending', 409)
    }

    // Update join request status to rejected
    const { error: updateError } = await supabase
      .from('join_requests')
      .update({ 
        status: 'rejected',
        note: note.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)

    if (updateError) {
      console.error('Error rejecting join request:', updateError)
      return createErrorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to reject join request', 500)
    }

    // Send rejection notification to requester
    try {
      const adminClient = createAdminClient()
      
      // Get event details for notification
      const { data: eventData } = await supabase
        .from('events')
        .select('id, title, date, time, place_hint, user_id')
        .eq('id', joinRequest.event_id)
        .single()

      if (eventData) {
        const notificationResult = await sendNotificationToUser(
          joinRequest.requester_id,
          'rejected',
          eventData,
          adminClient,
          null,
          null,
          note || undefined
        )

        console.log('Rejection notification result:', notificationResult)
      }
    } catch (notificationError) {
      // Don't fail the rejection if notification fails
      console.error('Failed to send rejection notification:', notificationError)
    }

    return createSuccessResponse({ 
      message: 'Join request rejected successfully',
      requestId: requestId
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return createErrorResponse(ERROR_CODES.INTERNAL_ERROR, ERROR_MESSAGES[ERROR_CODES.INTERNAL_ERROR], 500)
  }
})