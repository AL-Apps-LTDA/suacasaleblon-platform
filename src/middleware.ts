import { NextRequest, NextResponse } from 'next/server'

// Subdomain → path mapping
const SUBDOMAIN_MAP: Record<string, string> = {
  equipe: '/equipe',
  admin: '/admin',
  proprietarios: '/proprietarios',
}

const ROOT_DOMAIN = 'suacasaleblon.com'

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || ''
  const url = request.nextUrl.clone()

  // Skip for API routes, static files, and _next
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next') || url.pathname.startsWith('/images') || url.pathname.includes('.')) {
    return NextResponse.next()
  }

  // Extract subdomain: "equipe.suacasaleblon.com" → "equipe"
  // Also handle Vercel preview URLs: "equipe.suacasaleblon-platform-*.vercel.app"
  let subdomain: string | null = null

  if (host.endsWith(`.${ROOT_DOMAIN}`)) {
    subdomain = host.replace(`.${ROOT_DOMAIN}`, '').split('.')[0]
  }

  // No subdomain or www → normal routing
  if (!subdomain || subdomain === 'www') {
    return NextResponse.next()
  }

  const basePath = SUBDOMAIN_MAP[subdomain]
  if (!basePath) {
    return NextResponse.next()
  }

  // If already on the right path, skip (avoid infinite rewrite)
  if (url.pathname.startsWith(basePath)) {
    return NextResponse.next()
  }

  // Rewrite: equipe.suacasaleblon.com/ → /equipe
  // Rewrite: equipe.suacasaleblon.com/foo → /equipe/foo
  url.pathname = url.pathname === '/' ? basePath : `${basePath}${url.pathname}`
  return NextResponse.rewrite(url)
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images|icons|manifest.json).*)'],
}
