import { NextResponse } from 'next/server'
import { getSheetData } from '@/lib/google-sheets'
import { parseOperacaoExpenses, parseDirectReservations } from '@/lib/sheet-parser'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const data = await getSheetData('Operação AL')
    const parsed = parseOperacaoExpenses(data)
    const directReservations = parseDirectReservations(data)
    return NextResponse.json({ ...parsed, directReservations })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
