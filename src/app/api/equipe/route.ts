import { NextResponse } from 'next/server'
import { getAllReservations } from '@/lib/hospitable'

export const dynamic = 'force-dynamic'

// All date math in Brazil timezone to avoid UTC drift
function brToday(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d + days)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
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

    const allRes = await getAllReservations(startDate, endDate)

    // Filter to Leblon apartments only and map to simple format
    const LEBLON = ['103', '403', '102', '303', '334A']
    const reservations = allRes
      .filter(r => LEBLON.includes(r.apartmentName) && r.status === 'accepted')
      .map(r => ({
        apartment_code: r.apartmentName,
        guest_name: r.guestName,
        checkin: r.arrivalDate,
        checkout: r.departureDate,
        nights: r.nights || 0,
        guests: r.guests || 0,
        source: r.platform || 'hospitable',
      }))

    return NextResponse.json({ ok: true, reservations })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
