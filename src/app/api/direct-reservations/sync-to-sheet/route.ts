import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSheetData, updateSheetData } from '@/lib/google-sheets'
import { PROPERTY_HOSPITABLE_MAP, parseBRL, fmtBRL } from '@/lib/types'

export const dynamic = 'force-dynamic'

function colLetter(n: number): string {
  let s = ''; n++
  while (n > 0) { n--; s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) }
  return s
}

export async function POST() {
  try {
    const BLOCK_START_ROWS = [1, 31, 61, 91]
    const MONTH_COL_OFFSETS = [1, 6, 11]
    const DATA_ROW_OFFSET = 3
    const MAX_SLOTS = 14

    function parseDDMMYYYY(s: string): Date | null {
      const parts = s.split('/')
      if (parts.length !== 3) return null
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
    }

    const today = new Date()
    today.setHours(23, 59, 59, 999)

    const sb = createServerClient()
    const { data: allDirect } = await sb.from('direct_reservations').select('*').eq('synced_to_sheet', false)
    const unsynced = allDirect || []

    const synced: string[] = []
    const skipped: string[] = []

    for (const dr of unsynced) {
      const checkoutDate = parseDDMMYYYY(dr.checkout)
      if (!checkoutDate || checkoutDate > today) { skipped.push(`${dr.guest_name} - checkout futuro`); continue }
      const checkinDate = parseDDMMYYYY(dr.checkin)
      if (!checkinDate) { skipped.push(`${dr.guest_name} - data inválida`); continue }

      if (!PROPERTY_HOSPITABLE_MAP[dr.apartment]) { skipped.push(`${dr.guest_name} - apt desconhecido`); continue }

      const totalNights = Math.round((checkoutDate.getTime() - checkinDate.getTime()) / 86400000)
      if (totalNights <= 0) continue

      const totalValue = parseBRL(dr.total_value)
      const nightlyRate = totalValue / totalNights
      const aptData = await getSheetData(dr.apartment)
      let cursor = new Date(checkinDate)

      while (cursor < checkoutDate) {
        const monthIdx = cursor.getMonth()
        const monthEnd = new Date(cursor.getFullYear(), monthIdx + 1, 1)
        const segEnd = checkoutDate < monthEnd ? checkoutDate : monthEnd
        const nights = Math.round((segEnd.getTime() - cursor.getTime()) / 86400000)

        if (nights > 0) {
          const blockIdx = Math.floor(monthIdx / 3)
          const colIdx = monthIdx % 3
          const blockStartRow = BLOCK_START_ROWS[blockIdx]
          const colOffset = MONTH_COL_OFFSETS[colIdx]
          const dataStartRow = blockStartRow + DATA_ROW_OFFSET

          let insertRow = -1
          for (let r = dataStartRow; r < dataStartRow + MAX_SLOTS; r++) {
            const row = aptData[r] || []
            const cell = (row[colOffset] || '').toString().trim()
            if (!cell) { insertRow = r; break }
          }

          if (insertRow >= 0) {
            const checkinDay = cursor.getDate().toString()
            const checkoutDay = segEnd.getDate().toString()
            const revenue = fmtBRL(Math.round(nightlyRate * nights * 100) / 100)
            const startCol = colLetter(colOffset)
            const endCol = colLetter(colOffset + 3)
            const range = `${startCol}${insertRow + 1}:${endCol}${insertRow + 1}`
            await updateSheetData(dr.apartment, range, [[checkinDay, checkoutDay, `${dr.guest_name} (Direto)`, revenue]])
          }
        }
        cursor = monthEnd
      }

      await sb.from('direct_reservations').update({ synced_to_sheet: true, synced_at: new Date().toISOString() }).eq('id', dr.id)
      synced.push(`${dr.guest_name} (${dr.apartment})`)
    }

    return NextResponse.json({ success: true, synced, skipped })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
