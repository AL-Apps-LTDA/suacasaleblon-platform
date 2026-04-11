import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const maxDuration = 60

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''

const MODELS: Record<string, string> = {
  haiku: 'claude-haiku-4-5',
  sonnet: 'claude-sonnet-4-6',
}

// ─── Tool definitions ────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'consultar_reservas',
    description: 'Consulta reservas no banco. Pode filtrar por apartamento, datas, plataforma, hóspede.',
    input_schema: {
      type: 'object' as const,
      properties: {
        apartment: { type: 'string', description: 'Nome do apartamento (ex: "102", "BZ01"). Opcional.' },
        date_from: { type: 'string', description: 'Data inicial ISO (YYYY-MM-DD). Opcional.' },
        date_to: { type: 'string', description: 'Data final ISO (YYYY-MM-DD). Opcional.' },
        platform: { type: 'string', description: 'Plataforma (airbnb, booking, direct). Opcional.' },
        guest_name: { type: 'string', description: 'Nome do hóspede (busca parcial). Opcional.' },
        limit: { type: 'number', description: 'Limite de resultados. Padrão 20.' },
      },
      required: [],
    },
  },
  {
    name: 'consultar_despesas',
    description: 'Consulta despesas no banco. Pode filtrar por apartamento, categoria, período.',
    input_schema: {
      type: 'object' as const,
      properties: {
        apartment: { type: 'string', description: 'Apartamento. Opcional.' },
        category: { type: 'string', description: 'Categoria da despesa. Opcional.' },
        date_from: { type: 'string', description: 'Data inicial ISO. Opcional.' },
        date_to: { type: 'string', description: 'Data final ISO. Opcional.' },
        limit: { type: 'number', description: 'Limite de resultados. Padrão 20.' },
      },
      required: [],
    },
  },
  {
    name: 'consultar_limpezas',
    description: 'Consulta limpezas agendadas ou realizadas. Filtra por apartamento, data, status, responsável.',
    input_schema: {
      type: 'object' as const,
      properties: {
        apartment: { type: 'string', description: 'Apartamento. Opcional.' },
        date_from: { type: 'string', description: 'Data inicial ISO. Opcional.' },
        date_to: { type: 'string', description: 'Data final ISO. Opcional.' },
        status: { type: 'string', description: 'Status (pendente, concluida, cancelada). Opcional.' },
        assigned_to: { type: 'string', description: 'Responsável. Opcional.' },
        limit: { type: 'number', description: 'Limite de resultados. Padrão 20.' },
      },
      required: [],
    },
  },
  {
    name: 'consultar_apartamentos',
    description: 'Lista apartamentos cadastrados com dados básicos.',
    input_schema: {
      type: 'object' as const,
      properties: {
        apartment: { type: 'string', description: 'Filtrar por nome. Opcional.' },
      },
      required: [],
    },
  },
  {
    name: 'consultar_contatos',
    description: 'Consulta contatos/hóspedes cadastrados.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Nome (busca parcial). Opcional.' },
        email: { type: 'string', description: 'Email. Opcional.' },
        limit: { type: 'number', description: 'Limite. Padrão 20.' },
      },
      required: [],
    },
  },
  {
    name: 'registrar_despesa',
    description: 'Registra uma nova despesa. SEMPRE mostre o resumo ao usuário e peça confirmação ANTES de chamar esta ferramenta.',
    input_schema: {
      type: 'object' as const,
      properties: {
        apartment: { type: 'string', description: 'Apartamento.' },
        description: { type: 'string', description: 'Descrição da despesa.' },
        amount: { type: 'number', description: 'Valor em reais.' },
        category: { type: 'string', description: 'Categoria (limpeza, manutenção, condomínio, luz, internet, outros).' },
        date: { type: 'string', description: 'Data ISO (YYYY-MM-DD). Padrão: hoje.' },
      },
      required: ['apartment', 'description', 'amount', 'category'],
    },
  },
  {
    name: 'atualizar_registro',
    description: 'Atualiza um registro existente em qualquer tabela. Mostre o resumo e peça confirmação ANTES.',
    input_schema: {
      type: 'object' as const,
      properties: {
        table: { type: 'string', description: 'Nome da tabela (reservations, expenses, limpezas).' },
        id: { type: 'string', description: 'ID do registro a atualizar.' },
        updates: { type: 'object', description: 'Objeto com campos a atualizar.' },
      },
      required: ['table', 'id', 'updates'],
    },
  },
  {
    name: 'deletar_registro',
    description: 'Deleta um registro. EXTREMAMENTE perigoso. Só use após confirmação EXPLÍCITA e DUPLA do Diego.',
    input_schema: {
      type: 'object' as const,
      properties: {
        table: { type: 'string', description: 'Nome da tabela.' },
        id: { type: 'string', description: 'ID do registro a deletar.' },
      },
      required: ['table', 'id'],
    },
  },
  {
    name: 'gerar_prompt_claude_code',
    description: 'Gera um prompt formatado para uso no Claude Code (alteração de código). Não executa nada, apenas retorna o texto.',
    input_schema: {
      type: 'object' as const,
      properties: {
        instruction: { type: 'string', description: 'Descrição da alteração desejada no código.' },
        files: { type: 'array', items: { type: 'string' }, description: 'Arquivos relevantes. Opcional.' },
      },
      required: ['instruction'],
    },
  },
]

