import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''
const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const DIEGO_EMAIL = 'ditavares@gmail.com'

export async function GET(req: NextRequest) {
  // Verifica auth do cron
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const sb = createServerClient()
    const today = new Date().toISOString().split('T')[0]
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

    // Busca dados do dia
    const [checkinsHoje, checkoutsHoje, checkinsAmanha, limpezasHoje, semFaxineira] = await Promise.all([
      sb.from('reservations').select('apartment, guest_name, checkin, checkout, platform').eq('checkin', today),
      sb.from('reservations').select('apartment, guest_name, checkin, checkout').eq('checkout', today),
      sb.from('reservations').select('apartment, guest_name, checkin, checkout, platform').eq('checkin', tomorrow),
      sb.from('limpezas').select('apartment, date, status, assigned_to').eq('date', today),
      sb.from('limpezas').select('apartment, date').eq('date', today).is('assigned_to', null),
    ])

    // Pagamentos pendentes
    const { data: pendingPayments } = await sb
      .from('reservations')
      .select('apartment, guest_name, checkin, total_value')
      .eq('payment_status', 'pending')
      .gte('checkin', today)
      .limit(5)

    // Monta contexto pro Claude
    const context = `
Hoje: ${today}
Amanhã: ${tomorrow}

CHECK-INS HOJE: ${checkinsHoje.data?.length || 0}
${checkinsHoje.data?.map(r => `• Apt ${r.apartment} — ${r.guest_name} (${r.platform})`).join('\n') || '• Nenhum'}

CHECK-OUTS HOJE: ${checkoutsHoje.data?.length || 0}
${checkoutsHoje.data?.map(r => `• Apt ${r.apartment} — ${r.guest_name}`).join('\n') || '• Nenhum'}

CHECK-INS AMANHÃ: ${checkinsAmanha.data?.length || 0}
${checkinsAmanha.data?.map(r => `• Apt ${r.apartment} — ${r.guest_name} (${r.platform})`).join('\n') || '• Nenhum'}

LIMPEZAS HOJE: ${limpezasHoje.data?.length || 0}
${limpezasHoje.data?.map(l => `• Apt ${l.apartment} — ${l.status || 'pendente'} — ${l.assigned_to || 'SEM FAXINEIRA'}`).join('\n') || '• Nenhuma agendada'}

APARTAMENTOS SEM FAXINEIRA HOJE: ${semFaxineira.data?.length || 0}
${semFaxineira.data?.map(l => `⚠️ Apt ${l.apartment}`).join('\n') || '• Todos cobertos'}

PAGAMENTOS PENDENTES: ${pendingPayments?.length || 0}
${pendingPayments?.map(p => `• Apt ${p.apartment} — ${p.guest_name} — ${p.total_value}`).join('\n') || '• Nenhum'}
`

    // Claude monta o briefing
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 800,
        system: `Você é o assistente da Sua Casa Leblon. Monte um briefing matinal conciso e direto para Diego Tavares. 
Use emojis com moderação. Destaque alertas importantes em negrito. 
Seja prático — Diego precisa saber o que fazer hoje em 30 segundos de leitura.
Formato: texto simples para email, com seções claras. Sem markdown complexo.`,
        messages: [{ role: 'user', content: `Monte o briefing matinal com estes dados:\n${context}` }],
      }),
    })

    const claudeData = await claudeRes.json()
    const briefingText = claudeData.content?.[0]?.text || 'Erro ao gerar briefing.'

    // Envia por email via Resend
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Sua Casa Leblon <noreply@send.suacasaleblon.com>',
        to: DIEGO_EMAIL,
        subject: `☀️ Briefing ${today} — Sua Casa Leblon`,
        text: briefingText,
      }),
    })

    return NextResponse.json({ ok: true, briefing: briefingText })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
