'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { siteConfig } from '@/lib/config'

export default function SlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const router = useRouter()
  const [notFound, setNotFound] = useState(false)

  // First: check if slug matches a property code directly (e.g., /103)
  const directMatch = siteConfig.properties.find(p => p.code === slug)

  useEffect(() => {
    if (directMatch) {
      // Redirect to canonical /property/[code] internally
      router.replace(`/property/${directMatch.code}${window.location.search}`)
      return
    }

    // Otherwise: resolve slug from Supabase
    async function resolveSlug() {
      try {
        const res = await fetch(`/api/slug?slug=${encodeURIComponent(slug)}`)
        if (!res.ok) {
          setNotFound(true)
          return
        }
        const data = await res.json()
        if (data.code) {
          router.replace(`/property/${data.code}${window.location.search}`)
        } else {
          setNotFound(true)
        }
      } catch {
        setNotFound(true)
      }
    }

    resolveSlug()
  }, [slug, directMatch, router])

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">Página não encontrada</h1>
          <p className="text-[var(--color-text-secondary)] mb-4">O endereço "/{slug}" não existe.</p>
          <a href="/" className="text-[var(--color-accent)] underline">Voltar para o início</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
      <Loader2 className="h-6 w-6 animate-spin text-[var(--color-accent)]" />
    </div>
  )
}
