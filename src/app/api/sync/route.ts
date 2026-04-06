import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    hospitable: {
      connected: !!process.env.HOSPITABLE_API_KEY,
      autoSyncInterval: 5,
    },
    googleSheets: {
      connected: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
      spreadsheetId: '1gSJBIJGlqgSezhtM22kDJ-zl2E0ELKB3rjDRqmN0Vsk',
    },
    beds24: {
      connected: !!process.env.BEDS24_REFRESH_TOKEN,
    },
  })
}
