import { NextResponse } from 'next/server'
import { getAllReservations } from '@/lib/hospitable'
import { createClient } from '@supabase/supabase-js'
import { LEBLON_APARTMENTS } from '@/lib/types'

export const dynamic = 'force-dynamic'

const LEBLON = LEBLON_APARTMENTS

// All date math in Brazil timezone to avoid UTC drift
function brToday(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d + days)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

function mapHospitableRes(r: any) {
  return {
    apartment_code: r.apartmentName,
    guest_name: r.guestName,
    checkin: r.arrivalDate,
    checkout: r.departureDate,
    nights: r.nights || 0,
    guests: r.guests || 0,
    source: r.platform || 'hospitable',
  }
}

function mapSupabaseRes(r: any) {
  return {
    apartment_code: r.apartment_code,
    guest_name: r.guest_name || 'Unknown',
    checkin: r.checkin,
    checkout: r.checkout,
    nights: r.nights || 0,
    guests: r.guests || 0,
    source: r.platform || 'cache',
  }
}

export async function GET() {
  try {
    const today = brToday()
    const [y, m, d] = today.split('-').map(Number)
    const todayDate = new Date(y, m - 1, d)
    const dayOfWeek = todayDate.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = addDays(today, mondayOffset)

    // Fetch 5 weeks of data (current -1 to +3)
    const startDate = addDays(monday, -7)
    const endDate = addDays(monday, 28)

    // 1. Try Hospitable API live
    let reservations: any[] = []
    try {
      const allRes = await getAllReservations(startDate, endDate)
      reservations = allRes
        .filter(r => LEBLON.includes(r.apartmentName) && r.status === 'accepted')
        .map(mapHospitableRes)
    } catch (e: any) {
      console.error('[Equipe] Hospitable API failed:', e.message)
    }

    // 2. Fallback: Supabase cache (same rule as /admin)
    if (reservations.length === 0) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey)
        const { data } = await supabase
          .from('reservations')
          .select('*')
          .gte('checkout', startDate)
          .lte('checkin', endDate)
          .eq('status', 'accepted')
        if (data && data.length > 0) {
          reservations = data
            .filter(r => LEBLON.includes(r.apartment_code))
            .map(mapSupabaseRes)
          console.log(`[Equipe] Using ${reservations.length} cached reservations from Supabase`)
        }
      }
    }

    return NextResponse.json({ ok: true, reservations })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
