'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { LayoutDashboard, CalendarDays, FileText, Settings, Upload, Search, DollarSign, Lock, LogOut, Sparkles, Tag, CalendarRange, Calculator, Building2, Menu, X, TrendingUp, Palmtree, Users, Mail } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { AdminThemeToggle } from '@/components/AdminThemeToggle'
import { AdminPWAHead } from '@/components/AdminPWAHead'

const ADMIN_PASSWORD = 'suacasa2026'

const navItems = [
  { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { name: 'Apartamentos', path: '/admin/apartamentos', icon: Building2 },
  // { name: 'Agenda', path: '/admin/agenda', icon: CalendarRange }, // escondido — código mantido em app/admin/agenda/page.tsx
  { name: 'Despesas', path: '/admin/despesas', icon: DollarSign },
  { name: 'Equipe', path: '/admin/limpezas', icon: Sparkles },
  // { name: 'Agenda Búzios', path: '/admin/agenda-buzios', icon: Palmtree }, // escondido — código mantido
  { name: 'Reservas Diretas', path: '/admin/reservas-diretas', icon: CalendarDays },
  { name: 'Importar CSV', path: '/admin/importar', icon: Upload },
  { name: 'Relatórios', path: '/admin/relatorios', icon: FileText },
  { name: 'Contador', path: '/admin/contador', icon: Calculator },
  { name: 'Prospecção', path: '/admin/prospeccao', icon: Search },
  { name: 'Cupons', path: '/admin/cupons', icon: Tag },
  { name: 'Clientes Giro', path: '/admin/clientes-giro', icon: Users },
  { name: 'Emails / Mensagens', path: '/admin/emails', icon: Mail },
  { name: 'Dynamic Pricing', path: '/admin/dynamic-pricing', icon: TrendingUp },
  { name: 'Integrações', path: '/admin/integracoes', icon: Settings },
]

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [pw, setPw] = useState('')
  const [error, setError] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pw === ADMIN_PASSWORD) {
      sessionStorage.setItem('admin_auth', 'true')
      onLogin()
    } else {
      setError(true)
      setTimeout(() => setError(false), 2000)
    }
  }

  return (
    <div className="admin-theme min-h-screen bg-[rgb(var(--adm-bg))] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[rgb(var(--adm-accent)/0.10)] border border-[rgb(var(--adm-accent)/0.20)] flex items-center justify-center mx-auto mb-4">
            <Lock className="h-6 w-6 text-[rgb(var(--adm-accent))]" />
          </div>
          <h1 className="text-xl font-bold text-[rgb(var(--adm-text))]">Área Administrativa</h1>
          <p className="text-xs text-[rgb(var(--adm-muted))] mt-1">Sua Casa Leblon</p>
        </div>
        <div className="bg-[rgb(var(--adm-surface))] border border-[rgb(var(--adm-border))] rounded-2xl p-6">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] text-[rgb(var(--adm-muted))] font-medium uppercase tracking-wider block mb-1.5">Senha</label>
              <input
                type="password"
                value={pw}
                onChange={e => setPw(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit(e)}
                placeholder="Digite a senha"
                autoFocus
                className={`w-full bg-[rgb(var(--adm-elevated))] border rounded-xl px-4 py-3 text-sm text-[rgb(var(--adm-text))] focus:border-[rgb(var(--adm-accent))] focus:ring-1 focus:ring-[rgb(var(--adm-accent)/0.30)] focus:outline-none transition-all ${error ? 'border-red-500 shake' : 'border-[rgb(var(--adm-border))]'}`}
              />
              {error && <p className="text-xs text-red-400 mt-1.5">Senha incorreta</p>}
            </div>
            <button
              onClick={handleSubmit}
              className="w-full bg-[rgb(var(--adm-accent))] text-[rgb(var(--adm-accent-fg))] py-3 rounded-xl font-semibold text-sm hover:bg-[rgb(var(--adm-accent-hover))] transition-colors"
            >
              Entrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)
  const [dark, setDark] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const stored = sessionStorage.getItem('admin_auth')
    if (stored === 'true') setAuthed(true)
    const savedTheme = localStorage.getItem('admin-theme')
    if (savedTheme === 'dark') setDark(true)
    setChecking(false)
  }, [])

  function toggleTheme() {
    const next = !dark
    setDark(next)
    localStorage.setItem('admin-theme', next ? 'dark' : 'light')
  }

  function handleLogout() {
    sessionStorage.removeItem('admin_auth')
    setAuthed(false)
  }

  const themeClass = `admin-theme${dark ? '' : ' admin-light'}`

  if (checking) return <div className={`${themeClass} min-h-screen bg-[rgb(var(--adm-bg))]`} />
  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />

  return (
    <div className={`${themeClass} flex h-screen bg-[rgb(var(--adm-bg))] overflow-hidden`}>
      <AdminPWAHead />
      {/* Mobile drawer overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <aside className="relative w-72 h-full bg-[rgb(var(--adm-surface))] border-r border-[rgb(var(--adm-border))] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="h-16 flex items-center justify-between px-5 border-b border-[rgb(var(--adm-border))]">
              <div className="flex items-center gap-2.5">
                <img src="/images/logo.png" alt="Giro" className="w-8 h-8 rounded-lg" />
                <div>
                  <span className="font-semibold text-sm text-[rgb(var(--adm-text))] tracking-tight">Sua Casa Leblon</span>
                  <span className="block text-[10px] text-[rgb(var(--adm-muted))] leading-none mt-0.5">Admin • 2026</span>
                </div>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 rounded-lg hover:bg-[rgb(var(--adm-elevated))] transition-colors">
                <X className="h-5 w-5 text-[rgb(var(--adm-muted))]" />
              </button>
            </div>
            <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = pathname === item.path || (item.path !== '/admin' && pathname.startsWith(item.path))
                return (
                  <Link key={item.path} href={item.path} onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 border border-transparent ${isActive ? 'bg-[rgb(var(--adm-accent)/0.10)] text-[rgb(var(--adm-accent))] border-[rgb(var(--adm-accent)/0.15)]' : 'text-[rgb(var(--adm-muted))] hover:bg-[rgb(var(--adm-elevated))] hover:text-[rgb(var(--adm-text))]'}`}>
                    <item.icon className="h-4 w-4" />{item.name}
                  </Link>
                )
              })}
            </nav>
            <div className="p-4 border-t border-[rgb(var(--adm-border))] space-y-2">
              <Link href="/" className="text-xs text-[rgb(var(--adm-muted))] hover:text-[rgb(var(--adm-accent))] transition-colors block">← Voltar ao site</Link>
              <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-[rgb(var(--adm-muted))] hover:text-red-400 transition-colors"><LogOut className="h-3 w-3" /> Sair</button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="w-60 border-r border-[rgb(var(--adm-border))] bg-[rgb(var(--adm-surface))] flex-col hidden md:flex">
        <div className="h-16 flex items-center px-5 border-b border-[rgb(var(--adm-border))]">
          <div className="flex items-center gap-2.5">
            <img src="/images/logo.png" alt="Giro" className="w-8 h-8 rounded-lg" />
            <div>
              <span className="font-semibold text-sm text-[rgb(var(--adm-text))] tracking-tight">Sua Casa Leblon</span>
              <span className="block text-[10px] text-[rgb(var(--adm-muted))] leading-none mt-0.5">Admin • 2026</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.path || (item.path !== '/admin' && pathname.startsWith(item.path))
            return (
              <Link key={item.path} href={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 border ${isActive ? 'bg-[rgb(var(--adm-accent)/0.10)] text-[rgb(var(--adm-accent))] border-[rgb(var(--adm-accent)/0.15)]' : 'text-[rgb(var(--adm-muted))] hover:bg-[rgb(var(--adm-elevated))] hover:text-[rgb(var(--adm-text))] border-transparent'}`}>
                <item.icon className="h-4 w-4" />{item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-[rgb(var(--adm-border))] space-y-2">
          <Link href="/" className="text-xs text-[rgb(var(--adm-muted))] hover:text-[rgb(var(--adm-accent))] transition-colors block">← Voltar ao site</Link>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-[rgb(var(--adm-muted))] hover:text-red-400 transition-colors"><LogOut className="h-3 w-3" /> Sair</button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-14 border-b border-[rgb(var(--adm-border))] bg-[rgb(var(--adm-surface)/0.50)] backdrop-blur flex items-center px-4 md:px-6 shrink-0 justify-between">
          <div className="flex items-center gap-3 md:hidden">
            <button onClick={() => setMobileMenuOpen(true)} className="p-1.5 -ml-1 rounded-lg hover:bg-[rgb(var(--adm-elevated))] transition-colors">
              <Menu className="h-5 w-5 text-[rgb(var(--adm-text))]" />
            </button>
            <div className="flex items-center gap-2 text-[rgb(var(--adm-accent))] font-semibold text-sm">
              <img src="/images/logo.png" alt="Giro" className="w-5 h-5 rounded" /><span>Admin</span>
            </div>
          </div>
          <div className="hidden md:block flex-1" />
          <div className="flex items-center gap-2">
            <AdminThemeToggle dark={dark} onToggle={toggleTheme} />
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-[rgb(var(--adm-muted))] hover:text-red-400 transition-colors md:hidden"><LogOut className="h-3 w-3" /> Sair</button>
          </div>
        </header>
        <div className="flex-1 overflow-auto">{children}</div>
      </main>
    </div>
  )
}
