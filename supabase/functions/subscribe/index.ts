import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.replace('Bearer ', '')

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  )

  // Verify caller
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...cors, 'content-type': 'application/json' },
    })
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  const body = await req.json().catch(() => ({}))
  const handle = (body.handle ?? '').trim().toLowerCase()

  if (!handle) {
    return new Response(JSON.stringify({ error: 'Missing handle' }), {
      status: 400, headers: { ...cors, 'content-type': 'application/json' },
    })
  }

  // Look up publisher by handle
  const { data: profile, error: profileErr } = await admin
    .from('profiles')
    .select('id')
    .eq('handle', handle)
    .single()

  if (profileErr || !profile) {
    return new Response(JSON.stringify({ error: 'Handle not found' }), {
      status: 404, headers: { ...cors, 'content-type': 'application/json' },
    })
  }

  if (profile.id === user.id) {
    return new Response(JSON.stringify({ error: "You can't subscribe to yourself" }), {
      status: 400, headers: { ...cors, 'content-type': 'application/json' },
    })
  }

  if (req.method === 'POST') {
    const { error } = await admin.from('subscriptions').upsert({
      subscriber_id: user.id,
      publisher_id: profile.id,
    }, { onConflict: 'subscriber_id,publisher_id' })

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...cors, 'content-type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({ ok: true, action: 'subscribed' }), {
      status: 200, headers: { ...cors, 'content-type': 'application/json' },
    })
  }

  if (req.method === 'DELETE') {
    const { error } = await admin.from('subscriptions').delete()
      .eq('subscriber_id', user.id)
      .eq('publisher_id', profile.id)

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...cors, 'content-type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({ ok: true, action: 'unsubscribed' }), {
      status: 200, headers: { ...cors, 'content-type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405, headers: { ...cors, 'content-type': 'application/json' },
  })
})
