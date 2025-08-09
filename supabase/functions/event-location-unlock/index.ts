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
    const { eventId } = await req.json()

    if (!eventId) {
      return new Response(
        JSON.stringify({ error: 'Event ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify user is the event host
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .select('id, user_id, title, date, time, place_exact_visible')
      .eq('id', eventId)
      .single()

    if (eventError) {
      throw eventError
    }

    if (!event || event.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: You can only unlock location for your own events' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (event.place_exact_visible) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Location is already unlocked for approved members',
          alreadyUnlocked: true
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if it's appropriate time to unlock (e.g., 1 hour before event)
    const eventDateTime = new Date(`${event.date}T${event.time}`)
    const now = new Date()
    const oneHourBefore = new Date(eventDateTime.getTime() - (60 * 60 * 1000))

    // For demo purposes, allow unlocking anytime. In production, you might want:
    // if (now < oneHourBefore) {
    //   return new Response(
    //     JSON.stringify({ 
    //       error: 'Location can only be unlocked 1 hour before the event',
    //       unlockTime: oneHourBefore.toISOString()
    //     }),
    //     { 
    //       status: 400, 
    //       headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    //     }
    //   )
    // }

    // Update event to make exact location visible
    const { error: updateError } = await supabaseClient
      .from('events')
      .update({ place_exact_visible: true })
      .eq('id', eventId)

    if (updateError) {
      throw updateError
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Location unlocked successfully for approved members',
        eventTitle: event.title
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in event-location-unlock function:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})