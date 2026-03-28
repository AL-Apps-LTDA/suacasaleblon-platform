'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Loader2, KeyRound, ChevronLeft, ChevronRight, RefreshCw, CheckCircle2 } from 'lucide-react'

const APARTMENTS = ['103', '403', '102', '303', '334A']
const EQUIPE_PIN = 'giro2026'
const DAYS_LABEL = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']

interface Reservation {
  apartment_code: string
  guest_name: string
  checkin: string
  checkout: string
}

interface Cleaning {
  id?: string
  apartment_code: string
  date: string
  status?: string
}

const APT_BG: Record<string, string> = {
  '103': 'bg-blue-500/30 border-blue-500/40 text-blue-300',
  '403': 'bg-emerald-500/30 border-emerald-500/40 text-emerald-300',
  '102': 'bg-purple-500/30 border-purple-500/40 text-purple-300',
  '303': 'bg-orange-500/30 border-orange-500/40 text-orange-300',
  '334A': 'bg-pink-500/30 border-pink-500/40 text-pink-300',
}

const APT_BG_CLEAN = 'bg-emerald-600/60 border-emerald-500/50 text-white'

function dateStr(d: Date) { return d.toISOString().slice(0, 10) }
function fmtRange(a: Date, b: Date) {
  const f = (d: Date) => `${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2,'0')}`
  return `${f(a)} - ${f(b)}`
}

