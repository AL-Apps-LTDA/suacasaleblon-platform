import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { Resend } from 'resend'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY || '')
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })
}

function nightsCount(checkin: string, checkout: string): number {
  const a = new Date(checkin), b = new Date(checkout)
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

function buildVarMap(res: any): Record<string, string> {
  return {
    guest_name: res.guest_name || '',
    guest_email: res.guest_email || '',
    property_name: res.apartment_code || '',
    property_code: res.apartment_code || '',
    checkin_date: res.checkin ? formatDate(res.checkin) : '',
    checkout_date: res.checkout ? formatDate(res.checkout) : '',
    nights: res.checkin && res.checkout ? String(nightsCount(res.checkin, res.checkout)) : '',
    total_value: res.total_value ? `R$ ${Number(res.total_value).toFixed(2)}` : '',
  }
}

function replaceVars(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || '')
}

function todayStr(): string {
  // Use São Paulo timezone
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export async function GET() {
  const sb = createServerClient()
  const today = todayStr()
  let sent = 0, errors = 0

  // Get active automations (exclude on_booking — handled in webhook, and manual)
  const { data: automations } = await sb
    .from('email_automations')
    .select('*')
    .eq('is_active', true)
    .neq('trigger_type', 'on_booking')
    .neq('trigger_type', 'manual')

  if (!automations?.length) return NextResponse.json({ sent: 0, message: 'No active automations' })

  // Get all direct reservations with guest email
  const { data: reservations } = await sb
    .from('direct_reservations')
    .select('*')
    .not('guest_email', 'is', null)

  if (!reservations?.length) return NextResponse.json({ sent: 0, message: 'No reservations with email' })

  for (const auto of automations) {
    for (const res of reservations) {
      let targetDate: string | null = null

      // Determine if this reservation matches the trigger
      switch (auto.trigger_type) {
        case 'days_before_checkin':
          targetDate = addDays(res.checkin, -(auto.trigger_days || 0))
          break
        case 'day_of_checkin':
          targetDate = res.checkin
          break
        case 'days_after_checkout':
          targetDate = addDays(res.checkout, auto.trigger_days || 0)
          break
        case 'day_of_checkout':
          targetDate = res.checkout
          break
      }

      if (!targetDate || targetDate !== today) continue

      // Check if already sent (dedup)
      const logKey = `${auto.id}_${res.id}`
      const { data: existingLog } = await sb
        .from('email_send_logs')
        .select('id')
        .eq('automation_id', auto.id)
        .eq('reservation_id', res.id)
        .limit(1)

      if (existingLog && existingLog.length > 0) continue

      // Build variables and replace in template
      const vars = buildVarMap(res)
      const subject = replaceVars(auto.subject_template, vars)
      const html = replaceVars(auto.body_html, vars)

      // Determine recipients
      const recipients: string[] = []
      if (auto.send_to_guest && res.guest_email) recipients.push(res.guest_email)
      if (auto.send_to_admin) recipients.push('ditavares@gmail.com')
      if (auto.custom_emails?.length) recipients.push(...auto.custom_emails)
      // send_to_owner: would need owner email lookup by apartment — future feature

      if (recipients.length === 0) continue

      try {
        await getResend().emails.send({
          from: 'Sua Casa Leblon <reservas@send.suacasaleblon.com>',
          to: recipients,
          subject,
          html,
        })

        // Log successful send
        await sb.from('email_send_logs').insert({
          automation_id: auto.id,
          reservation_id: res.id,
          sent_to: recipients,
          subject,
          sent_at: new Date().toISOString(),
        })

        sent++
      } catch (err: any) {
        console.error(`Email error (auto=${auto.id}, res=${res.id}):`, err.message)
        errors++
      }
    }
  }

  return NextResponse.json({ sent, errors, date: today })
}
