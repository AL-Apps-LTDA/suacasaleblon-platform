// src/app/api/limpezas/sync/route.ts
// Hospitable V2 sync - creates cleaning events from checkout dates
// Respects manuallyEdited flag and deletedCleanings table

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )
}

const HOSPITABLE_BASE = 'https://public.api.hospitable.com/v2'
const HOSPITABLE_TOKEN = process.env.HOSPITABLE_API_KEY!

const PROPERTY_MAP: Record<string, string> = {
  'leblon 103': '103',
  'leblon 102': '102',
  'leblon 403': '403',
  'leblon 303': '303',
  'leblon 334a': '334A',
  'buzios': 'BUZ',
}

async function fetchHospitable(path: string, params?: Record<string, string>) {
  const url = new URL(`${HOSPITABLE_BASE}${path}`)
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${HOSPITABLE_TOKEN}`, 'Accept': 'application/json' }
  })
  if (!res.ok) throw new Error(`Hospitable ${res.status}: ${await res.text()}`)
  return res.json()
}

async function fetchAllPages(path: string, params?: Record<string, string>) {
  let all: any[] = []
  let cursor: string | null = null
  do {
    const p = { ...params, per_page: '100', ...(cursor ? { cursor } : {}) }
    const data = await fetchHospitable(path, p)
    all = all.concat(data.data || [])
    cursor = data.meta?.cursor?.next || null
  } while (cursor)
  return all
}

function mapPropertyName(name: string): string | null {
  const lower = name.toLowerCase()
  for (const [key, code] of Object.entries(PROPERTY_MAP)) {
    if (lower.includes(key)) return code
  }
  return null
}

export async function POST() {
  const supabase = getSupabase()
  try {
    const properties = await fetchAllPages('/properties')
    const nowStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
    const [ny, nm, nd] = nowStr.split('-').map(Number)
    const futureD = new Date(ny, nm - 1, nd + 60)
    const futureStr = `${futureD.getFullYear()}-${String(futureD.getMonth() + 1).padStart(2, '0')}-${String(futureD.getDate()).padStart(2, '0')}`

    let totalCreated = 0, totalSkipped = 0
    const errors: string[] = []

    for (const prop of properties) {
      const aptCode = mapPropertyName(prop.name)
      if (!aptCode) { errors.push(`Unmapped: ${prop.name}`); continue }

      try {
        const reservations = await fetchAllPages(`/properties/${prop.id}/reservations`, {
          'filter[check_out_after]': nowStr,
          'filter[check_out_before]': futureStr,
          'filter[status]': 'accepted'
        })

        for (const res of reservations) {
          const checkoutDate = res.check_out?.slice(0, 10)
          if (!checkoutDate) continue

          // Check if deleted
          const { data: deleted } = await supabase.from('deleted_cleanings')
            .select('id').eq('apartment_code', aptCode).eq('cleaning_date', checkoutDate).limit(1)
          if (deleted && deleted.length > 0) { totalSkipped++; continue }

          // Check if exists
          const { data: existing } = await supabase.from('cleanings')
            .select('id, manually_edited').eq('apartment_code', aptCode).eq('cleaning_date', checkoutDate).limit(1)

          if (existing && existing.length > 0) {
            // NEVER overwrite manually edited cleanings
            if (existing[0].manually_edited) { totalSkipped++; continue }
            await supabase.from('cleanings').update({
              checkout_guest: res.guest?.name || '',
              guest_count: res.guests || 1,
              arrival_date: res.check_in?.slice(0, 10),
              source: 'hospitable',
              updated_at: new Date().toISOString()
            }).eq('id', existing[0].id)
            totalSkipped++
          } else {
            await supabase.from('cleanings').insert({
              apartment_code: aptCode,
              cleaning_date: checkoutDate,
              scheduled_date: checkoutDate,
              scheduled_time: '11:00',
              checkout_guest: res.guest?.name || '',
              guest_count: res.guests || 1,
              arrival_date: res.check_in?.slice(0, 10),
              type: 'checkout',
              status: 'agendada',
              source: 'hospitable',
              sort_order: 0,
              completed: false,
              manually_edited: false
            })
            totalCreated++
          }
        }
      } catch (e: any) {
        errors.push(`${aptCode}: ${e.message}`)
      }
    }

    await supabase.from('sync_logs').insert({
      source: 'hospitable', direction: 'pull', rows_affected: totalCreated,
      status: errors.length ? 'partial' : 'success',
      message: `Created: ${totalCreated}, Skipped: ${totalSkipped}, Errors: ${errors.length}`
    })

    return NextResponse.json({ success: true, created: totalCreated, skipped: totalSkipped, errors })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
