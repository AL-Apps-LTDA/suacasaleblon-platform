import Link from 'next/link'
import { LayoutDashboard, CalendarDays, FileText, Settings, Activity, Upload, Search } from 'lucide-react'

const navItems = [
  { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { name: 'Reservas Diretas', path: '/admin/reservas-diretas', icon: CalendarDays },
  { name: 'Importar CSV', path: '/admin/importar', icon: Upload },
  { name: 'Relatórios', path: '/admin/relatorios', icon: FileText },
  { name: 'Prospecção', path: '/admin/prospeccao', icon: Search },
  { name: 'Integrações', path: '/admin/integracoes', icon: Settings },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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
            <Link
              key={item.path}
              href={item.path}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-[#94918a] hover:bg-[#1e1e24] hover:text-[#f0eee8] border border-transparent"
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-[#2a2a30]">
          <Link href="/" className="text-xs text-[#94918a] hover:text-[#c9a96e] transition-colors">
            ← Voltar ao site
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-14 border-b border-[#2a2a30] bg-[#16161a]/50 backdrop-blur flex items-center px-6 shrink-0">
          <div className="flex items-center gap-2 md:hidden text-[#c9a96e] font-semibold text-sm">
            <Activity className="h-4 w-4" />
            <span>Admin</span>
          </div>
          <div className="hidden md:block flex-1" />
        </header>
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
