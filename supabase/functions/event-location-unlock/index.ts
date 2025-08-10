
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { 
  corsHeaders, 
  createAuthenticatedClient, 
  validateAuth, 
  validateJsonBody, 
  createSuccessResponse, 
  createErrorResponse,
  handleCors
} from '../_shared/utils.ts'
import { ERROR_CODES, ERROR_MESSAGES, type LocationUnlockBody } from '../_shared/types.ts'

// Validator for request body
function isLocationUnlockBody(data: any): data is LocationUnlockBody {
  return typeof data === 'object' && 
         typeof data.eventId === 'number'
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
    const bodyResult = await validateJsonBody(req, isLocationUnlockBody)
    if ('error' in bodyResult) return bodyResult.error
    const { eventId } = bodyResult.data

    // Create authenticated client
    const supabase = createAuthenticatedClient(req)
    
    // Validate authentication
    const authResult = await validateAuth(supabase)
    if ('error' in authResult) return authResult.error
    const { user } = authResult

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, user_id, title, place_exact, place_exact_visible')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return createErrorResponse(ERROR_CODES.NOT_FOUND, 'Event not found', 404)
    }

    // Verify user is the event host
    if (event.user_id !== user.id) {
      return createErrorResponse(ERROR_CODES.FORBIDDEN, 'Only event host can unlock location', 403)
    }

    // Check if exact location exists
    if (!event.place_exact || event.place_exact.trim() === '') {
      return createErrorResponse(ERROR_CODES.VALIDATION_ERROR, 'Event has no exact location to unlock', 400)
    }

    // Use the safe unlock function from the database (includes logging)
    const { data: unlockResult, error: unlockError } = await supabase
      .rpc('manual_unlock_event_location', {
        event_id_param: eventId,
        user_id_param: user.id
      })
      .single()

    if (unlockError) {
      console.error('Manual unlock RPC error:', unlockError)
      return createErrorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to unlock event location', 500)
    }

    if (!unlockResult.success) {
      const statusCode = unlockResult.code === 'FORBIDDEN' ? 403 : 
                        unlockResult.code === 'EVENT_NOT_FOUND' ? 404 : 400
      return createErrorResponse(unlockResult.code, unlockResult.message, statusCode)
    }

    // Get count of approved attendees for notification purposes
    const { count: attendeeCount } = await supabase
      .from('event_attendees')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)

    return createSuccessResponse({ 
      message: unlockResult.message || 'Event location unlocked successfully',
      eventId: eventId,
      attendeeCount: attendeeCount || 0,
      wasAlreadyUnlocked: unlockResult.message?.includes('already unlocked') || false
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return createErrorResponse(ERROR_CODES.INTERNAL_ERROR, ERROR_MESSAGES[ERROR_CODES.INTERNAL_ERROR], 500)
  }
})