// ─── Tool execution ──────────────────────────────────────────────────────────

async function executeTool(name: string, input: Record<string, any>): Promise<string> {
  const sb = createServerClient()

  switch (name) {
    case 'consultar_reservas': {
      let q = sb.from('reservations').select('*')
      if (input.apartment) q = q.ilike('apartment', `%${input.apartment}%`)
      if (input.date_from) q = q.gte('checkin', input.date_from)
      if (input.date_to) q = q.lte('checkout', input.date_to)
      if (input.platform) q = q.ilike('platform', `%${input.platform}%`)
      if (input.guest_name) q = q.ilike('guest_name', `%${input.guest_name}%`)
      q = q.order('checkin', { ascending: true }).limit(input.limit || 20)
      const { data, error } = await q
      if (error) return `Erro: ${error.message}`
      if (!data || data.length === 0) return 'Nenhuma reserva encontrada com esses filtros.'
      return JSON.stringify(data, null, 2)
    }

    case 'consultar_despesas': {
      let q = sb.from('expenses').select('*')
      if (input.apartment) q = q.ilike('apartment', `%${input.apartment}%`)
      if (input.category) q = q.ilike('category', `%${input.category}%`)
      if (input.date_from) q = q.gte('date', input.date_from)
      if (input.date_to) q = q.lte('date', input.date_to)
      q = q.order('date', { ascending: false }).limit(input.limit || 20)
      const { data, error } = await q
      if (error) return `Erro: ${error.message}`
      if (!data || data.length === 0) return 'Nenhuma despesa encontrada com esses filtros.'
      return JSON.stringify(data, null, 2)
    }

    case 'consultar_limpezas': {
      let q = sb.from('limpezas').select('*')
      if (input.apartment) q = q.ilike('apartment', `%${input.apartment}%`)
      if (input.date_from) q = q.gte('date', input.date_from)
      if (input.date_to) q = q.lte('date', input.date_to)
      if (input.status) q = q.ilike('status', `%${input.status}%`)
      if (input.assigned_to) q = q.ilike('assigned_to', `%${input.assigned_to}%`)
      q = q.order('date', { ascending: true }).limit(input.limit || 20)
      const { data, error } = await q
      if (error) return `Erro: ${error.message}`
      if (!data || data.length === 0) return 'Nenhuma limpeza encontrada com esses filtros.'
      return JSON.stringify(data, null, 2)
    }

    case 'consultar_apartamentos': {
      let q = sb.from('apartments').select('*')
      if (input.apartment) q = q.ilike('name', `%${input.apartment}%`)
      const { data, error } = await q
      if (error) return `Erro: ${error.message}`
      if (!data || data.length === 0) return 'Nenhum apartamento encontrado.'
      return JSON.stringify(data, null, 2)
    }

    case 'consultar_contatos': {
      let q = sb.from('contacts').select('*')
      if (input.name) q = q.ilike('name', `%${input.name}%`)
      if (input.email) q = q.ilike('email', `%${input.email}%`)
      q = q.limit(input.limit || 20)
      const { data, error } = await q
      if (error) return `Erro: ${error.message}`
      if (!data || data.length === 0) return 'Nenhum contato encontrado.'
      return JSON.stringify(data, null, 2)
    }

    case 'registrar_despesa': {
      const { data, error } = await sb.from('expenses').insert({
        apartment: input.apartment,
        description: input.description,
        amount: input.amount,
        category: input.category,
        date: input.date || new Date().toISOString().split('T')[0],
      }).select()
      if (error) return `Erro ao registrar: ${error.message}`
      return `Despesa registrada com sucesso: ${JSON.stringify(data?.[0])}`
    }

    case 'atualizar_registro': {
      const allowed = ['reservations', 'expenses', 'limpezas']
      if (!allowed.includes(input.table)) return `Tabela "${input.table}" não permitida. Use: ${allowed.join(', ')}`
      const { data, error } = await sb.from(input.table).update(input.updates).eq('id', input.id).select()
      if (error) return `Erro ao atualizar: ${error.message}`
      if (!data || data.length === 0) return `Registro ${input.id} não encontrado na tabela ${input.table}.`
      return `Registro atualizado: ${JSON.stringify(data[0])}`
    }

    case 'deletar_registro': {
      const allowed = ['reservations', 'expenses', 'limpezas']
      if (!allowed.includes(input.table)) return `Tabela "${input.table}" não permitida. Use: ${allowed.join(', ')}`
      const { error } = await sb.from(input.table).delete().eq('id', input.id)
      if (error) return `Erro ao deletar: ${error.message}`
      return `Registro ${input.id} deletado da tabela ${input.table}.`
    }

    case 'gerar_prompt_claude_code': {
      const files = input.files?.length ? `\nArquivos relevantes: ${input.files.join(', ')}` : ''
      return `📋 Prompt para Claude Code:\n\n${input.instruction}${files}\n\nCopie este prompt e cole em uma sessão do Claude Code conectada ao repo suacasaleblon-platform.`
    }

    default:
      return `Ferramenta "${name}" não reconhecida.`
  }
}

