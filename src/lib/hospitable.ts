import { PROPERTY_HOSPITABLE_MAP, type HospitableReservation, type ProRataEntry } from './types'

const HOSPITABLE_BASE_URL = 'https://public.api.hospitable.com/v2'

function getApiKey(): string {
  const key = process.env.HOSPITABLE_API_KEY
  if (!key) throw new Error('HOSPITABLE_API_KEY not configured')
  return key
}

async function hospitableFetch(path: string, params: Record<string, string | string[]> = {}) {
  const url = new URL(`${HOSPITABLE_BASE_URL}${path}`)
  Object.entries(params).forEach(([k, v]) => {
    if (Array.isArray(v)) {
      v.forEach(val => url.searchParams.append(k, val))
    } else {
      url.searchParams.append(k, v)
    }
  })

  const res = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    next: { revalidate: 300 }, // cache 5 min
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Hospitable API error ${res.status}: ${body}`)
  }

  return res.json()
}

function parseReservation(r: any, propertyUuid: string, apartmentName: string): HospitableReservation {
  const guest = r.guest || {}
  const fin = r.financials || {}
  const hostFin = fin.host || {}
  const guestFin = fin.guest || {}

  const revenue = hostFin.revenue?.amount ? hostFin.revenue.amount / 100 : 0
  const hostServiceFee = Math.abs(
    (hostFin.host_fees || []).reduce((sum: number, f: any) => sum + (f.amount || 0), 0) / 100
  )
  const cleaningFee = (hostFin.guest_fees || [])
    .filter((f: any) => /clean/i.test(f.label || ''))
    .reduce((sum: number, f: any) => sum + (f.amount || 0), 0) / 100
  const totalPrice = guestFin.total_price?.amount ? guestFin.total_price.amount / 100 : 0

  const adjustments = (hostFin.adjustments || []).map((a: any) => ({
    amount: (a.amount || 0) / 100,
    label: a.label || 'Adjustment',
  }))

  return {
    id: r.id,
    platform: r.platform || '',
    status: r.status || '',
    arrivalDate: r.arrival_date || '',
    departureDate: r.departure_date || '',
    guestName: guest.full_name || guest.first_name || 'Unknown',
    guestPhone: guest.phone || guest.phone_number || '',
    guestCountry: guest.country || guest.location || '',
    nights: r.nights || 0,
    guests: r.guests || 0,
    propertyUuid,
    apartmentName,
    payout: revenue,
    hostServiceFee,
    cleaningFee,
    totalPrice,
    currency: fin.currency || 'BRL',
    adjustments,
  }
}

async function fetchReservationsForUuid(
  uuid: string,
  apartmentName: string,
  startDate: string,
  endDate: string,
  statuses: string[] = ['accepted', 'request']
): Promise<HospitableReservation[]> {
  const results: HospitableReservation[] = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    const params: Record<string, string | string[]> = {
      start_date: startDate,
      end_date: endDate,
      include: 'guest,financials',
      per_page: '100',
      page: page.toString(),
      'properties[]': [uuid],
      'status[]': statuses,
    }

    const data = await hospitableFetch('/reservations', params)

    if (data.data && Array.isArray(data.data)) {
      for (const r of data.data) {
        results.push(parseReservation(r, uuid, apartmentName))
      }
    }

    const meta = data.meta || {}
    if (meta.current_page && meta.last_page && meta.current_page < meta.last_page) {
      page++
    } else {
      hasMore = false
    }
  }

  return results
}

export async function getAllReservations(
  startDate: string = '2026-01-01',
  endDate: string = '2026-12-31'
): Promise<HospitableReservation[]> {
  const uuidToName: Record<string, string> = {}
  Object.entries(PROPERTY_HOSPITABLE_MAP).forEach(([name, uuid]) => {
    uuidToName[uuid] = name
  })

  const uniqueUuids = [...new Set(Object.values(PROPERTY_HOSPITABLE_MAP))]
  const promises = uniqueUuids.map(uuid =>
    fetchReservationsForUuid(uuid, uuidToName[uuid] || uuid, startDate, endDate)
  )

  const results = await Promise.all(promises)
  return results.flat()
}

export async function getReservationsForApartment(
  apartmentName: string,
  startDate: string = '2026-01-01',
  endDate: string = '2026-12-31'
): Promise<HospitableReservation[]> {
  const uuid = PROPERTY_HOSPITABLE_MAP[apartmentName]
  if (!uuid) throw new Error(`Unknown apartment: ${apartmentName}`)
  return fetchReservationsForUuid(uuid, apartmentName, startDate, endDate)
}

export async function getCalendarAvailability(propertyCode: string): Promise<string[]> {
  const uuid = PROPERTY_HOSPITABLE_MAP[propertyCode]
  if (!uuid) return []

  try {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
    const endDate = '2026-12-31'

    const url = `${HOSPITABLE_BASE_URL}/properties/${uuid}/calendar?start_date=${today}&end_date=${endDate}`
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${getApiKey()}`,
        'Accept': 'application/json',
      },
      next: { revalidate: 300 },
    })

    if (!res.ok) return []

    const data = await res.json()
    const days = data?.data?.days || data?.days || []

    return days
      .filter((d: any) => d.status?.available === false)
      .map((d: any) => d.date)
  } catch {
    return []
  }
}

