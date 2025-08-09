import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface UnlockLocationBody {
  eventId: number
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

    // Service role client for scheduled tasks
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

    // Check if this is a scheduled task call (has service role key in Authorization header)
    const authHeader = req.headers.get('Authorization') || ''
    const isScheduledTask = authHeader.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '')

    let user = null
    if (!isScheduledTask) {
      // Get the current user for manual calls
      const {
        data: { user: authUser },
        error: userError,
      } = await supabaseClient.auth.getUser()

      if (userError || !authUser) {
        return new Response(
          JSON.stringify({ 
            error: 'Unauthorized: Authentication required',
            code: 'UNAUTHORIZED'
          }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      user = authUser
    }

    // Parse request body
    const { eventId }: UnlockLocationBody = await req.json()

    if (!eventId || typeof eventId !== 'number') {
      return new Response(
        JSON.stringify({ 
          error: 'Valid Event ID is required',
          code: 'INVALID_EVENT_ID'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get event details
    const { data: event, error: eventError } = await (isScheduledTask ? supabaseServiceClient : supabaseClient)
      .from('events')
      .select('id, user_id, title, date, time, place_exact_visible, place_exact, place_hint')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return new Response(
        JSON.stringify({ 
          error: 'Event not found',
          code: 'EVENT_NOT_FOUND'
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // For manual calls, verify user is the event host
    if (!isScheduledTask && event.user_id !== user?.id) {
      return new Response(
        JSON.stringify({ 
          error: 'Forbidden: You can only unlock location for your own events',
          code: 'FORBIDDEN'
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if location is already unlocked
    if (event.place_exact_visible) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Location is already unlocked for approved members',
          alreadyUnlocked: true,
          eventTitle: event.title,
          unlockedAt: new Date().toISOString()
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get event timing information
    const eventDateTime = new Date(`${event.date}T${event.time}`)
    const now = new Date()
    const oneHourBefore = new Date(eventDateTime.getTime() - (60 * 60 * 1000))

    // For scheduled tasks, check if it's time to unlock
    if (isScheduledTask && now < oneHourBefore) {
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'Too early to unlock location automatically',
          code: 'TOO_EARLY',
          currentTime: now.toISOString(),
          unlockTime: oneHourBefore.toISOString(),
          eventTime: eventDateTime.toISOString()
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if event has already passed
    if (eventDateTime <= now) {
      return new Response(
        JSON.stringify({ 
          error: 'Cannot unlock location for past events',
          code: 'EVENT_PAST',
          eventTime: eventDateTime.toISOString(),
          currentTime: now.toISOString()
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if there's an exact location to unlock
    if (!event.place_exact) {
      return new Response(
        JSON.stringify({ 
          error: 'No exact location available to unlock',
          code: 'NO_EXACT_LOCATION',
          hasHint: !!event.place_hint
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get count of approved attendees
    const { count: approvedAttendees, error: countError } = await (isScheduledTask ? supabaseServiceClient : supabaseClient)
      .from('event_attendees')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)

    if (countError) {
      console.error('Error counting attendees:', countError)
      throw countError
    }

    // 设 place_exact_visible=true
    const { error: updateError } = await (isScheduledTask ? supabaseServiceClient : supabaseClient)
      .from('events')
      .update({ 
        place_exact_visible: true,
        // Optional: record unlock timestamp
        // unlocked_at: new Date().toISOString()
      })
      .eq('id', eventId)

    if (updateError) {
      console.error('Error updating event:', updateError)
      throw updateError
    }

    const unlockReason = isScheduledTask ? 'scheduled_auto_unlock' : 'manual_host_unlock'
    const minutesBeforeEvent = Math.round((eventDateTime.getTime() - now.getTime()) / (1000 * 60))

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Location unlocked successfully for approved members',
        eventTitle: event.title,
        eventId: eventId,
        unlockedAt: new Date().toISOString(),
        unlockReason: unlockReason,
        approvedAttendees: approvedAttendees || 0,
        minutesBeforeEvent: minutesBeforeEvent,
        eventDateTime: eventDateTime.toISOString(),
        exactLocation: event.place_exact // Include the unlocked location in response
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in event-location-unlock function:', error)
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