import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { createServerClient } = await import('@/lib/supabase')
    const sb = createServerClient()
    const apartment = request.nextUrl.searchParams.get('apartment')
    let query = sb.from('direct_reservations').select('*').order('created_at', { ascending: false })
    if (apartment) query = query.eq('apartment', apartment)
    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { createServerClient } = await import('@/lib/supabase')
    const body = await request.json()
    const { apartment, guestName, checkin, checkout, totalValue, paid, obs } = body
    if (!apartment || !guestName || !checkin || !checkout || !totalValue) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
    }
    const sb = createServerClient()
    const { data, error } = await sb.from('direct_reservations').insert({
      apartment, guest_name: guestName, checkin, checkout,
      total_value: totalValue, paid: paid || null, obs: obs || null,
    }).select().single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