// ─── System Prompt ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Você é o assistente operacional da Sua Casa Leblon, empresa de gestão de imóveis de temporada em Leblon (Rio de Janeiro) e Búzios, operada por Diego Tavares.

═══ IDENTIDADE E TOM ═══
- Responde em português brasileiro, informal mas preciso
- Mensagens curtas e diretas, sem enrolação
- Quando não tiver certeza, pergunta antes de agir
- Nunca inventa dados — só informa o que consultar nas ferramentas

═══ OS IMÓVEIS ═══
Leblon: Apt 102, Apt 103, Apt 303, Apt 334A, Apt 403
Búzios: BZ01, BZ02

Equipe de limpeza:
- Marluce Lopes: salário fixo. Pode registrar limpeza com R$0 quando cabível.
- Niedja Távora: freelance, sempre lança o valor real do serviço.

Canais: Airbnb, Booking, site direto (Sua Casa Leblon), WhatsApp

═══ REGRAS DE USO DAS FERRAMENTAS ═══

[LEITURA — use livremente sem pedir confirmação]
Use as ferramentas consultar_* para buscar dados sempre que necessário. Não invente dados.

[ESCRITA — SEMPRE pedir confirmação ANTES de executar]
Antes de chamar registrar_despesa ou atualizar_registro:
1. Monte um resumo formatado do que será feito
2. Mostre ao usuário e pergunte "Confirma?"
3. Só execute a ferramenta após receber confirmação explícita

[EXCLUSÃO — confirmação DUPLA obrigatória]
Antes de chamar deletar_registro:
1. Repita o que será apagado
2. Diga "Tem certeza? Isso some do banco."
3. Só execute após a SEGUNDA confirmação do usuário

[CÓDIGO — use gerar_prompt_claude_code]
Quando pedirem alterações no sistema/código, use gerar_prompt_claude_code para gerar
um prompt que o Diego pode copiar e colar no Claude Code. Nunca altere código diretamente.

═══ FORMATO ═══
- Consulta simples → 1 a 3 linhas, direto ao ponto
- Tabelas → use formatação markdown para facilitar leitura
- Lançamento → bloco resumo formatado + "Confirma?"
- Fora do escopo → explica o que pode fazer, não tenta forçar`

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY não configurada.' }, { status: 500 })
  }

  const body = await req.json()
  const messages: Array<{ role: string; content: any }> = body.messages || []
  const modelKey: string = body.model || 'haiku'
  const model = MODELS[modelKey] || MODELS.haiku

  if (!messages.length) {
    return NextResponse.json({ error: 'Nenhuma mensagem enviada.' }, { status: 400 })
  }

  // If the last user message has an image, format it for the API
  const formattedMessages = messages.map(m => {
    if (m.role === 'user' && typeof m.content === 'object' && Array.isArray(m.content)) {
      return { role: m.role, content: m.content }
    }
    if (m.role === 'user' && typeof m.content === 'string') {
      return { role: m.role, content: m.content }
    }
    return m
  })

  const today = new Date().toISOString().split('T')[0]
  const systemWithDate = `${SYSTEM_PROMPT}\n\n═══ DATA DE HOJE ═══\n${today}`

  // Multi-turn tool_use loop (max 10 iterations)
  let currentMessages = [...formattedMessages]
  let finalText = ''

  for (let i = 0; i < 10; i++) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: systemWithDate,
        tools: TOOLS,
        messages: currentMessages,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return NextResponse.json({ error: `Erro na API Anthropic: ${err}` }, { status: 502 })
    }

    const data = await response.json()
    const stopReason = data.stop_reason

    // Collect text and tool_use blocks from the response
    const contentBlocks = data.content || []
    const textBlocks = contentBlocks.filter((b: any) => b.type === 'text')
    const toolUseBlocks = contentBlocks.filter((b: any) => b.type === 'tool_use')

    // If no tool calls, we're done
    if (stopReason === 'end_turn' || toolUseBlocks.length === 0) {
      finalText = textBlocks.map((b: any) => b.text).join('\n')
      break
    }

    // Add assistant's response to messages
    currentMessages.push({ role: 'assistant', content: contentBlocks })

    // Execute each tool call and collect results
    const toolResults: Array<{ type: 'tool_result'; tool_use_id: string; content: string }> = []
    for (const tool of toolUseBlocks) {
      const result = await executeTool(tool.name, tool.input)
      toolResults.push({
        type: 'tool_result',
        tool_use_id: tool.id,
        content: result,
      })
    }

    // Add tool results to messages
    currentMessages.push({ role: 'user', content: toolResults })

    // Capture any intermediate text
    if (textBlocks.length > 0) {
      finalText = textBlocks.map((b: any) => b.text).join('\n')
    }
  }

  return NextResponse.json({ reply: finalText })
}