export default function EquipePage() {
  const [pin, setPin] = useState('')
  const [auth, setAuth] = useState(false)
  const [loading, setLoading] = useState(false)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [cleanings, setCleanings] = useState<Cleaning[]>([])
  const [weekOffset, setWeekOffset] = useState(0)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('equipe_auth')
      if (saved === 'ok') setAuth(true)
    }
  }, [])

  function handleLogin() {
    if (pin === EQUIPE_PIN) {
      setAuth(true)
      sessionStorage.setItem('equipe_auth', 'ok')
    }
  }

  const days = useMemo(() => {
    const now = new Date()
    const dow = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1) + weekOffset * 7)
    monday.setHours(0,0,0,0)
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      return d
    })
  }, [weekOffset])

  const loadData = useCallback(async () => {
    if (!auth) return
    setLoading(true)
    try {
      const res = await fetch('/api/equipe')
      const data = await res.json()
      if (data.ok) {
        setReservations(data.reservations || [])
        setCleanings(data.cleanings || [])
      }
    } catch (e) { console.warn('Erro ao carregar:', e) }
    setLoading(false)
  }, [auth])

  useEffect(() => { loadData() }, [loadData])

  const today = dateStr(new Date())

  function getDayEvent(apt: string, day: Date): 'free' | 'cleaning' | 'cleaning-done' | 'occupied' {
    const ds = dateStr(day)
    const aptRes = reservations.filter(r => r.apartment_code === apt)
    const isCheckout = aptRes.some(r => r.checkout === ds)

    if (isCheckout) {
      const cl = cleanings.find(c => c.apartment_code === apt && c.date === ds)
      return cl?.status === 'completed' ? 'cleaning-done' : 'cleaning'
    }

    const isOccupied = aptRes.some(r => r.checkin <= ds && r.checkout > ds)
    return isOccupied ? 'occupied' : 'free'
  }

  if (!auth) return (
    <div className="min-h-screen bg-[#0c0c0f] flex items-center justify-center p-4">
      <div className="bg-[#16161a] border border-[#2a2a30] rounded-2xl p-8 w-full max-w-xs text-center space-y-5">
        <div className="w-14 h-14 rounded-full bg-[#c9a96e]/10 border border-[#c9a96e]/20 flex items-center justify-center mx-auto">
          <KeyRound className="h-6 w-6 text-[#c9a96e]" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-[#f0eee8]">Agenda Equipe</h1>
          <p className="text-xs text-[#94918a] mt-1">Digite o PIN para acessar</p>
        </div>
        <form onSubmit={e => { e.preventDefault(); handleLogin() }} className="space-y-3">
          <input type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="PIN"
            className="w-full bg-[#1e1e24] border border-[#2a2a30] rounded-lg px-4 py-2.5 text-center text-[#f0eee8] text-lg tracking-[.3em] placeholder:text-[#94918a]/50 focus:outline-none focus:border-[#c9a96e]/50"
            autoFocus />
          <button type="submit" className="w-full bg-[#c9a96e] hover:bg-[#dbc192] text-[#1a1207] font-semibold rounded-lg py-2.5 text-sm transition-colors">Entrar</button>
        </form>
      </div>
    </div>
  )

  function WeekGrid({ weekDays, label }: { weekDays: Date[]; label: string }) {
    const columns = weekDays.map(d => {
      const events: { apt: string; type: string }[] = []
      APARTMENTS.forEach(apt => {
        const ev = getDayEvent(apt, d)
        if (ev !== 'free') events.push({ apt, type: ev })
      })
      return events
    })

    const maxRows = Math.max(...columns.map(c => c.length), 3)

    return (
      <div className="bg-[#1a1a2e]/80 border border-[#2a2a40] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-sm font-bold text-[#c9a96e] uppercase tracking-wider">{label}</h2>
          <span className="text-xs text-[#94918a] font-mono">{fmtRange(weekDays[0], weekDays[6])}</span>
        </div>

        <div className="grid grid-cols-7 border-t border-[#2a2a40]">
          {weekDays.map((d, i) => {
            const isT = dateStr(d) === today
            return (
              <div key={i} className={`text-center py-2 ${isT ? 'bg-[#c9a96e]/10' : ''}`}>
                <div className={`text-[10px] font-semibold ${isT ? 'text-[#c9a96e]' : 'text-[#94918a]'}`}>
                  {DAYS_LABEL[d.getDay()]}
                </div>
                <div className={`text-[11px] font-bold mt-0.5 ${isT ? 'text-[#c9a96e]' : 'text-[#f0eee8]'}`}>
                  {isT ? (
                    <span className="inline-flex items-center justify-center w-7 h-5 rounded-full border border-[#c9a96e]">
                      {d.getDate().toString().padStart(2,'0')}/{(d.getMonth()+1).toString().padStart(2,'0')}
                    </span>
                  ) : (
                    `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}`
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="border-t border-[#2a2a40]">
          {Array.from({ length: maxRows }, (_, rowIdx) => (
            <div key={rowIdx} className="grid grid-cols-7">
              {columns.map((col, colIdx) => {
                const cell = col[rowIdx]
                if (!cell) {
                  return (
                    <div key={colIdx} className="h-10 border-r border-b border-[#2a2a40]/30 flex items-center justify-center">
                      <div className="w-1 h-1 rounded-full bg-[#2a2a40]" />
                    </div>
                  )
                }

                const isDone = cell.type === 'cleaning-done'
                const colorClass = isDone ? APT_BG_CLEAN : (APT_BG[cell.apt] || APT_BG['103'])

                return (
                  <div key={colIdx} className="h-10 border-r border-b border-[#2a2a40]/30 flex items-center justify-center p-0.5">
                    <div className={`w-full h-full rounded-lg border flex items-center justify-center relative ${colorClass}`}>
                      {isDone && (
                        <CheckCircle2 className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 text-emerald-400 bg-[#1a1a2e] rounded-full" />
                      )}
                      <span className="text-[11px] font-bold">{cell.apt}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const week1 = days.slice(0, 7)
  const week2 = days.slice(7, 14)

  return (
    <div className="min-h-screen bg-[#0c0c0f] text-[#f0eee8]">
      <div className="bg-[#16161a] border-b border-[#2a2a30] px-4 py-3">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-[#f0eee8]">Agenda</h1>
            <button onClick={loadData} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2a2a30] bg-[#1e1e24] text-xs font-medium text-[#f0eee8] hover:bg-[#2a2a30] transition-colors">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
          <div className="flex items-center justify-between">
            <button onClick={() => setWeekOffset(w => w - 1)} className="p-2 rounded-lg bg-[#1e1e24] border border-[#2a2a30] text-[#94918a] hover:text-[#f0eee8]">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={() => setWeekOffset(0)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#c9a96e]/10 border border-[#c9a96e]/30 text-[#c9a96e] hover:bg-[#c9a96e]/20">
              Semana Atual
            </button>
            <button onClick={() => setWeekOffset(w => w + 1)} className="p-2 rounded-lg bg-[#1e1e24] border border-[#2a2a30] text-[#94918a] hover:text-[#f0eee8]">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-[#c9a96e]" /></div>
      ) : (
        <div className="max-w-lg mx-auto px-3 py-4 space-y-4">
          <WeekGrid weekDays={week1} label="Semana Atual" />
          <WeekGrid weekDays={week2} label="Próxima Semana" />

          <div className="bg-[#16161a] border border-[#2a2a30] rounded-xl p-3">
            <div className="flex items-center flex-wrap gap-3 text-[10px]">
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-5 rounded bg-blue-500/30 border border-blue-500/40 flex items-center justify-center text-[8px] text-blue-300 font-bold">103</div>
                <span className="text-[#94918a]">Limpeza pendente</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-5 rounded bg-emerald-600/60 border border-emerald-500/50 flex items-center justify-center">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                </div>
                <span className="text-[#94918a]">Concluída</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#2a2a40]" />
                <span className="text-[#94918a]">Livre</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="text-center py-4 text-[10px] text-[#94918a]/50">
        Sua Casa Leblon · Equipe
      </footer>
    </div>
  )
}
