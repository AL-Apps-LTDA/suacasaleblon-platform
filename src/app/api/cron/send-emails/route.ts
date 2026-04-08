import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

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
    nome_hospede: res.guest_name || '',
    email_hospede: res.guest_email || '',
    telefone_hospede: res.guest_phone || '',
    apartamento: res.apartment_code || '',
    nome_apartamento: res.apartment_code || '',
    checkin: res.checkin ? formatDate(res.checkin) : '',
    checkout: res.checkout ? formatDate(res.checkout) : '',
    noites: res.checkin && res.checkout ? String(nightsCount(res.checkin, res.checkout)) : '',
    valor_total: res.total_value ? `R$ ${Number(res.total_value).toFixed(2)}` : '',
    valor_pago: res.paid ? `R$ ${Number(res.paid).toFixed(2)}` : '',    metodo_pagamento: res.payment_method === 'pix' ? 'PIX' : 'Cartão de Crédito',
    cupom: res.coupon_code || '',
    link_whatsapp: 'https://wa.me/5521995360322',
    link_site: 'https://suacasaleblon.com',
  }
}

function replaceVars(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || '')
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
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

  // Get active automations (exclude on_booking — that's handled in webhook)
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
    let targetDate: string | null = null

    for (const res of reservations) {
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