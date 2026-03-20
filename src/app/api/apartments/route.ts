import { NextResponse } from 'next/server'
import { getSheetData } from '@/lib/google-sheets'
import { parseReservationTab, parseDirectReservations } from '@/lib/sheet-parser'
import { PROPERTY_HOSPITABLE_MAP, MONTHS_SHORT, fmtBRL, parseBRL } from '@/lib/types'
import { getAllReservations, splitReservationByMonth } from '@/lib/hospitable'
import type { HospitableReservation } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const aptTabs = Object.keys(PROPERTY_HOSPITABLE_MAP)
    const summaries = []

    // Load direct reservations from Operação AL sheet
    let directReservations: ReturnType<typeof parseDirectReservations> = []
    try {
      const opData = await getSheetData('Operação AL')
      directReservations = parseDirectReservations(opData)
    } catch {}

    // Load Hospitable reservations
    let hospReservations: HospitableReservation[] = []
    try {
      if (process.env.HOSPITABLE_API_KEY) {
        hospReservations = await getAllReservations('2026-01-01', '2026-12-31')
      }
    } catch {}

    for (const name of aptTabs) {
      try {
        const data = await getSheetData(name)
        const months = parseReservationTab(data)

        // Enrich with Hospitable data (pro-rata, guest origin)
        const aptHospRes = hospReservations.filter(r => r.apartmentName === name)
        const proRata = aptHospRes.flatMap(r => splitReservationByMonth(r))

        for (const md of months) {
          const monthIdx = MONTHS_SHORT.findIndex(m => md.month.toUpperCase().startsWith(m))
          if (monthIdx < 0) continue

          const monthProRata = proRata.filter(e => e.monthIdx === monthIdx)

          for (const res of md.reservations) {
            const checkinDay = parseInt(res.checkin, 10)
            const match = monthProRata.find(e => e.checkinDay === checkinDay)
            if (match) {
              res.guestOrigin = match.guestCountry
              if (!res.guest && match.guestName) res.guest = match.guestName
              if (match.isPartial) {
                res.revenue = fmtBRL(match.revenue)
              }
            }
          }

          // Fill empty months from Hospitable
          if (md.reservations.length === 0 && monthProRata.length > 0) {
            let monthRevenue = 0
            for (const e of monthProRata) {
              md.reservations.push({
                checkin: e.checkinDay.toString(),
                checkout: e.checkoutDay.toString(),
                guest: e.guestName,
                revenue: fmtBRL(e.revenue),
                source: 'hospitable',
                guestOrigin: e.guestCountry,
              })
              monthRevenue += e.revenue
              for (const adj of e.adjustments) {
                md.reservations.push({
                  checkin: '',
                  checkout: '',
                  guest: `↳ ${e.guestName}`,
                  revenue: fmtBRL(adj.amount),
                  source: 'adjustment',
                  guestOrigin: adj.label,
                })
                monthRevenue += adj.amount
              }
            }
            if (parseBRL(md.receitaTotal) === 0) {
              md.receitaTotal = fmtBRL(monthRevenue)
              md.resultado = fmtBRL(monthRevenue - parseBRL(md.despesaTotal))
            }
          }
        }

        const aptDirect = directReservations.filter(dr =>
          dr.apartment.startsWith(name) || dr.apartment === name
        )

        summaries.push({
          name,
          hospitableId: PROPERTY_HOSPITABLE_MAP[name],
          months,
          directReservations: aptDirect,
        })
      } catch {
        summaries.push({ name, months: [], directReservations: [], error: 'Could not load' })
      }
    }

    return NextResponse.json(summaries)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
