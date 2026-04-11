import { NextRequest, NextResponse } from 'next/server'

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''
const GITHUB_OWNER = 'AL-Apps-LTDA'
const GITHUB_REPO = 'suacasaleblon-platform'

export async function POST(req: NextRequest) {
  const { branchName } = await req.json()
  await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/refs/heads/${branchName}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' },
  })
  return NextResponse.json({ ok: true })
}
