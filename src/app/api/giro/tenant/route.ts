import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

function getSupabase(request: NextRequest, response: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )
}

// GET — fetch current user's tenant
export async function GET(request: NextRequest) {
  const response = NextResponse.next()
  const supabase = getSupabase(request, response)

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user already has a tenant
  const { data: tenant } = await supabase
    .from('giro_tenants')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (!tenant) {
    return NextResponse.json({ tenant: null })
  }

  return NextResponse.json({ tenant })
}

// POST — create tenant for newly signed-up user
export async function POST(request: NextRequest) {
  const response = NextResponse.next()
  const supabase = getSupabase(request, response)

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if tenant already exists
  const { data: existing } = await supabase
    .from('giro_tenants')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (existing) {
    return NextResponse.json({ tenant: existing })
  }

  const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Meu Negócio'

  const { data: tenant, error } = await supabase
    .from('giro_tenants')
    .insert({ name, owner_id: user.id })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Also create the owner as a member
  await supabase.from('giro_members').insert({
    tenant_id: tenant.id,
    auth_user_id: user.id,
    display_name: name,
    role: 'owner',
    email: user.email,
  })

  return NextResponse.json({ tenant })
}
