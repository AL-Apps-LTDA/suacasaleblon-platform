'use client'

import { Moon, Sun } from 'lucide-react'

export function AdminThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label={dark ? 'Modo claro' : 'Modo escuro'}
      className="p-2 rounded-lg hover:bg-[rgb(var(--adm-elevated))] transition-colors"
    >
      {dark
        ? <Sun className="h-4 w-4 text-[rgb(var(--adm-accent))]" />
        : <Moon className="h-4 w-4 text-[rgb(var(--adm-muted))]" />
      }
    </button>
  )
}
