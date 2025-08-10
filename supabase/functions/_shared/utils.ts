
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ERROR_CODES, ERROR_MESSAGES, type ApiResponse, type Event } from './types.ts'

// CORS headers for all responses
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

// Create authenticated client from request
export function createAuthenticatedClient(req: Request) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: req.headers.get('Authorization') || ''
      }
    }
  })
}

// Create admin client with service role
export function createAdminClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  
  return createClient(supabaseUrl, serviceRoleKey)
}

// Validate user authentication
export async function validateAuth(supabase: any): Promise<{ user: any } | { error: Response }> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return {
        error: new Response(
          JSON.stringify({ 
            ok: false, 
            code: ERROR_CODES.UNAUTHORIZED, 
            message: ERROR_MESSAGES[ERROR_CODES.UNAUTHORIZED] 
          }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }
    
    return { user }
  } catch (err) {
    return {
      error: new Response(
        JSON.stringify({ 
          ok: false, 
          code: ERROR_CODES.INTERNAL_ERROR, 
          message: ERROR_MESSAGES[ERROR_CODES.INTERNAL_ERROR] 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
  }
}

// Get event host ID
export async function getEventHost(supabase: any, eventId: number): Promise<string | null> {
  try {
    const { data: event, error } = await supabase
      .from('events')
      .select('user_id')
      .eq('id', eventId)
      .single()
    
    if (error || !event) {
      return null
    }
    
    return event.user_id
  } catch {
    return null
  }
}

// Check if event is in the past
export function isEventInPast(event: Event): boolean {
  const eventDateTime = new Date(`${event.date}T${event.time}:00Z`)
  const now = new Date()
  return eventDateTime <= now
}

// Validate JSON body with schema
export async function validateJsonBody<T>(req: Request, validator: (data: any) => data is T): Promise<{ data: T } | { error: Response }> {
  try {
    const body = await req.json()
    
    if (!validator(body)) {
      return {
        error: new Response(
          JSON.stringify({ 
            ok: false, 
            code: ERROR_CODES.VALIDATION_ERROR, 
            message: ERROR_MESSAGES[ERROR_CODES.VALIDATION_ERROR] 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }
    
    return { data: body }
  } catch {
    return {
      error: new Response(
        JSON.stringify({ 
          ok: false, 
          code: ERROR_CODES.VALIDATION_ERROR, 
          message: 'Invalid JSON' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
  }
}

// Create success response
export function createSuccessResponse<T>(data?: T): Response {
  return new Response(
    JSON.stringify({ ok: true, data }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  )
}

// Create error response
export function createErrorResponse(code: string, message: string, status: number = 400): Response {
  return new Response(
    JSON.stringify({ ok: false, code, message }),
    { 
      status, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  )
}

// Handle CORS preflight
export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  return null
}
