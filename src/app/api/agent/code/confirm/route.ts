import { NextRequest, NextResponse } from 'next/server'

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''
const GITHUB_OWNER = 'AL-Apps-LTDA'
const GITHUB_REPO = 'suacasaleblon-platform'

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

async function githubDelete(path: string) {
  await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}${path}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
    },
  })
}

export async function POST(req: NextRequest) {
  if (!GITHUB_TOKEN) {
    return NextResponse.json({ error: 'GITHUB_TOKEN não configurado.' }, { status: 500 })
  }

  const { branchName, instruction } = await req.json()

  if (!branchName) {
    return NextResponse.json({ error: 'branchName é obrigatório.' }, { status: 400 })
  }

  // Merge da branch para main
  const mergeRes = await githubPost('/merges', {
    base: 'main',
    head: branchName,
    commit_message: `✅ Aprovado por Diego: ${instruction || branchName}`,
  })

  if (mergeRes.sha || mergeRes.message === 'Already up to date.') {
    // Deleta a branch após merge
    await githubDelete(`/git/refs/heads/${branchName}`)
    return NextResponse.json({ ok: true, merged: true, sha: mergeRes.sha })
  }

  return NextResponse.json({ error: 'Erro no merge.', detail: mergeRes }, { status: 500 })
}
