import { NextResponse } from 'next/server'
import { PROPERTY_HOSPITABLE_MAP, MONTHS_SHORT, MONTHS_FULL, fmtBRL } from '@/lib/types'
import { getAllReservations, splitReservationByMonth } from '@/lib/hospitable'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  // Limit data to today (Brazilian time)
  const now = new Date()
  const brNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const todayStr = brNow.toISOString().slice(0, 10)
  const currentMonth = brNow.getMonth()
  const currentDay = brNow.getDate()

  try {
    // Fetch Hospitable reservations (Jan 1 to today only)
    let hospReservations: any[] = []
    try {
      if (process.env.HOSPITABLE_API_KEY) {
        hospReservations = await getAllReservations('2026-01-01', todayStr)
      }
    } catch (e: any) {
      console.error('[Hospitable fetch error]', e.message)
    }

    // Build apartment summaries from Hospitable data
    const aptNames = [...new Set(Object.keys(PROPERTY_HOSPITABLE_MAP))]
      .filter(n => !n.startsWith('S-')) // Skip S-102 duplicate
    const summaries = []

    for (const name of aptNames) {
      const aptRes = hospReservations.filter(r => r.apartmentName === name)
      const proRata = aptRes.flatMap(r => splitReservationByMonth(r))

      const months = MONTHS_SHORT.map((label, monthIdx) => {
        // Only include months up to current month
        if (monthIdx > currentMonth) {
          return {
            month: `${label}/26`,
            reservations: [],
            receitaTotal: 'R$ 0,00',
            expenses: [],
            despesaTotal: 'R$ 0,00',
            resultado: 'R$ 0,00',
            managerCommission: 'R$ 0,00',
            managerName: 'Diego',
            repassar: 'R$ 0,00',
          }
        }

        const monthEntries = proRata
          .filter(e => e.monthIdx === monthIdx)
          // For current month, only include reservations that started before today
          .filter(e => {
            if (monthIdx < currentMonth) return true
            return e.checkinDay <= currentDay
          })
          .sort((a, b) => a.checkinDay - b.checkinDay)

        let totalRevenue = 0
        const reservations: any[] = []

        for (const e of monthEntries) {
          reservations.push({
            checkin: e.checkinDay.toString(),
            checkout: e.checkoutDay.toString(),
            guest: e.guestName,
            revenue: fmtBRL(e.revenue),
            source: 'hospitable',
            guestOrigin: e.guestCountry,
          })
          totalRevenue += e.revenue

          for (const adj of e.adjustments) {
            reservations.push({
              checkin: '',
              checkout: '',
              guest: `↳ ${e.guestName}`,
              revenue: fmtBRL(adj.amount),
              source: 'adjustment',
              guestOrigin: adj.label,
            })
            totalRevenue += adj.amount
          }
        }

        // Commission at 15%
        const commission = totalRevenue * 0.15
        const resultado = totalRevenue // Before expenses (no Sheets data yet)

        return {
          month: `${label}/26`,
          reservations,
          receitaTotal: fmtBRL(totalRevenue),
          expenses: [],
          despesaTotal: 'R$ 0,00',
          resultado: fmtBRL(resultado),
          managerCommission: fmtBRL(commission),
          managerName: 'Diego',
          repassar: fmtBRL(commission),
        }
      })

      summaries.push({
        name,
        hospitableId: PROPERTY_HOSPITABLE_MAP[name],
        months,
        directReservations: [],
      })
    }

    return NextResponse.json(summaries)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
