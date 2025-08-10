
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Client } from 'https://deno.land/x/postgres@v0.17.0/mod.ts'
import { 
  corsHeaders, 
  createAuthenticatedClient, 
  createAdminClient,
  validateAuth, 
  validateJsonBody, 
  createSuccessResponse, 
  createErrorResponse,
  handleCors,
  getEventHost,
  isEventInPast
} from '../_shared/utils.ts'
import { ERROR_CODES, ERROR_MESSAGES, type ApproveRejectBody } from '../_shared/types.ts'
import { sendNotificationToUser } from '../_shared/notifications.ts'

// Validator for request body
function isApproveRejectBody(data: any): data is ApproveRejectBody {
  return typeof data === 'object' && 
         typeof data.requestId === 'number'
}

// Atomic approval with concurrency protection
async function approveRequestTransaction(requestId: number, userId: string): Promise<{ success: boolean; error?: string; code?: string }> {
  // Get database URL from environment
  const databaseUrl = Deno.env.get('SUPABASE_DB_URL')
  if (!databaseUrl) {
    return { success: false, error: 'Database connection not configured', code: ERROR_CODES.INTERNAL_ERROR }
  }

  const client = new Client(databaseUrl)
  
  try {
    await client.connect()
    await client.queryObject('BEGIN')

    // Get and lock the join request
    const requestResult = await client.queryObject(`
      SELECT jr.id, jr.event_id, jr.requester_id, jr.status,
             e.id as event_id, e.capacity, e.user_id as host_id, e.date, e.time
      FROM join_requests jr
      JOIN events e ON jr.event_id = e.id
      WHERE jr.id = $1
      FOR UPDATE
    `, [requestId])

    if (requestResult.rows.length === 0) {
      await client.queryObject('ROLLBACK')
      return { success: false, error: 'Join request not found', code: ERROR_CODES.NOT_FOUND }
    }

    const requestData = requestResult.rows[0] as any

    // Verify user is the event host
    if (requestData.host_id !== userId) {
      await client.queryObject('ROLLBACK')
      return { success: false, error: 'Only event host can approve requests', code: ERROR_CODES.FORBIDDEN }
    }

    // Check if request is still pending
    if (requestData.status !== 'pending') {
      await client.queryObject('ROLLBACK')
      return { success: false, error: 'Request is not pending', code: ERROR_CODES.CONFLICT }
    }

    // Check if event is in the past
    const eventDate = new Date(`${requestData.date}T${requestData.time}:00Z`)
    if (eventDate <= new Date()) {
      await client.queryObject('ROLLBACK')
      return { success: false, error: 'Cannot approve requests for past events', code: ERROR_CODES.PAST_EVENT }
    }

    // Check if user is already attending
    const attendeeCheck = await client.queryObject(`
      SELECT 1 FROM event_attendees 
      WHERE event_id = $1 AND user_id = $2
    `, [requestData.event_id, requestData.requester_id])

    if (attendeeCheck.rows.length > 0) {
      await client.queryObject('ROLLBACK')
      return { success: false, error: 'User is already attending this event', code: ERROR_CODES.CONFLICT }
    }

    // Count current attendees with row lock
    const countResult = await client.queryObject(`
      SELECT COUNT(*) as count
      FROM event_attendees 
      WHERE event_id = $1
    `, [requestData.event_id])

    const currentCount = parseInt((countResult.rows[0] as any).count)

    // Check capacity limit
    if (requestData.capacity && currentCount >= requestData.capacity) {
      await client.queryObject('ROLLBACK')
      return { 
        success: false, 
        error: `Event is at full capacity (${currentCount}/${requestData.capacity})`, 
        code: ERROR_CODES.EVENT_FULL 
      }
    }

    // Insert attendee (using ON CONFLICT to handle race conditions)
    await client.queryObject(`
      INSERT INTO event_attendees (event_id, user_id)
      VALUES ($1, $2)
      ON CONFLICT (event_id, user_id) DO NOTHING
    `, [requestData.event_id, requestData.requester_id])

    // Update join request status
    await client.queryObject(`
      UPDATE join_requests 
      SET status = 'approved', updated_at = NOW()
      WHERE id = $1
    `, [requestId])

    await client.queryObject('COMMIT')
    return { success: true }

  } catch (error) {
    try {
      await client.queryObject('ROLLBACK')
    } catch {
      // Rollback failed, connection might be broken
    }
    console.error('Transaction error:', error)
    return { success: false, error: 'Database transaction failed', code: ERROR_CODES.INTERNAL_ERROR }
  } finally {
    try {
      await client.end()
    } catch {
      // Connection cleanup failed
    }
  }
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
    const { requestId } = bodyResult.data

    // Create authenticated client
    const supabase = createAuthenticatedClient(req)
    
    // Validate authentication
    const authResult = await validateAuth(supabase)
    if ('error' in authResult) return authResult.error
    const { user } = authResult

    // Execute atomic approval
    const result = await approveRequestTransaction(requestId, user.id)
    
    if (!result.success) {
      const statusCode = result.code === ERROR_CODES.NOT_FOUND ? 404 :
                        result.code === ERROR_CODES.FORBIDDEN ? 403 :
                        result.code === ERROR_CODES.EVENT_FULL ? 409 :
                        result.code === ERROR_CODES.CONFLICT ? 409 :
                        result.code === ERROR_CODES.PAST_EVENT ? 422 : 500
      
      return createErrorResponse(result.code || ERROR_CODES.INTERNAL_ERROR, result.error || 'Approval failed', statusCode)
    }

    // Send approval notification to requester
    try {
      const adminClient = createAdminClient()
      
      // Get request details to find event and requester
      const { data: requestData, error: requestError } = await supabase
        .from('join_requests')
        .select('event_id, requester_id')
        .eq('id', requestId)
        .single()

      if (requestError || !requestData) {
        console.warn('Could not fetch request data for notification:', requestError)
        return createSuccessResponse({ 
          message: 'Join request approved successfully'
        })
      }

      const eventId = requestData.event_id
      const requesterId = requestData.requester_id
      
      // Get event details for notification
      const { data: eventData } = await supabase
        .from('events')
        .select('id, title, date, time, place_hint, user_id')
        .eq('id', eventId)
        .single()

      if (eventData && requesterId) {
        const notificationResult = await sendNotificationToUser(
          requesterId,
          'approved',
          eventData,
          adminClient
        )

        console.log('Approval notification result:', notificationResult)
      }
    } catch (notificationError) {
      // Don't fail the approval if notification fails
      console.error('Failed to send approval notification:', notificationError)
    }

    return createSuccessResponse({ 
      message: 'Join request approved successfully'
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return createErrorResponse(ERROR_CODES.INTERNAL_ERROR, ERROR_MESSAGES[ERROR_CODES.INTERNAL_ERROR], 500)
  }
})