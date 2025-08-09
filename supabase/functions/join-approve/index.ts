import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the current user
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
    const { requestId } = await req.json()

    if (!requestId) {
      return new Response(
        JSON.stringify({ error: 'Request ID is required' }),
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
        events!inner(id, user_id, capacity, title)
      `)
      .eq('id', requestId)
      .single()

    if (requestError) {
      throw requestError
    }

    if (!joinRequest || joinRequest.events.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: You can only approve requests for your own events' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (joinRequest.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: `Request is already ${joinRequest.status}` }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check current attendee count
    const { count: currentAttendees, error: countError } = await supabaseClient
      .from('event_attendees')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', joinRequest.event_id)

    if (countError) {
      throw countError
    }

    // Check if capacity would be exceeded
    if (currentAttendees >= joinRequest.events.capacity) {
      return new Response(
        JSON.stringify({ 
          error: 'Event is at full capacity',
          capacity: joinRequest.events.capacity,
          currentAttendees 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Start transaction: approve request and add to attendees
    const { error: approveError } = await supabaseClient
      .from('join_requests')
      .update({ status: 'approved' })
      .eq('id', requestId)

    if (approveError) {
      throw approveError
    }

    // Add user to event attendees
    const { error: attendeeError } = await supabaseClient
      .from('event_attendees')
      .insert({
        event_id: joinRequest.event_id,
        user_id: joinRequest.requester_id
      })

    if (attendeeError) {
      // Rollback the approval if adding attendee fails
      await supabaseClient
        .from('join_requests')
        .update({ status: 'pending' })
        .eq('id', requestId)
      
      throw attendeeError
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Join request approved successfully',
        eventTitle: joinRequest.events.title,
        newAttendeeCount: currentAttendees + 1,
        capacity: joinRequest.events.capacity
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in join-approve function:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})