import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Subdomain → path mapping
const SUBDOMAIN_MAP: Record<string, string> = {
  giro: '/giro',           // SaaS product — separate from /equipe
  equipe: '/equipe',       // Diego's internal team tool
  admin: '/admin',
  proprietarios: '/proprietarios',
}

const ROOT_DOMAIN = 'suacasaleblon.com'

function updateSupabaseSession(request: NextRequest, response: NextResponse) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return response

  createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value)
          response.cookies.set(name, value, options)
        })
      },
    },
  })
  return response
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || ''
  const url = request.nextUrl.clone()

  // Skip for API routes, static files, and _next
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next') || url.pathname.startsWith('/images') || url.pathname.includes('.')) {
    return NextResponse.next()
  }

  // Extract subdomain: "equipe.suacasaleblon.com" → "equipe"
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
    const response = NextResponse.next()
    // Refresh Supabase Auth session for Giro routes
    if (basePath === '/giro') return updateSupabaseSession(request, response)
    return response
  }

  // Rewrite: giro.suacasaleblon.com/ → /giro
  // Rewrite: equipe.suacasaleblon.com/ → /equipe
  url.pathname = url.pathname === '/' ? basePath : `${basePath}${url.pathname}`
  const response = NextResponse.rewrite(url)

  // Refresh Supabase Auth session for Giro routes
  if (basePath === '/giro') return updateSupabaseSession(request, response)
  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images|icons|manifest.json).*)'],
}
