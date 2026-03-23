'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { LayoutDashboard, CalendarDays, FileText, Settings, Activity, Upload, Search, DollarSign, Lock, LogOut, Sparkles, Tag, CalendarRange, Calculator } from 'lucide-react'

const ADMIN_PASSWORD = 'suacasa2026'

const navItems = [
  { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { name: 'Agenda', path: '/admin/agenda', icon: CalendarRange },
  { name: 'Despesas', path: '/admin/despesas', icon: DollarSign },
  { name: 'Limpezas', path: '/admin/limpezas', icon: Sparkles },
  { name: 'Reservas Diretas', path: '/admin/reservas-diretas', icon: CalendarDays },
  { name: 'Importar CSV', path: '/admin/importar', icon: Upload },
  { name: 'Relatórios', path: '/admin/relatorios', icon: FileText },
  { name: 'Contador', path: '/admin/contador', icon: Calculator },
  { name: 'Prospecção', path: '/admin/prospeccao', icon: Search },
  { name: 'Cupons', path: '/admin/cupons', icon: Tag },
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
    <div className="admin-theme min-h-screen bg-[#0c0c0f] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#c9a96e]/10 border border-[#c9a96e]/20 flex items-center justify-center mx-auto mb-4">
            <Lock className="h-6 w-6 text-[#c9a96e]" />
          </div>
          <h1 className="text-xl font-bold text-[#f0eee8]">Área Administrativa</h1>
          <p className="text-xs text-[#94918a] mt-1">Sua Casa Leblon</p>
        </div>
        <div className="bg-[#16161a] border border-[#2a2a30] rounded-2xl p-6">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] text-[#94918a] font-medium uppercase tracking-wider block mb-1.5">Senha</label>
              <input
                type="password"
                value={pw}
                onChange={e => setPw(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit(e)}
                placeholder="Digite a senha"
                autoFocus
                className={`w-full bg-[#1e1e24] border rounded-xl px-4 py-3 text-sm text-[#f0eee8] focus:border-[#c9a96e] focus:ring-1 focus:ring-[#c9a96e]/30 focus:outline-none transition-all ${error ? 'border-red-500 shake' : 'border-[#2a2a30]'}`}
              />
              {error && <p className="text-xs text-red-400 mt-1.5">Senha incorreta</p>}
            </div>
            <button
              onClick={handleSubmit}
              className="w-full bg-[#c9a96e] text-[#1a1207] py-3 rounded-xl font-semibold text-sm hover:bg-[#dbc192] transition-colors"
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

  useEffect(() => {
    const stored = sessionStorage.getItem('admin_auth')
    if (stored === 'true') setAuthed(true)
    setChecking(false)
  }, [])

  function handleLogout() {
    sessionStorage.removeItem('admin_auth')
    setAuthed(false)
  }

  if (checking) return <div className="admin-theme min-h-screen bg-[#0c0c0f]" />
  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />

  return (
    <div className="admin-theme flex h-screen bg-[#0c0c0f] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 border-r border-[#2a2a30] bg-[#16161a] flex-col hidden md:flex">
        <div className="h-16 flex items-center px-5 border-b border-[#2a2a30]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#c9a96e] flex items-center justify-center">
              <Activity className="h-4 w-4 text-[#1a1207]" />
            </div>
            <div>
              <span className="font-semibold text-sm text-[#f0eee8] tracking-tight">Sua Casa Leblon</span>
              <span className="block text-[10px] text-[#94918a] leading-none mt-0.5">Admin • 2026</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-0.5">
          {navItems.map((item) => (
            <Link key={item.path} href={item.path}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-[#94918a] hover:bg-[#1e1e24] hover:text-[#f0eee8] border border-transparent">
              <item.icon className="h-4 w-4" />{item.name}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-[#2a2a30] space-y-2">
          <Link href="/" className="text-xs text-[#94918a] hover:text-[#c9a96e] transition-colors block">← Voltar ao site</Link>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-[#94918a] hover:text-red-400 transition-colors"><LogOut className="h-3 w-3" /> Sair</button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-14 border-b border-[#2a2a30] bg-[#16161a]/50 backdrop-blur flex items-center px-6 shrink-0 justify-between">
          <div className="flex items-center gap-2 md:hidden text-[#c9a96e] font-semibold text-sm">
            <Activity className="h-4 w-4" /><span>Admin</span>
          </div>
          <div className="hidden md:block flex-1" />
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-[#94918a] hover:text-red-400 transition-colors md:hidden"><LogOut className="h-3 w-3" /> Sair</button>
        </header>
        <div className="flex-1 overflow-auto">{children}</div>
      </main>
    </div>
  )
}
