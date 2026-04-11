import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''

const MODELS: Record<string, string> = {
  haiku: 'claude-haiku-4-5',
  sonnet: 'claude-sonnet-4-6',
}

// ─── Busca contexto atual do Supabase ────────────────────────────────────────
async function fetchContext() {
  try {
    const sb = createServerClient()
    const today = new Date().toISOString().split('T')[0]

    const [reservations, cleanings, expenses] = await Promise.all([
      sb.from('reservations')
        .select('apartment, guest_name, checkin, checkout, platform, total_value')
        .gte('checkout', today)
        .order('checkin', { ascending: true })
        .limit(20),
      sb.from('limpezas')
        .select('apartment, date, status, assigned_to, value')
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(10),
      sb.from('expenses')
        .select('apartment, description, amount, category, date')
        .order('date', { ascending: false })
        .limit(10),
    ])

    return {
      today,
      upcoming_reservations: reservations.data || [],
      upcoming_cleanings: cleanings.data || [],
      recent_expenses: expenses.data || [],
    }
  } catch {
    return { today: new Date().toISOString().split('T')[0], upcoming_reservations: [], upcoming_cleanings: [], recent_expenses: [] }
  }
}

// ─── System Prompt ────────────────────────────────────────────────────────────
function buildSystemPrompt(ctx: Awaited<ReturnType<typeof fetchContext>>) {
  return `Você é o assistente operacional da Sua Casa Leblon, empresa de gestão de imóveis de temporada em Leblon (Rio de Janeiro) e Búzios, operada por Diego Tavares.

═══ IDENTIDADE E TOM ═══
- Responde em português brasileiro, informal mas preciso
- Mensagens curtas e diretas, sem enrolação
- Quando não tiver certeza, pergunta antes de agir
- Nunca inventa dados — só informa o que está no banco

═══ OS IMÓVEIS ═══
Leblon: Apt 102, Apt 103, Apt 303, Apt 334A, Apt 403
Búzios: BZ01, BZ02

Equipe de limpeza:
- Marluce Lopes: salário fixo. Na aba Equipe (cleaning tasks) pode registrar limpeza com R$0 quando cabível.
- Niedja Távora: freelance, sempre lança o valor real do serviço.

Canais: Airbnb, Booking, site direto (Sua Casa Leblon), WhatsApp

═══ O QUE VOCÊ PODE FAZER ═══

[CONSULTAS — responde direto, sem confirmar]
- Receitas, despesas, ocupação por período e/ou apartamento
- Próximas reservas e check-ins/check-outs
- Status de limpezas agendadas
- Qualquer dado do banco

[LANÇAMENTOS — sempre mostra resumo e pede confirmação antes de salvar]
- Registrar despesa: valor + apartamento + categoria + descrição
- Registrar reserva nova: apartamento + hóspede + datas + valor + canal
- Bloquear datas no calendário (bloqueio temporário, reserva depois)

[EXCLUSÃO — só com pedido explícito do Diego]
- Ao receber pedido de apagar: repete o que vai apagar e pergunta "tem certeza? isso some do banco."
- Só executa depois da segunda confirmação.

[NUNCA FAZ — sem exceção]
- Alterar código, layout ou arquivos do sistema
- Agir em escrita sem confirmação prévia

═══ FORMATO ═══
- Consulta simples → 1 a 3 linhas, direto ao ponto
- Lançamento → bloco resumo formatado + "confirma?"
- Fora do escopo → explica o que pode fazer, não tenta forçar

═══ CONTEXTO AGORA (${ctx.today}) ═══

PRÓXIMAS RESERVAS:
${ctx.upcoming_reservations.length > 0
  ? ctx.upcoming_reservations.map(r => `• Apt ${r.apartment} | ${r.guest_name} | ${r.checkin} → ${r.checkout} | ${r.platform} | ${r.total_value}`).join('\n')
  : '• Nenhuma reserva futura encontrada'}

PRÓXIMAS LIMPEZAS:
${ctx.upcoming_cleanings.length > 0
  ? ctx.upcoming_cleanings.map(l => `• Apt ${l.apartment} | ${l.date} | ${l.status} | ${l.assigned_to} | R$${l.value}`).join('\n')
  : '• Nenhuma limpeza agendada encontrada'}

DESPESAS RECENTES:
${ctx.recent_expenses.length > 0
  ? ctx.recent_expenses.map(e => `• Apt ${e.apartment} | ${e.date} | ${e.category} | ${e.description} | R$${e.amount}`).join('\n')
  : '• Nenhuma despesa recente encontrada'}`
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY não configurada.' }, { status: 500 })
  }

  const body = await req.json()
  const messages: { role: string; content: string }[] = body.messages || []
  const modelKey: string = body.model || 'haiku'
  const model = MODELS[modelKey] || MODELS.haiku

  if (!messages.length) {
    return NextResponse.json({ error: 'Nenhuma mensagem enviada.' }, { status: 400 })
  }

  const ctx = await fetchContext()
  const systemPrompt = buildSystemPrompt(ctx)

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    return NextResponse.json({ error: `Erro na API Anthropic: ${err}` }, { status: 502 })
  }

  const data = await response.json()
  const text = data.content?.[0]?.text || ''
  return NextResponse.json({ reply: text })
}
