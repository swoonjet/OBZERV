import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  // Verify caller's JWT to get their user ID
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.replace('Bearer ', '')

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  )

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...cors, 'content-type': 'application/json' },
    })
  }

  // Use service role to query across users
  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  // Get all publisher IDs this user subscribes to
  const { data: subs, error: subsErr } = await admin
    .from('subscriptions')
    .select('publisher_id')
    .eq('subscriber_id', user.id)

  if (subsErr) {
    return new Response(JSON.stringify({ error: subsErr.message }), {
      status: 500, headers: { ...cors, 'content-type': 'application/json' },
    })
  }

  if (!subs || subs.length === 0) {
    return new Response(JSON.stringify({ items: [] }), {
      status: 200, headers: { ...cors, 'content-type': 'application/json' },
    })
  }

  const publisherIds = subs.map((s) => s.publisher_id)

  // Fetch observations from all publishers, newest first, no location data
  const { data: observations, error: obsErr } = await admin
    .from('observations')
    .select('id, transcript, tags, duration, created_at, user_id')
    .in('user_id', publisherIds)
    .order('created_at', { ascending: false })
    .limit(40)

  if (obsErr) {
    return new Response(JSON.stringify({ error: obsErr.message }), {
      status: 500, headers: { ...cors, 'content-type': 'application/json' },
    })
  }

  // Fetch handles for all publishers in one query
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, handle')
    .in('id', publisherIds)

  const handleMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.handle]))

  // Attach handle to each observation (location already excluded from select)
  const items = (observations ?? []).map((obs) => ({
    id: obs.id,
    transcript: obs.transcript,
    tags: obs.tags,
    duration: obs.duration,
    created_at: obs.created_at,
    handle: handleMap[obs.user_id] ?? 'unknown',
  }))

  return new Response(JSON.stringify({ items }), {
    status: 200, headers: { ...cors, 'content-type': 'application/json' },
  })
})
