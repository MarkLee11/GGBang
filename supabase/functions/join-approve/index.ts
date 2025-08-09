import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ApproveRequestBody {
  requestId: number
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role for transaction safety
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Also create a service role client for critical operations
    const supabaseServiceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Get the current user from the regular client
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body
    const { requestId }: ApproveRequestBody = await req.json()

    if (!requestId || typeof requestId !== 'number') {
      return new Response(
        JSON.stringify({ error: 'Valid Request ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get the join request and verify user is the event host
    const { data: joinRequest, error: requestError } = await supabaseClient
      .from('join_requests')
      .select(`
        *,
        events!inner(
          id, 
          user_id, 
          capacity, 
          title,
          date,
          time
        )
      `)
      .eq('id', requestId)
      .single()

    if (requestError || !joinRequest) {
      return new Response(
        JSON.stringify({ error: 'Join request not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify user is the event host
    if (joinRequest.events.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: You can only approve requests for your own events' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if request is still pending
    if (joinRequest.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: `Request is already ${joinRequest.status}` }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if event is still in the future
    const eventDateTime = new Date(`${joinRequest.events.date}T${joinRequest.events.time}`)
    if (eventDateTime <= new Date()) {
      return new Response(
        JSON.stringify({ error: 'Cannot approve requests for past events' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Execute transaction with row-level locking for concurrency safety
    const { data: transactionResult, error: transactionError } = await supabaseServiceClient
      .rpc('approve_join_request_transaction', {
        p_request_id: requestId,
        p_event_id: joinRequest.event_id,
        p_requester_id: joinRequest.requester_id,
        p_event_capacity: joinRequest.events.capacity
      })

    if (transactionError) {
      console.error('Transaction error:', transactionError)
      
      // Handle specific error cases
      if (transactionError.message?.includes('capacity_exceeded')) {
        return new Response(
          JSON.stringify({ 
            error: 'Event is at full capacity',
            capacity: joinRequest.events.capacity,
            code: 'CAPACITY_EXCEEDED'
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      
      if (transactionError.message?.includes('already_attending')) {
        return new Response(
          JSON.stringify({ 
            error: 'User is already attending this event',
            code: 'ALREADY_ATTENDING'
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      
      throw transactionError
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Join request approved successfully',
        eventTitle: joinRequest.events.title,
        newAttendeeCount: transactionResult.new_attendee_count,
        capacity: joinRequest.events.capacity,
        requester: {
          id: joinRequest.requester_id
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in join-approve function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        code: 'INTERNAL_ERROR'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})