export async function getDailyRates(
  propertyCode: string,
  checkIn: string,
  checkOut: string,
  nights: number
): Promise<number[]> {
  const uuid = PROPERTY_HOSPITABLE_MAP[propertyCode]
  if (!uuid) throw new Error(`Unknown property: ${propertyCode}`)

  const url = `${HOSPITABLE_BASE_URL}/properties/${uuid}/calendar?start_date=${checkIn}&end_date=${checkOut}`
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${getApiKey()}`,
      'Accept': 'application/json',
    },
  })

  if (!res.ok) {
    throw new Error(`Hospitable calendar error: ${res.status}`)
  }

  const data = await res.json()
  const days = data?.data?.days || data?.days || []

  if (!Array.isArray(days) || days.length === 0) {
    throw new Error('Hospitable returned empty calendar')
  }

  const dailyRates: number[] = []
  const startDate = new Date(`${checkIn}T00:00:00`)

  for (let i = 0; i < nights; i++) {
    const d = new Date(startDate.getTime() + i * 86400000)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const entry = days.find((e: any) => e.date === dateStr)

    if (!entry) throw new Error(`No rate data for ${dateStr}`)
    if (entry.status?.available === false) throw new Error(`Date ${dateStr} unavailable`)

    const price = entry.price?.amount
    if (!price || price <= 0) throw new Error(`Invalid rate for ${dateStr}`)

    dailyRates.push(price / 100)
  }

  return dailyRates
}

export function splitReservationByMonth(r: HospitableReservation): ProRataEntry[] {
  const arrival = new Date(r.arrivalDate)
  const departure = new Date(r.departureDate)
  const totalNights = Math.round((departure.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24))
  if (totalNights <= 0) return []

  const nightlyRate = r.payout / totalNights
  const entries: ProRataEntry[] = []
  let cursor = new Date(arrival)
  let firstEntry = true

  while (cursor < departure) {
    const monthIdx = cursor.getMonth()
    const year = cursor.getFullYear()
    const monthEnd = new Date(year, monthIdx + 1, 1)
    const segEnd = departure < monthEnd ? departure : monthEnd
    const nights = Math.round((segEnd.getTime() - cursor.getTime()) / (1000 * 60 * 60 * 24))

    if (nights > 0) {
      entries.push({
        monthIdx,
        checkinDay: cursor.getDate(),
        checkoutDay: segEnd.getDate() === 0 ? new Date(segEnd.getTime() - 86400000).getDate() : segEnd.getDate(),
        nights,
        revenue: Math.round(nightlyRate * nights * 100) / 100,
        guestName: r.guestName,
        guestCountry: r.guestCountry || '',
        isPartial: totalNights !== nights,
        adjustments: firstEntry ? (r.adjustments || []) : [],
      })
      firstEntry = false
    }

    cursor = monthEnd
  }

  return entries
}

/**
 * Block dates on the Hospitable calendar so OTAs (Airbnb, Booking) mark them unavailable.
 * Used after a direct reservation is confirmed via Stripe.
 */
export async function blockCalendarDates(
  apartmentCode: string,
  checkin: string,
  checkout: string,
  note?: string
): Promise<{ ok: boolean; blocked: number; error?: string }> {
  const uuid = PROPERTY_HOSPITABLE_MAP[apartmentCode]
  if (!uuid) return { ok: false, blocked: 0, error: `Unknown apartment: ${apartmentCode}` }

  // Build array of dates from checkin to checkout (exclusive of checkout day)
  const dates: { date: string; available: boolean }[] = []
  const start = new Date(`${checkin}T00:00:00`)
  const end = new Date(`${checkout}T00:00:00`)

  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    dates.push({ date: dateStr, available: false })
  }

  if (dates.length === 0) return { ok: false, blocked: 0, error: 'No dates to block' }

  const url = `${HOSPITABLE_BASE_URL}/properties/${uuid}/calendar`
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ data: dates }),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error(`Failed to block calendar dates for ${apartmentCode}: ${res.status} ${body}`)
    return { ok: false, blocked: 0, error: `Hospitable API ${res.status}: ${body}` }
  }

  console.log(`✅ Blocked ${dates.length} dates on Hospitable for apt ${apartmentCode} (${checkin} → ${checkout})${note ? ` — ${note}` : ''}`)
  return { ok: true, blocked: dates.length }
}

/**
 * Create a full reservation on Hospitable (syncs to Airbnb/Booking as blocked dates).
 * Better than blockCalendarDates because it stores guest info and triggers
 * automated check-in instructions via Hospitable.
 */
export async function createDirectReservation(params: {
  apartmentCode: string
  checkin: string
  checkout: string
  guestName: string
  guestEmail: string
  guestPhone?: string
  guests?: number
  totalPaidCents: number
  notes?: string
}): Promise<{ ok: boolean; reservationId?: string; code?: string; error?: string }> {
  const uuid = PROPERTY_HOSPITABLE_MAP[params.apartmentCode]
  if (!uuid) return { ok: false, error: `Unknown apartment: ${params.apartmentCode}` }

  const nameParts = params.guestName.trim().split(' ')
  const firstName = nameParts[0]
  const lastName = nameParts.slice(1).join(' ') || firstName

  const res = await fetch(`${HOSPITABLE_BASE_URL}/reservations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      property_id: uuid,
      check_in: params.checkin,
      check_out: params.checkout,
      guests: { adults: params.guests || 2 },
      guest: {
        first_name: firstName,
        last_name: lastName,
        email: params.guestEmail,
        ...(params.guestPhone ? { phone: params.guestPhone } : {}),
      },
      language: 'pt',
      platform: 'direct',
      status: 'accepted',
      source: 'Website',
      financials: {
        currency: 'BRL',
        accommodation: params.totalPaidCents,
      },
      ...(params.notes ? { notes: params.notes } : {}),
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error(`Failed to create Hospitable reservation for ${params.apartmentCode}: ${res.status} ${body}`)
    return { ok: false, error: `Hospitable API ${res.status}: ${body}` }
  }

  const data = await res.json()
  const reservation = data?.data
  console.log(`✅ Hospitable reservation created: ${reservation?.code} for ${params.guestName} at apt ${params.apartmentCode} (${params.checkin} → ${params.checkout})`)
  return { ok: true, reservationId: reservation?.id, code: reservation?.code }
}

export async function testConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    await hospitableFetch('/reservations', {
      start_date: '2026-01-01',
      end_date: '2026-01-31',
      per_page: '1',
      page: '1',
      'properties[]': Object.values(PROPERTY_HOSPITABLE_MAP),
    })
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
}
