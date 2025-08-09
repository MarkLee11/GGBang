import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface JoinRequestBody {
  eventId: number
  message?: string
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

    // Get the current user - 仅认证用户
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
    const { eventId, message }: JoinRequestBody = await req.json()

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

    // 校验事件存在且在未来
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .select('id, date, time, title, capacity, user_id')
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

    // 检查用户不能申请自己的活动
    if (event.user_id === user.id) {
      return new Response(
        JSON.stringify({ 
          error: 'You cannot request to join your own event',
          code: 'OWN_EVENT'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // 校验事件在未来
    const eventDateTime = new Date(`${event.date}T${event.time}`)
    const now = new Date()
    
    if (eventDateTime <= now) {
      return new Response(
        JSON.stringify({ 
          error: 'Cannot request to join past events',
          code: 'EVENT_PAST',
          eventDate: eventDateTime.toISOString()
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // 检查用户pending申请总数限制（最多5个）
    const { count: pendingCount, error: pendingCountError } = await supabaseClient
      .from('join_requests')
      .select('*', { count: 'exact', head: true })
      .eq('requester_id', user.id)
      .eq('status', 'pending')

    if (pendingCountError) {
      console.error('Error counting pending requests:', pendingCountError)
      throw pendingCountError
    }

    const MAX_PENDING_REQUESTS = 5
    if (pendingCount !== null && pendingCount >= MAX_PENDING_REQUESTS) {
      return new Response(
        JSON.stringify({ 
          error: `You have reached the maximum limit of ${MAX_PENDING_REQUESTS} pending requests. Please wait for responses or withdraw some requests.`,
          code: 'TOO_MANY_PENDING',
          currentPendingCount: pendingCount,
          maxAllowed: MAX_PENDING_REQUESTS
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // 拒绝重复 pending 申请 + 检查7天冷却期
    const { data: existingRequest, error: checkError } = await supabaseClient
      .from('join_requests')
      .select('id, status, created_at, updated_at')
      .eq('event_id', eventId)
      .eq('requester_id', user.id)
      .maybeSingle()

    if (checkError) {
      console.error('Error checking existing request:', checkError)
      throw checkError
    }

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return new Response(
          JSON.stringify({ 
            error: 'You already have a pending request for this event',
            code: 'DUPLICATE_PENDING',
            existingRequestId: existingRequest.id
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      } else if (existingRequest.status === 'approved') {
        return new Response(
          JSON.stringify({ 
            error: 'You already have an approved request for this event',
            code: 'ALREADY_APPROVED',
            existingRequestId: existingRequest.id
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      } else if (existingRequest.status === 'rejected') {
        // 检查7天冷却期
        const rejectedTime = new Date(existingRequest.updated_at || existingRequest.created_at)
        const cooldownPeriodMs = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
        const cooldownEndTime = new Date(rejectedTime.getTime() + cooldownPeriodMs)
        const now = new Date()
        
        if (now < cooldownEndTime) {
          const hoursRemaining = Math.ceil((cooldownEndTime.getTime() - now.getTime()) / (1000 * 60 * 60))
          const daysRemaining = Math.ceil(hoursRemaining / 24)
          
          return new Response(
            JSON.stringify({ 
              error: `You must wait ${daysRemaining} more day(s) before applying again to this event after being rejected`,
              code: 'REJECTION_COOLDOWN',
              rejectedAt: rejectedTime.toISOString(),
              cooldownEndsAt: cooldownEndTime.toISOString(),
              hoursRemaining,
              daysRemaining,
              existingRequestId: existingRequest.id
            }),
            { 
              status: 429, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
        
        // 冷却期已过，删除旧的被拒绝记录以允许重新申请
        const { error: deleteError } = await supabaseClient
          .from('join_requests')
          .delete()
          .eq('id', existingRequest.id)
          
        if (deleteError) {
          console.error('Error deleting old rejected request:', deleteError)
          // 不抛出错误，继续创建新请求
        }
      }
    }

    // 检查用户是否已经参与此活动
    const { data: existingAttendee, error: attendeeError } = await supabaseClient
      .from('event_attendees')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (attendeeError) {
      console.error('Error checking existing attendee:', attendeeError)
      throw attendeeError
    }

    if (existingAttendee) {
      return new Response(
        JSON.stringify({ 
          error: 'You are already attending this event',
          code: 'ALREADY_ATTENDING'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // 检查活动是否已满
    const { count: currentAttendees, error: countError } = await supabaseClient
      .from('event_attendees')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)

    if (countError) {
      console.error('Error counting attendees:', countError)
      throw countError
    }

    if (currentAttendees !== null && currentAttendees >= event.capacity) {
      return new Response(
        JSON.stringify({ 
          error: 'Event is at full capacity',
          code: 'EVENT_FULL',
          capacity: event.capacity,
          currentAttendees
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // 写入 join_requests(pending)
    const { data: joinRequest, error: insertError } = await supabaseClient
      .from('join_requests')
      .insert({
        event_id: eventId,
        requester_id: user.id,
        message: message || null,
        status: 'pending',
        waitlist: false
      })
      .select(`
        *,
        events!inner(
          id,
          title,
          date,
          time,
          location
        )
      `)
      .single()

    if (insertError) {
      console.error('Error creating join request:', insertError)
      throw insertError
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Join request submitted successfully',
        request: {
          id: joinRequest.id,
          eventId: joinRequest.event_id,
          eventTitle: joinRequest.events.title,
          status: joinRequest.status,
          message: joinRequest.message,
          createdAt: joinRequest.created_at
        },
        event: {
          title: event.title,
          date: event.date,
          time: event.time,
          capacity: event.capacity,
          currentAttendees: currentAttendees || 0,
          availableSpots: event.capacity - (currentAttendees || 0)
        }
      }),
      { 
        status: 201, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in join-request function:', error)
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