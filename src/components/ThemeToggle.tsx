'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark') {
      document.documentElement.classList.add('dark')
    } else if (saved === 'light') {
      document.documentElement.classList.remove('dark')
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark')
    }
    setMounted(true)
  }, [])

  if (!mounted) return <>{children}</>
  return <>{children}</>
}

export function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    if (next) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={dark ? 'Modo claro' : 'Modo escuro'}
      className="p-2 rounded-full hover:bg-[var(--color-border)] transition-colors"
    >
      {dark ? <Sun className="h-4 w-4 text-[var(--color-gold)]" /> : <Moon className="h-4 w-4 text-[var(--color-text-secondary)]" />}
    </button>
  )
}
