import { NextResponse } from 'next/server'
import { testConnection } from '@/lib/beds24'

export const dynamic = 'force-dynamic'

export async function GET() {
  const result = await testConnection()
  return NextResponse.json(result)
}
