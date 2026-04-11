import { NextRequest, NextResponse } from 'next/server'

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''
const GITHUB_OWNER = 'AL-Apps-LTDA'
const GITHUB_REPO = 'suacasaleblon-platform'
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''

// ─── GitHub helpers ───────────────────────────────────────────────────────────

async function githubGet(path: string) {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}${path}`, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
    },
  })
  return res.json()
}

async function githubPut(path: string, body: object) {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  return res.json()
}

async function githubPost(path: string, body: object) {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  return res.json()
}

// Busca SHA do arquivo atual na main
async function getFileSha(filePath: string): Promise<{ sha: string; content: string } | null> {
  try {
    const data = await githubGet(`/contents/${filePath}?ref=main`)
    if (data.sha) {
      const content = Buffer.from(data.content, 'base64').toString('utf-8')
      return { sha: data.sha, content }
    }
    return null
  } catch {
    return null
  }
}

// Cria branch a partir da main
async function createBranch(branchName: string): Promise<string> {
  const main = await githubGet('/git/refs/heads/main')
  const sha = main.object.sha
  await githubPost('/git/refs', {
    ref: `refs/heads/${branchName}`,
    sha,
  })
  return sha
}

// Commita arquivo na branch
async function commitFile(branchName: string, filePath: string, content: string, message: string, existingSha?: string) {
  const encoded = Buffer.from(content).toString('base64')
  await githubPut(`/contents/${filePath}`, {
    message,
    content: encoded,
    branch: branchName,
    ...(existingSha ? { sha: existingSha } : {}),
  })
}

// Gera diff legível entre dois conteúdos
function generateDiff(oldContent: string, newContent: string, filePath: string): string {
  const oldLines = oldContent.split('\n')
  const newLines = newContent.split('\n')
  const diff: string[] = [`📄 ${filePath}`]

  let i = 0, j = 0
  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      i++; j++
    } else if (j < newLines.length && (i >= oldLines.length || oldLines[i] !== newLines[j])) {
      diff.push(`+ ${newLines[j]}`)
      j++
    } else {
      diff.push(`- ${oldLines[i]}`)
      i++
    }
  }

  const changes = diff.filter(l => l.startsWith('+') || l.startsWith('-')).length
  return `${diff.join('\n')}\n\n✏️ ${changes} linha(s) alterada(s)`
}

// ─── Handler principal ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!GITHUB_TOKEN || !ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'GITHUB_TOKEN ou ANTHROPIC_API_KEY não configurados.' }, { status: 500 })
  }

  const { instruction, filePath } = await req.json()

  if (!instruction || !filePath) {
    return NextResponse.json({ error: 'instruction e filePath são obrigatórios.' }, { status: 400 })
  }

  // Busca conteúdo atual do arquivo
  const existing = await getFileSha(filePath)
  const oldContent = existing?.content || ''

  // Claude gera o novo conteúdo
  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: `Você é um assistente de código para o sistema Sua Casa Leblon (Next.js 15, TypeScript, Tailwind, Supabase).
      
REGRAS CRÍTICAS:
- Você não tem pressa. Execute bem, não rápido.
- Retorne APENAS o conteúdo completo do arquivo, sem explicações, sem markdown, sem backticks.
- Mantenha todo o código existente que não foi pedido para alterar.
- Use os mesmos padrões visuais do sistema (classes admin-theme, rgb vars, etc).
- Quando tiver dúvida sobre algo, inclua um comentário TODO no código.
- Nunca remova funcionalidades existentes sem instrução explícita.`,
      messages: [{
        role: 'user',
        content: `Arquivo atual (${filePath}):\n\`\`\`\n${oldContent || '(arquivo novo)'}\n\`\`\`\n\nInstrução: ${instruction}\n\nRetorne o conteúdo completo e correto do arquivo.`
      }],
    }),
  })

  const claudeData = await claudeRes.json()
  const newContent = claudeData.content?.[0]?.text || ''

  if (!newContent) {
    return NextResponse.json({ error: 'Claude não gerou conteúdo.' }, { status: 500 })
  }

  // Cria branch com nome baseado na instrução
  const branchName = `agent/code-${Date.now()}`
  await createBranch(branchName)

  // Commita o arquivo na branch
  await commitFile(
    branchName,
    filePath,
    newContent,
    `agent: ${instruction.slice(0, 72)}`,
    existing?.sha
  )

  // Gera diff visual
  const diff = generateDiff(oldContent, newContent, filePath)

  return NextResponse.json({
    ok: true,
    branchName,
    filePath,
    diff,
    newContent,
  })
}
