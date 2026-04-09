import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}

const FIELDS = 'id, code, title, subtitle, slug, owner_name, owner_email, owner_phone, commission_pct, commission_valid_from, address, hospitable_uuid, show_on_site, active, max_guests, base_guests, extra_per_guest_per_night, cleaning_fee, created_at'

export async function GET() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('apartments')
    .select(FIELDS)
    .order('code')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase()
  const body = await request.json()

  const { code, title, subtitle, slug, owner_name, owner_email, owner_phone, commission_pct, commission_valid_from, address, hospitable_uuid, show_on_site, max_guests, base_guests, extra_per_guest_per_night, cleaning_fee } = body

  if (!code || !title) {
    return NextResponse.json({ error: 'Codigo e titulo sao obrigatorios' }, { status: 400 })
  }

  // Validate slug uniqueness
  if (slug) {
    const { data: existing } = await supabase.from('apartments').select('id').eq('slug', slug).single()
    if (existing) return NextResponse.json({ error: 'Esse slug ja esta em uso' }, { status: 400 })
  }

  const { data, error } = await supabase.from('apartments').insert({
    code,
    title,
    subtitle: subtitle || null,
    slug: slug || code.toLowerCase().replace(/\s+/g, '-'),
    owner_name: owner_name || null,
    owner_email: owner_email || null,
    owner_phone: owner_phone || null,
    commission_pct: commission_pct ? Number(commission_pct) / 100 : 0,
    commission_valid_from: commission_valid_from || new Date().toLocaleDateString('sv-SE'),
    address: address || null,
    hospitable_uuid: hospitable_uuid || null,
    show_on_site: show_on_site !== false,
    active: true,
    max_guests: max_guests || 2,
    base_guests: base_guests || 2,
    extra_per_guest_per_night: extra_per_guest_per_night || 0,
    cleaning_fee: cleaning_fee != null ? Number(cleaning_fee) : 150,
  }).select(FIELDS).single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(request: NextRequest) {
  const supabase = getSupabase()
  const body = await request.json()
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: 'ID obrigatorio' }, { status: 400 })

  // If commission_pct comes as percentage (e.g., 15), convert to decimal
  if (updates.commission_pct !== undefined && updates.commission_pct > 1) {
    updates.commission_pct = updates.commission_pct / 100
  }

  // Validate slug uniqueness if changing
  if (updates.slug) {
    const { data: existing } = await supabase
      .from('apartments')
      .select('id')
      .eq('slug', updates.slug)
      .neq('id', id)
      .single()
    if (existing) return NextResponse.json({ error: 'Esse slug ja esta em uso' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('apartments')
    .update(updates)
    .eq('id', id)
    .select(FIELDS)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
