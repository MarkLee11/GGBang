
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from '../_shared/utils.ts'

interface DatabaseError extends Error {
  code?: string
  details?: string
  hint?: string
}

interface Event {
  id: number
  title: string
  date: string
  time: string
  place_exact: string | null
  place_exact_visible: boolean
  user_id: string
}

// Calculate if event should be unlocked (1 hour before start time)
function shouldUnlockEvent(eventDate: string, eventTime: string): boolean {
  try {
    // Combine date and time into a full datetime string
    const eventDateTime = `${eventDate}T${eventTime}:00.000Z`
    const eventTimestamp = new Date(eventDateTime).getTime()
    const nowTimestamp = Date.now()
    
    // Calculate minutes until event
    const minutesUntilEvent = (eventTimestamp - nowTimestamp) / (1000 * 60)
    
    // Unlock between 55-65 minutes before (5-minute window to account for cron scheduling)
    return minutesUntilEvent >= 55 && minutesUntilEvent <= 65
  } catch (error) {
    console.error('Error calculating event timing:', error)
    return false
  }
}

// Log unlock activity for monitoring
async function logUnlockActivity(
  supabase: any, 
  eventId: number, 
  eventTitle: string, 
  action: 'unlocked' | 'error' | 'skipped',
  details?: string
) {
  try {
    await supabase
      .from('location_unlock_logs')
      .insert({
        event_id: eventId,
        event_title: eventTitle,
        action,
        details: details || null,
        unlocked_at: new Date().toISOString()
      })
  } catch (error) {
    // Don't fail the main operation if logging fails
    console.error('Failed to log unlock activity:', error)
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify this is a scheduled request (optional security check)
    const authHeader = req.headers.get('authorization')
    const isScheduledRequest = authHeader?.includes('Bearer scheduled-') || 
                              req.headers.get('x-scheduled-job') === 'true'
    
    // For manual testing, also allow service role
    const isServiceRole = authHeader?.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '')
    
    if (!isScheduledRequest && !isServiceRole) {
      console.warn('Unauthorized scheduled unlock attempt')
      return new Response(
        JSON.stringify({ 
          ok: false, 
          code: 'UNAUTHORIZED',
          message: 'This endpoint is only accessible via scheduled jobs' 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create Supabase admin client (service role for system operations)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('Starting scheduled location unlock job...')

    // Find events that need location unlocking
    const { data: candidateEvents, error: fetchError } = await supabaseAdmin
      .from('events')
      .select('id, title, date, time, place_exact, place_exact_visible, user_id')
      .eq('place_exact_visible', false)
      .not('place_exact', 'is', null)
      .gte('date', new Date().toISOString().split('T')[0]) // Only future events
      .order('date', { ascending: true })
      .order('time', { ascending: true })

    if (fetchError) {
      throw fetchError
    }

    if (!candidateEvents || candidateEvents.length === 0) {
      console.log('No events found that need location unlocking')
      return new Response(
        JSON.stringify({ 
          ok: true, 
          message: 'No events need unlocking at this time',
          processed: 0
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Found ${candidateEvents.length} candidate events for unlock check`)

    let unlockedCount = 0
    let skippedCount = 0
    let errorCount = 0
    const results: Array<{eventId: number, title: string, action: string, details?: string}> = []

    // Process each candidate event
    for (const event of candidateEvents) {
      try {
        const shouldUnlock = shouldUnlockEvent(event.date, event.time)
        
        if (!shouldUnlock) {
          console.log(`Event ${event.id} (${event.title}) - not in unlock window yet`)
          await logUnlockActivity(supabaseAdmin, event.id, event.title, 'skipped', 'Not in 1-hour unlock window')
          results.push({ eventId: event.id, title: event.title, action: 'skipped', details: 'Not in unlock window' })
          skippedCount++
          continue
        }

        console.log(`Unlocking location for event ${event.id}: ${event.title}`)

        // Update the event to unlock location (idempotent operation)
        const { error: updateError } = await supabaseAdmin
          .from('events')
          .update({ 
            place_exact_visible: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', event.id)
          .eq('place_exact_visible', false) // Additional safety check

        if (updateError) {
          throw updateError
        }

        console.log(`Successfully unlocked location for event ${event.id}`)
        await logUnlockActivity(supabaseAdmin, event.id, event.title, 'unlocked', 'Auto-unlocked 1 hour before event')
        results.push({ eventId: event.id, title: event.title, action: 'unlocked' })
        unlockedCount++

        // Optional: Send notification to event host
        // This could be implemented as a separate notification system
        console.log(`Location unlocked for "${event.title}" - host could be notified`)

      } catch (eventError) {
        const error = eventError as DatabaseError
        console.error(`Error processing event ${event.id}:`, error)
        await logUnlockActivity(supabaseAdmin, event.id, event.title, 'error', error.message)
        results.push({ 
          eventId: event.id, 
          title: event.title, 
          action: 'error', 
          details: error.message 
        })
        errorCount++
      }
    }

    const summary = {
      ok: true,
      processed: candidateEvents.length,
      unlocked: unlockedCount,
      skipped: skippedCount,
      errors: errorCount,
      results
    }

    console.log('Scheduled unlock job completed:', summary)

    return new Response(
      JSON.stringify(summary),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    const err = error as DatabaseError
    console.error('Scheduled unlock job failed:', err)
    
    return new Response(
      JSON.stringify({ 
        ok: false, 
        code: err.code || 'INTERNAL_ERROR',
        message: err.message || 'Scheduled unlock job failed',
        details: err.details
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
