import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  const sb = createServerClient()
  const { data, error } = await sb
    .from('email_template_variables')
    .select('*')
    .order('is_system', { ascending: false })
    .order('label')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const sb = createServerClient()
  const { data, error } = await sb.from('email_template_variables')
    .insert({ ...body, is_system: false })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}