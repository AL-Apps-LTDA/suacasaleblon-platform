import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PROPERTY_HOSPITABLE_MAP } from '@/lib/types'

export const dynamic = 'force-dynamic'

// Reverse map: UUID → apartment code
const UUID_TO_APT: Record<string, string> = {}
for (const [code, uuid] of Object.entries(PROPERTY_HOSPITABLE_MAP)) {
  UUID_TO_APT[uuid] = code
}

// Hospitable webhooks come from 38.80.170.0/24
// Optional: verify with HOSPITABLE_WEBHOOK_SECRET if configured
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.HOSPITABLE_WEBHOOK_SECRET
  if (!secret) return true // No secret = accept all (configure for production)

  // Check query param or header
  const url = new URL(request.url)
  if (url.searchParams.get('secret') === secret) return true
  if (request.headers.get('x-webhook-secret') === secret) return true

  return false
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase not configured')
  return createClient(url, key)
}

// Resolve apartment code from webhook data
function resolveApartmentCode(data: any): string | null {
  // Try property UUID
  const propUuid = data.property_id || data.property_uuid || data.property?.id
  if (propUuid && UUID_TO_APT[propUuid]) return UUID_TO_APT[propUuid]

  // Try property name matching
  const propName = data.property?.name || data.listing?.name || ''
  if (propName) {
    const lower = propName.toLowerCase()
    for (const [code] of Object.entries(PROPERTY_HOSPITABLE_MAP)) {
      if (lower.includes(code.toLowerCase())) return code
    }
  }

  return null
}

// Extract guest count from various formats
function extractGuests(g: any): number {
  if (!g) return 1
  if (typeof g === 'number') return g
  if (typeof g === 'object') return g.total ?? g.adult_count ?? 1
  return Number(g) || 1
}

// Extract financial data
function extractFinancials(fin: any) {
  const hostFin = fin?.host || {}
  const guestFin = fin?.guest || {}

  const payout = hostFin.revenue?.amount ? hostFin.revenue.amount / 100 : 0
  const hostServiceFee = Math.abs(
    (hostFin.host_fees || []).reduce((sum: number, f: any) => sum + (f.amount || 0), 0) / 100
  )
  const cleaningFee = (hostFin.guest_fees || [])
    .filter((f: any) => /clean/i.test(f.label || ''))
    .reduce((sum: number, f: any) => sum + (f.amount || 0), 0) / 100
  const totalPrice = guestFin.total_price?.amount ? guestFin.total_price.amount / 100 : 0

  return { payout, hostServiceFee, cleaningFee, totalPrice, currency: fin?.currency || 'BRL' }
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const action = body.action || body.event || body.type || 'unknown'
    const data = body.data || body.reservation || body

    console.log(`[Hospitable Webhook] ${action}`, JSON.stringify(body).slice(0, 500))

    // Only process reservation events
    if (!action.startsWith('reservation.')) {
      return NextResponse.json({ ok: true, skipped: true, reason: `Unhandled action: ${action}` })
    }

    const supabase = getSupabase()
    const reservationId = data.id || data.reservation_id
    if (!reservationId) {
      return NextResponse.json({ ok: false, error: 'No reservation ID' }, { status: 400 })
    }

    const apartmentCode = resolveApartmentCode(data)
    const guest = data.guest || {}
    const guestName = guest.full_name || guest.first_name || data.guest_name || 'Unknown'
    const guestCountry = guest.country || guest.location || ''
    const checkin = data.arrival_date || data.check_in || data.checkin || ''
    const checkout = data.departure_date || data.check_out || data.checkout || ''
    const nights = data.nights || 0
    const guests = extractGuests(data.guests)
    const platform = data.platform || data.source || ''
    const status = data.status || 'accepted'
    const fin = extractFinancials(data.financials)

    // Handle cancellations
    if (action === 'reservation.changed' && (status === 'cancelled' || status === 'declined')) {
      const { error } = await supabase
        .from('reservations')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', reservationId)

      if (error) console.error('[Hospitable Webhook] Cancel update error:', error.message)

      return NextResponse.json({ ok: true, action: 'cancelled', reservationId })
    }

    // Upsert reservation (same format as cron sync-all)
    const row = {
      id: reservationId,
      apartment_code: apartmentCode,
      guest_name: guestName,
      guest_country: guestCountry,
      checkin,
      checkout,
      nights,
      guests,
      source: 'hospitable',
      platform,
      status,
      payout: fin.payout,
      host_service_fee: fin.hostServiceFee,
      cleaning_fee: fin.cleaningFee,
      total_price: fin.totalPrice,
      currency: fin.currency,
      updated_at: new Date().toISOString(),
    }

    const { error: upsertErr } = await supabase
      .from('reservations')
      .upsert(row, { onConflict: 'id' })

    if (upsertErr) {
      console.error('[Hospitable Webhook] Upsert error:', upsertErr.message)
      return NextResponse.json({ ok: false, error: upsertErr.message }, { status: 500 })
    }

    // Auto-create cleaning for checkout (same logic as cron)
    if (status === 'accepted' && checkout && apartmentCode) {
      const { data: existing } = await supabase
        .from('cleanings')
        .select('id, manually_edited')
        .eq('apartment_code', apartmentCode)
        .eq('scheduled_date', checkout)
        .limit(1)

      if (!existing || existing.length === 0) {
        await supabase.from('cleanings').insert({
          apartment_code: apartmentCode,
          scheduled_date: checkout,
          checkout_guest: guestName,
          type: 'checkout',
          status: 'agendada',
          manually_edited: false,
        })
      } else if (!existing[0].manually_edited) {
        await supabase.from('cleanings').update({
          checkout_guest: guestName,
          type: 'checkout',
        }).eq('id', existing[0].id)
      }
    }

    // Log the webhook
    try {
      await supabase.from('sync_logs').insert({
        source: 'hospitable_webhook',
        direction: 'push',
        status: 'success',
        message: JSON.stringify({ action, reservationId, apartmentCode, guestName, checkin, checkout }),
      })
    } catch { /* don't fail on log error */ }

    console.log(`[Hospitable Webhook] ✅ ${action} → ${apartmentCode} | ${guestName} | ${checkin}→${checkout}`)

    return NextResponse.json({ ok: true, action, reservationId, apartmentCode })
  } catch (err: any) {
    console.error('[Hospitable Webhook] Error:', err.message)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
