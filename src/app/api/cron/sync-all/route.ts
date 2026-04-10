import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAllReservations, splitReservationByMonth, getManualBlocks } from '@/lib/hospitable'
import { PROPERTY_HOSPITABLE_MAP, APARTMENTS } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // allow up to 60s for full sync

// Protect cron endpoint — Vercel sends this header
function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) return true
  // Also allow manual trigger from admin with a simple key
  const url = new URL(request.url)
  if (url.searchParams.get('key') === process.env.CRON_SECRET) return true
  // If no CRON_SECRET configured, allow (for development)
  if (!process.env.CRON_SECRET) return true
  return false
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const results: Record<string, any> = {}
  const errors: string[] = []
  const startTime = Date.now()

  // ─── 1. Sync Hospitable Reservations ───────────────────────
  try {
    if (process.env.HOSPITABLE_API_KEY) {
      const now = new Date()
      const startDate = '2026-01-01'
      const endDate = '2026-12-31'

      const reservations = await getAllReservations(startDate, endDate)
      results.hospitable = {
        total_reservations: reservations.length,
        apartments: {} as Record<string, number>,
      }

      // Group by apartment
      for (const r of reservations) {
        const apt = r.apartmentName
        results.hospitable.apartments[apt] = (results.hospitable.apartments[apt] || 0) + 1
      }

      // Sync pro rata data to a cache table for fast dashboard reads
      // Store the split-by-month data
      const proRataRows: any[] = []
      for (const r of reservations) {
        const entries = splitReservationByMonth(r)
        for (const e of entries) {
          proRataRows.push({
            reservation_id: r.id,
            apartment_code: r.apartmentName,
            platform: r.platform,
            guest_name: r.guestName,
            guest_country: r.guestCountry,
            arrival_date: r.arrivalDate,
            departure_date: r.departureDate,
            month: e.monthIdx + 1,
            year: 2026,
            nights: e.nights,
            revenue: e.revenue,
            is_partial: e.isPartial,
            checkin_day: e.checkinDay,
            checkout_day: e.checkoutDay,
            adjustments: e.adjustments,
          })
        }
      }

      results.hospitable.pro_rata_rows = proRataRows.length

      // ─── Upsert reservations to Supabase ───
      const upsertRows = reservations.map(r => ({
        id: r.id,
        apartment_code: r.apartmentName,
        guest_name: r.guestName,
        guest_phone: r.guestPhone || null,
        guest_country: r.guestCountry,
        checkin: r.arrivalDate,
        checkout: r.departureDate,
        nights: r.nights,
        guests: (r.guests && typeof r.guests === "object") ? ((r.guests as any).total ?? (r.guests as any).adult_count ?? 1) : (Number(r.guests) || 1),
        source: 'hospitable',
        platform: r.platform,
        status: r.status,
        payout: r.payout,
        host_service_fee: r.hostServiceFee,
        cleaning_fee: r.cleaningFee,
        total_price: r.totalPrice,
        currency: r.currency,
        updated_at: new Date().toISOString(),
      }))

      if (upsertRows.length > 0) {
        const { error: upsertErr } = await supabase
          .from('reservations')
          .upsert(upsertRows, { onConflict: 'id' })
        if (upsertErr) {
          errors.push(`Reservations upsert: ${upsertErr.message}`)
        }
        results.hospitable.upserted_reservations = upsertRows.length
      }
    } else {
      results.hospitable = { skipped: true, reason: 'No API key' }
    }
  } catch (err: any) {
    errors.push(`Hospitable: ${err.message}`)
    results.hospitable = { error: err.message }
  }

  // ─── 2. Sync Cleanings from Reservations ───────────────────
  try {
    if (process.env.HOSPITABLE_API_KEY) {
      const now = new Date()
      const brNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
      const today = brNow.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })

      // Get next 30 days of reservations to auto-create cleaning events
      const [fy, fm, fd] = today.split('-').map(Number)
      const futureD = new Date(fy, fm - 1, fd + 30)
      const futureDate = `${futureD.getFullYear()}-${String(futureD.getMonth() + 1).padStart(2, '0')}-${String(futureD.getDate()).padStart(2, '0')}`
      const reservations = await getAllReservations(today, futureDate)
      
      let created = 0, skipped = 0

      for (const r of reservations) {
        if (r.status !== 'accepted') continue
        const checkoutDate = r.departureDate

        // Check if cleaning already exists (or was manually edited)
        const { data: existing } = await supabase
          .from('cleanings')
          .select('id, manually_edited')
          .eq('apartment_code', r.apartmentName)
          .eq('scheduled_date', checkoutDate)
          .limit(1)

        if (existing && existing.length > 0) {
          // Respect manually edited flag
          if (existing[0].manually_edited) {
            skipped++
            continue
          }
          // Update non-manual ones
          await supabase.from('cleanings').update({
            checkout_guest: r.guestName,
            type: 'checkout',
          }).eq('id', existing[0].id)
          skipped++
        } else {
          // Create new cleaning
          const { error: insertErr } = await supabase.from('cleanings').insert({
            apartment_code: r.apartmentName,
            scheduled_date: checkoutDate,
            checkout_guest: r.guestName,
            type: 'checkout',
            status: 'agendada',
            manually_edited: false,
          })
          if (!insertErr) created++
        }
      }

      results.cleanings = { created, skipped, checked_reservations: reservations.length }
    }
  } catch (err: any) {
    errors.push(`Cleanings sync: ${err.message}`)
    results.cleanings = { error: err.message }
  }

  // ─── 3. Promote Pending Installments ──────────────────────
  try {
    const brNowInst = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
    const currentMonth = brNowInst.getMonth() + 1
    const currentYear = brNowInst.getFullYear()

    const { data: due } = await supabase
      .from('pending_installments')
      .select('*')
      .or(`year.lt.${currentYear},and(year.eq.${currentYear},month.lte.${currentMonth})`)

    if (due && due.length > 0) {
      const rows = due.map(d => ({
        apartment_code: d.apartment_code, month: d.month, year: d.year,
        label: d.label, amount: d.amount, category: d.category, notes: d.notes,
        installment_group: d.installment_group, installment_num: d.installment_num,
        total_installments: d.total_installments, original_amount: d.original_amount,
        original_date: d.original_date,
      }))
      await supabase.from('expenses').insert(rows)
      await supabase.from('pending_installments').delete().in('id', due.map(d => d.id))
      results.installments = { promoted: due.length }
    } else {
      results.installments = { promoted: 0 }
    }
  } catch (err: any) {
    errors.push(`Installments: ${err.message}`)
    results.installments = { error: err.message }
  }

  // ─── 4. Sync Calendar Blocks (for RevPAN) ─────────────────
  try {
    if (process.env.HOSPITABLE_API_KEY) {
      const startDate = `${new Date().getFullYear()}-01-01`
      const endDate = `${new Date().getFullYear()}-12-31`
      let totalBlocks = 0

      for (const aptCode of Object.keys(PROPERTY_HOSPITABLE_MAP)) {
        const blocks = await getManualBlocks(aptCode, startDate, endDate)

        // Delete old blocks for this apt, then insert fresh ones
        await supabase.from('calendar_blocks').delete().eq('apartment_code', aptCode)

        if (blocks.length > 0) {
          const rows = blocks.map(b => ({
            apartment_code: aptCode,
            blocked_date: b.date,
            reason: b.reason,
            synced_at: new Date().toISOString(),
          }))
          const { error: blockErr } = await supabase.from('calendar_blocks').insert(rows)
          if (blockErr) errors.push(`Calendar blocks ${aptCode}: ${blockErr.message}`)
          totalBlocks += blocks.length
        }
      }

      results.calendar_blocks = { total: totalBlocks, apartments: Object.keys(PROPERTY_HOSPITABLE_MAP).length }
    }
  } catch (err: any) {
    errors.push(`Calendar blocks: ${err.message}`)
    results.calendar_blocks = { error: err.message }
  }

  // ─── 5. Log the sync ──────────────────────────────────────
  try {
    await supabase.from('sync_logs').insert({
      source: 'cron',
      direction: 'pull',
      status: errors.length > 0 ? 'partial' : 'success',
      message: JSON.stringify({ results, errors, duration_ms: Date.now() - startTime }),
    })
  } catch {
    // Don't fail the whole cron if logging fails
  }

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    duration_ms: Date.now() - startTime,
    results,
    errors,
  })
}
