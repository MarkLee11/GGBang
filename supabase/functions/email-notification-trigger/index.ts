import { createClient } from 'jsr:@supabase/supabase-js@2'

export async function handler(req: Request): Promise<Response> {
  const auth = req.headers.get('authorization') ?? ''
  const isCron = auth === `Bearer ${Deno.env.get('CRON_SECRET')}`

  if (isCron) {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    )
    
    const body = await req.json().catch(() => ({}))
    return new Response(JSON.stringify({ ok: true, mode: 'system', echo: body }), { 
      status: 200, 
      headers: { 'content-type': 'application/json' } 
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: auth } } }
  )

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    return new Response(JSON.stringify({ 
      ok: false, 
      code: 'UNAUTHORIZED', 
      message: 'Authentication required' 
    }), { 
      status: 401, 
      headers: { 'content-type': 'application/json' } 
    })
  }

  const body = await req.json().catch(() => ({}))
  return new Response(JSON.stringify({ 
    ok: true, 
    mode: 'user', 
    user: data.user.id,
    echo: body 
  }), { 
    status: 200, 
    headers: { 'content-type': 'application/json' } 
  })
}

Deno.serve(handler)
