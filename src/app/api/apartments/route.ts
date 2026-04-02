import { NextResponse } from 'next/server'
import { PROPERTY_HOSPITABLE_MAP, MONTHS_SHORT, fmtBRL, APARTMENTS } from '@/lib/types'
import { getAllReservations, splitReservationByMonth } from '@/lib/hospitable'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

interface AptConfig { code: string; commission_pct: number; owner_name: string | null }

export async function GET() {
  const now = new Date()
  const brNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const todayStr = brNow.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
  const currentMonth = brNow.getMonth()
  const currentDay = brNow.getDate()
  const currentYear = brNow.getFullYear()

  try {
    // 1. Load apartment configs (commission rates, owner info)
    const { data: aptConfigs } = await supabase
      .from('apartments').select('code, commission_pct, owner_name').eq('active', true)
    const configMap: Record<string, AptConfig> = {}
    for (const a of (aptConfigs || [])) configMap[a.code] = a

    // 2. Load all Supabase data in parallel
    const [
      { data: dbExpenses },
      { data: dbAirbnb },
      { data: dbDirect },
      { data: dbAppExpenses },
      { data: dbReservations },
    ] = await Promise.all([
      supabase.from('expenses').select('*').eq('year', currentYear),
      supabase.from('airbnb_transactions').select('*').eq('year', currentYear),
      supabase.from('direct_reservations').select('*').gte('checkin', `${currentYear}-01-01`).lte('checkin', `${currentYear}-12-31`),
      supabase.from('app_expenses').select('*').gte('expense_date', `${currentYear}-01-01`),
      supabase.from('reservations').select('*').gte('checkin', `${currentYear}-01-01`).lte('checkin', `${currentYear}-12-31`).eq('status', 'accepted'),
    ])

    // 3. Fetch Hospitable reservations (live API), fallback to Supabase cache
    let hospReservations: any[] = []
    try {
      if (process.env.HOSPITABLE_API_KEY) {
        hospReservations = await getAllReservations(`${currentYear}-01-01`, todayStr)
      }
    } catch (e: any) { console.error('[Hospitable fetch error]', e.message) }

    // Fallback: if live API returned nothing, use cached reservations from Supabase
    if (hospReservations.length === 0 && dbReservations && dbReservations.length > 0) {
      hospReservations = dbReservations.map(r => ({
        id: r.id,
        platform: r.platform || '',
        status: r.status || 'accepted',
        arrivalDate: r.checkin,
        departureDate: r.checkout,
        guestName: r.guest_name || 'Unknown',
        guestCountry: r.guest_country || '',
        nights: r.nights || 0,
        guests: r.guests || 0,
        propertyUuid: '',
        apartmentName: r.apartment_code,
        payout: Number(r.payout) || 0,
        hostServiceFee: Number(r.host_service_fee) || 0,
        cleaningFee: Number(r.cleaning_fee) || 0,
        totalPrice: Number(r.total_price) || 0,
        currency: r.currency || 'BRL',
        adjustments: [],
      }))
      console.log(`[Apartments] Using ${hospReservations.length} cached reservations from Supabase`)
    }

    // 4. Build summaries
    const summaries = []
    for (const name of [...APARTMENTS]) {
      const config = configMap[name]
      const commPct = config?.commission_pct ? Number(config.commission_pct) : 0.15

      const aptRes = hospReservations.filter(r => r.apartmentName === name)
      const proRata = aptRes.flatMap(r => splitReservationByMonth(r))
      const aptAirbnb = (dbAirbnb || []).filter(t => t.apartment_code === name)
      const aptExpenses = (dbExpenses || []).filter(e => e.apartment_code === name)
      const aptAppExp = (dbAppExpenses || []).filter(e => e.apartment_code === name)
      const aptDirect = (dbDirect || []).filter(r => r.apartment_code === name)

      const months = MONTHS_SHORT.map((label, mi) => {
        if (mi > currentMonth) return emptyMonth(label)

        let totalRevenue = 0
        const reservations: any[] = []

        // REVENUE: prefer Supabase CSV imports, fallback to Hospitable
        const monthAirbnb = aptAirbnb.filter(t => t.month === mi + 1)
        if (monthAirbnb.length > 0) {
          const payouts = monthAirbnb.filter(t => !t.is_adjustment)
          const adjusts = monthAirbnb.filter(t => t.is_adjustment)
          for (const tx of payouts) {
            reservations.push({ checkin: tx.checkin_date || tx.transaction_date, checkout: tx.checkout_date || '', guest: tx.guest_name || '—', revenue: fmtBRL(Number(tx.amount)), source: 'airbnb_csv', guestOrigin: tx.listing_name || '', nights: tx.nights })
            totalRevenue += Number(tx.amount)
          }
          for (const adj of adjusts) {
            reservations.push({ checkin: '', checkout: '', guest: `↳ ${adj.guest_name || 'Ajuste'}`, revenue: fmtBRL(Number(adj.amount)), source: 'adjustment', guestOrigin: adj.details || adj.type || '' })
            totalRevenue += Number(adj.amount)
          }
        } else {
          const mEntries = proRata.filter(e => e.monthIdx === mi).filter(e => mi < currentMonth ? true : e.checkinDay <= currentDay).sort((a, b) => a.checkinDay - b.checkinDay)
          for (const e of mEntries) {
            reservations.push({ checkin: e.checkinDay.toString(), checkout: e.checkoutDay.toString(), guest: e.guestName, revenue: fmtBRL(e.revenue), source: 'hospitable', guestOrigin: e.guestCountry })
            totalRevenue += e.revenue
            for (const adj of e.adjustments) {
              reservations.push({ checkin: '', checkout: '', guest: `↳ ${e.guestName}`, revenue: fmtBRL(adj.amount), source: 'adjustment', guestOrigin: adj.label })
              totalRevenue += adj.amount
            }
          }
        }

        // Direct reservations with PRO RATA across months
        for (const dr of aptDirect) {
          const [ciy,cim,cid] = dr.checkin.split('-').map(Number), [coy,com,cod] = dr.checkout.split('-').map(Number)
          const ci = new Date(ciy, cim-1, cid), co = new Date(coy, com-1, cod)
          const totalNights = Math.max(1, Math.round((co.getTime() - ci.getTime()) / 86400000))
          const nightly = Number(dr.total_value) / totalNights
          const mStart = new Date(currentYear, mi, 1), mEnd = new Date(currentYear, mi + 1, 0)
          const oStart = new Date(Math.max(ci.getTime(), mStart.getTime()))
          const oEnd = new Date(Math.min(co.getTime(), mEnd.getTime()))
          const nightsInMonth = Math.max(0, Math.round((oEnd.getTime() - oStart.getTime()) / 86400000))
          if (nightsInMonth > 0) {
            const proVal = nightly * nightsInMonth
            reservations.push({ checkin: dr.checkin, checkout: dr.checkout, guest: dr.guest_name, revenue: fmtBRL(proVal), source: dr.source === 'whatsapp' ? 'whatsapp' : 'site', guestOrigin: `Direta${totalNights !== nightsInMonth ? ` (${nightsInMonth}/${totalNights} noites)` : ''}`, nights: nightsInMonth })
            totalRevenue += proVal
          }
        }

        // EXPENSES
        const expenses: any[] = []
        let totalExpenses = 0
        for (const exp of aptExpenses.filter(e => e.month === mi + 1)) {
          expenses.push({ date: `${mi + 1}/${currentYear}`, label: exp.label, obs: exp.notes || '', value: fmtBRL(Number(exp.amount)) })
          totalExpenses += Number(exp.amount)
        }
        for (const ae of aptAppExp) {
          const [ey,em,ed] = ae.expense_date.split('-').map(Number); const d = new Date(ey, em-1, ed)
          if (d.getMonth() === mi) {
            expenses.push({ date: ae.expense_date, label: ae.description || 'Gasto App', obs: 'Via Giro Temporada', value: fmtBRL(Number(ae.amount)) })
            totalExpenses += Number(ae.amount)
          }
        }

        const resultado = totalRevenue - totalExpenses
        const commission = totalRevenue * commPct
        return {
          month: `${label}/26`, reservations, receitaTotal: fmtBRL(totalRevenue),
          expenses, despesaTotal: fmtBRL(totalExpenses), resultado: fmtBRL(resultado),
          managerCommission: fmtBRL(commission), managerName: 'Diego', repassar: fmtBRL(commission),
          _raw: { revenue: totalRevenue, expenses: totalExpenses, result: resultado, commission, ownerPart: resultado - commission, commissionPct: commPct }
        }
      })

      summaries.push({
        name, hospitableId: PROPERTY_HOSPITABLE_MAP[name],
        ownerName: config?.owner_name || null, commissionPct: commPct,
        months, directReservations: aptDirect.map(r => ({ checkin: r.checkin, checkout: r.checkout, guest: r.guest_name, totalValue: fmtBRL(Number(r.total_value)), paid: r.payment_status, obs: r.notes || '' })),
      })
    }
    return NextResponse.json(summaries)
  } catch (error: any) {
    console.error('[API /apartments error]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function emptyMonth(label: string) {
  return { month: `${label}/26`, reservations: [], receitaTotal: 'R$ 0,00', expenses: [], despesaTotal: 'R$ 0,00', resultado: 'R$ 0,00', managerCommission: 'R$ 0,00', managerName: 'Diego', repassar: 'R$ 0,00', _raw: { revenue: 0, expenses: 0, result: 0, commission: 0, ownerPart: 0, commissionPct: 0.15 } }
}
