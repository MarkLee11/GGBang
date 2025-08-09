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
    const { eventId, message } = await req.json()

    if (!eventId) {
      return new Response(
        JSON.stringify({ error: 'Event ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if event exists and is in the future
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .select('id, date, time, title')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return new Response(
        JSON.stringify({ error: 'Event not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if event is in the future
    const eventDateTime = new Date(`${event.date}T${event.time}`)
    const now = new Date()
    
    if (eventDateTime <= now) {
      return new Response(
        JSON.stringify({ error: 'Cannot request to join past events' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if user already has a request for this event
    const { data: existingRequest, error: checkError } = await supabaseClient
      .from('join_requests')
      .select('id, status')
      .eq('event_id', eventId)
      .eq('requester_id', user.id)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw checkError
    }

    if (existingRequest) {
      return new Response(
        JSON.stringify({ 
          error: `You already have a ${existingRequest.status} request for this event` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if user is already attending this event
    const { data: existingAttendee, error: attendeeError } = await supabaseClient
      .from('event_attendees')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .single()

    if (attendeeError && attendeeError.code !== 'PGRST116') {
      throw attendeeError
    }

    if (existingAttendee) {
      return new Response(
        JSON.stringify({ error: 'You are already attending this event' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create join request
    const { data: joinRequest, error: insertError } = await supabaseClient
      .from('join_requests')
      .insert({
        event_id: eventId,
        requester_id: user.id,
        message: message || null,
        status: 'pending'
      })
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Join request sent successfully',
        request: joinRequest 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in join-request function:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})