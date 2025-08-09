import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RejectRequestBody {
  requestId: number
  note?: string
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

    // Also create a service role client for transaction operations
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

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
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

    // Parse request body
    const { requestId, note }: RejectRequestBody = await req.json()

    if (!requestId || typeof requestId !== 'number') {
      return new Response(
        JSON.stringify({ 
          error: 'Valid Request ID is required',
          code: 'INVALID_REQUEST_ID'
        }),
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
          title,
          date,
          time
        )
      `)
      .eq('id', requestId)
      .single()

    if (requestError || !joinRequest) {
      return new Response(
        JSON.stringify({ 
          error: 'Join request not found',
          code: 'REQUEST_NOT_FOUND'
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // 仅主办方可以拒绝申请
    if (joinRequest.events.user_id !== user.id) {
      return new Response(
        JSON.stringify({ 
          error: 'Forbidden: You can only reject requests for your own events',
          code: 'FORBIDDEN'
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // 检查申请状态
    if (joinRequest.status !== 'pending') {
      return new Response(
        JSON.stringify({ 
          error: `Request is already ${joinRequest.status}`,
          code: 'REQUEST_NOT_PENDING',
          currentStatus: joinRequest.status
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // 检查事件是否还在未来（可选，主办方可能想要拒绝过期的申请）
    const eventDateTime = new Date(`${joinRequest.events.date}T${joinRequest.events.time}`)
    const now = new Date()

    // 使用事务安全的拒绝函数
    const { data: transactionResult, error: transactionError } = await supabaseServiceClient
      .rpc('reject_join_request_transaction', {
        p_request_id: requestId,
        p_rejection_note: note || null
      })

    if (transactionError) {
      console.error('Transaction error:', transactionError)
      
      if (transactionError.message?.includes('request_not_found')) {
        return new Response(
          JSON.stringify({ 
            error: 'Join request not found',
            code: 'REQUEST_NOT_FOUND'
          }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      
      if (transactionError.message?.includes('request_not_pending')) {
        return new Response(
          JSON.stringify({ 
            error: 'Request is not in pending status',
            code: 'REQUEST_NOT_PENDING'
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
        message: 'Join request rejected successfully',
        eventTitle: joinRequest.events.title,
        requester: {
          id: joinRequest.requester_id
        },
        rejectionNote: note || null,
        rejectedAt: new Date().toISOString(),
        isPastEvent: eventDateTime <= now
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in join-reject function:', error)
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