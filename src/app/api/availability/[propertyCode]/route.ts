import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ propertyCode: string }> }
) {
  const { propertyCode } = await params

  try {
    if (!process.env.HOSPITABLE_API_KEY) {
      return NextResponse.json({ ok: true, mode: 'demo', blockedDates: [] })
    }

    const { getCalendarAvailability } = await import('@/lib/hospitable')
    const blockedDates = await getCalendarAvailability(propertyCode)

    return NextResponse.json({ ok: true, mode: 'live', blockedDates })
  } catch {
    return NextResponse.json({ ok: true, mode: 'demo', blockedDates: [] })
  }
}
