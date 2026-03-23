import { NextResponse } from 'next/server'
import { getAllReservations } from '@/lib/hospitable'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const now = new Date()
    const brNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
    const dayOfWeek = brNow.getDay()
    const monday = new Date(brNow)
    monday.setDate(brNow.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))

    // Fetch 5 weeks of data (current -1 to +3)
    const start = new Date(monday)
    start.setDate(start.getDate() - 7)
    const end = new Date(monday)
    end.setDate(end.getDate() + 28)

    const startDate = start.toISOString().slice(0, 10)
    const endDate = end.toISOString().slice(0, 10)

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
        source: r.platform || 'hospitable',
      }))

    return NextResponse.json({ ok: true, reservations })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
