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
    const { requestId, note } = await req.json()

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
        events!inner(id, user_id, title)
      `)
      .eq('id', requestId)
      .single()

    if (requestError) {
      throw requestError
    }

    if (!joinRequest || joinRequest.events.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: You can only reject requests for your own events' }),
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

    // Update request status to rejected
    const { error: rejectError } = await supabaseClient
      .from('join_requests')
      .update({ 
        status: 'rejected',
        // Optionally store rejection note in message field or create a separate field
        ...(note && { rejection_note: note })
      })
      .eq('id', requestId)

    if (rejectError) {
      throw rejectError
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Join request rejected successfully',
        eventTitle: joinRequest.events.title
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in join-reject function:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})