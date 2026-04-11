import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''
const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const DIEGO_EMAIL = 'ditavares@gmail.com'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const sb = createServerClient()
    const today = new Date().toISOString().split('T')[0]

    // Busca limpezas de hoje
    const { data: limpezas } = await sb
      .from('limpezas')
      .select('apartment, status, assigned_to, value, date')
      .eq('date', today)

    const feitas = limpezas?.filter(l => l.status === 'concluida' || l.status === 'feita') || []
    const pendentes = limpezas?.filter(l => l.status !== 'concluida' && l.status !== 'feita') || []
    const semFaxineira = limpezas?.filter(l => !l.assigned_to) || []

    const context = `
Hoje: ${today}
Total de limpezas agendadas: ${limpezas?.length || 0}
Concluídas: ${feitas.length}
Pendentes/não confirmadas: ${pendentes.length}
Sem faxineira alocada: ${semFaxineira.length}

DETALHES:
${limpezas?.map(l => `• Apt ${l.apartment} — ${l.assigned_to || 'SEM FAXINEIRA'} — ${l.status || 'pendente'}`).join('\n') || '• Nenhuma limpeza hoje'}
`

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 400,
        system: `Você é o assistente da Sua Casa Leblon. 
Monte um alerta conciso sobre as limpezas do dia para Diego.
Se tudo estiver ok, seja positivo e breve. 
Se houver pendências ou apartamentos sem faxineira, destaque com urgência.
Texto simples para email, máximo 10 linhas.`,
        messages: [{ role: 'user', content: `Status das limpezas de hoje:\n${context}` }],
      }),
    })

    const claudeData = await claudeRes.json()
    const alertText = claudeData.content?.[0]?.text || 'Erro ao gerar alerta.'

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Sua Casa Leblon <noreply@send.suacasaleblon.com>',
        to: DIEGO_EMAIL,
        subject: `🧹 Limpezas ${today} — ${pendentes.length > 0 ? `${pendentes.length} pendente(s)` : 'Tudo ok'}`,
        text: alertText,
      }),
    })

    return NextResponse.json({ ok: true, alert: alertText })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
