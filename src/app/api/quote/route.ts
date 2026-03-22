import { NextRequest, NextResponse } from 'next/server'
import { siteConfig } from '@/lib/config'
import { PROPERTY_HOSPITABLE_MAP } from '@/lib/types'

function nightsBetween(ci: string, co: string): number | null {
  const a = new Date(`${ci}T00:00:00`)
  const b = new Date(`${co}T00:00:00`)
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return null
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

// Static fallback only — used when Hospitable is unavailable
function minNightsFallback(checkInStr: string): number {
  const { rules } = siteConfig
  for (const o of (rules.overrides || [])) {
    if (checkInStr >= o.start && checkInStr <= o.end) return o.min_nights
  }
  const d = new Date(`${checkInStr}T00:00:00`)
  if (isNaN(d.getTime())) return rules.min_nights_default
  const dow = d.getDay()
  return (dow === 5 || dow === 6) ? rules.min_nights_fri_sat : rules.min_nights_default
}

// Pull min_nights from Hospitable calendar — respects Beyond Pricing overrides
async function getMinNightsFromHospitable(propertyCode: string, checkIn: string): Promise<number | null> {
  try {
    const apiKey = process.env.HOSPITABLE_API_KEY
    if (!apiKey) return null

    const uuid = PROPERTY_HOSPITABLE_MAP[propertyCode]
    if (!uuid) return null

    const url = `https://public.api.hospitable.com/v2/properties/${uuid}/calendar?start_date=${checkIn}&end_date=${checkIn}`
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      },
      next: { revalidate: 300 },
    })

    if (!res.ok) return null

    const data = await res.json()
    const days = data?.data?.days || data?.days || []
    const entry = days.find((d: any) => d.date === checkIn)

    if (entry?.min_nights != null) return entry.min_nights
    if (entry?.minimum_stay != null) return entry.minimum_stay

    return null
  } catch {
    return null
  }
}

function getProperty(code: string) {
  return siteConfig.properties.find(p => p.code === code)
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { propertyCode, checkin, checkout, guests } = body

    const p = getProperty(propertyCode)
    if (!p) return NextResponse.json({ ok: false, message: 'Imóvel não encontrado.' }, { status: 404 })

    const n = nightsBetween(checkin, checkout)
    if (!n || n <= 0) return NextResponse.json({ ok: false, message: 'Datas inválidas.' }, { status: 400 })

    const { rules, pricing } = siteConfig
    if (rules.max_checkout_date && checkout > rules.max_checkout_date) {
      return NextResponse.json({ ok: false, message: `Reservas disponíveis somente até ${rules.max_checkout_date}.` }, { status: 400 })
    }

    const g = Number(guests)
    if (!Number.isFinite(g) || g < 1) return NextResponse.json({ ok: false, message: 'Hóspedes inválidos.' }, { status: 400 })
    if (g > p.max_guests) return NextResponse.json({ ok: false, message: `Máx. ${p.max_guests} hóspedes.` }, { status: 400 })

    // Get min nights from Hospitable (respects Beyond Pricing overrides)
    // Falls back to static rules only if Hospitable is unavailable
    const hospitableMinN = await getMinNightsFromHospitable(propertyCode, checkin)
    const minN = hospitableMinN ?? minNightsFallback(checkin)
    if (n < minN) return NextResponse.json({ ok: false, message: `Mínimo de ${minN} noite(s) para esta data.` }, { status: 400 })

    // Try Hospitable live rates, fallback to demo
    let dailyRates: number[]
    let mode: 'live' | 'demo' = 'demo'

    try {
      if (process.env.HOSPITABLE_API_KEY) {
        const { getDailyRates } = await import('@/lib/hospitable')
        dailyRates = await getDailyRates(propertyCode, checkin, checkout, n)
        mode = 'live'
      } else {
        dailyRates = Array(n).fill(p.demo_beyond_nightly || 600)
      }
    } catch {
      dailyRates = Array(n).fill(p.demo_beyond_nightly || 600)
    }

    const discountPct = pricing.discount_pct
    const originalSubtotal = round2(dailyRates.reduce((a, b) => a + b, 0))
    const discountedDaily = dailyRates.map(r => round2(r * (1 - discountPct)))
    const nightsSubtotal = round2(discountedDaily.reduce((a, b) => a + b, 0))

    const cleaningFee = pricing.cleaning_fee
    const extraGuests = Math.max(0, g - p.base_guests)
    const extrasTotal = extraGuests * p.extra_per_guest_per_night * n
    const total = round2(nightsSubtotal + cleaningFee + extrasTotal)
    const originalTotal = round2(originalSubtotal + cleaningFee + extrasTotal)
    const savings = round2(originalTotal - total)

    return NextResponse.json({
      ok: true,
      mode,
      propertyCode,
      nights: n,
      dailyTotal: nightsSubtotal,
      cleaningFee,
      extrasTotal,
      grandTotal: total,
      savings,
      note: `${Math.round(discountPct * 100)}% de desconto aplicado`,
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message || 'Erro.' }, { status: 500 })
  }
}
