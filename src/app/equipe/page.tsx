'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Loader2, KeyRound, ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const APARTMENTS = ['103', '403', '102', '303', '334A']
const EQUIPE_PIN = 'giro2026'
const DAYS_LABEL = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const APT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  '103': { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500' },
  '403': { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500' },
  '102': { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500' },
  '303': { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500' },
  '334A': { bg: 'bg-pink-500/15', text: 'text-pink-400', border: 'border-pink-500' },
}

interface Reservation {
  apartment_code: string
  guest_name: string
  checkin: string
  checkout: string
  source?: string
}

function fmtDay(d: Date) {
  return `${d.getDate().toString().padStart(2, '0')} ${MONTHS[d.getMonth()]}`
}

function dateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

export default function EquipePage() {
  const [pin, setPin] = useState('')
  const [auth, setAuth] = useState(false)
  const [loading, setLoading] = useState(false)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [weekOffset, setWeekOffset] = useState(0)

  // Check saved auth
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

  // Generate 14 days starting from Monday of current week + offset
  const days = useMemo(() => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + weekOffset * 7)
    monday.setHours(0, 0, 0, 0)

    const result: Date[] = []
    for (let i = 0; i < 14; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      result.push(d)
    }
    return result
  }, [weekOffset])

  const loadReservations = useCallback(async () => {
    if (!auth) return
    setLoading(true)
    const startDate = dateStr(days[0])
    const endD = new Date(days[days.length - 1])
    endD.setDate(endD.getDate() + 1)
    const endDate = dateStr(endD)

    const [resResult, directResult] = await Promise.allSettled([
      supabase.from('reservations').select('apartment_code,guest_name,checkin,checkout,source')
        .lt('checkin', endDate).gt('checkout', startDate).order('checkin'),
      supabase.from('direct_reservations').select('apartment_code,guest_name,checkin,checkout,source')
        .lt('checkin', endDate).gt('checkout', startDate).order('checkin'),
    ])

    const all: Reservation[] = []
    if (resResult.status === 'fulfilled' && resResult.value.data) all.push(...resResult.value.data)
    if (directResult.status === 'fulfilled' && directResult.value.data) all.push(...directResult.value.data)
    setReservations(all)
    setLoading(false)
  }, [auth, days])

  useEffect(() => { loadReservations() }, [loadReservations])

  function getStatus(apt: string, day: Date): { type: 'free' | 'occupied' | 'checkin' | 'checkout' | 'turnover'; guest?: string } {
    const ds = dateStr(day)
    const nextDay = new Date(day)
    nextDay.setDate(day.getDate() + 1)
    const nds = dateStr(nextDay)

    const aptRes = reservations.filter(r => r.apartment_code === apt)
    const isCheckin = aptRes.some(r => r.checkin === ds)
    const isCheckout = aptRes.some(r => r.checkout === ds)
    const isOccupied = aptRes.some(r => r.checkin <= ds && r.checkout > ds)
    const guest = aptRes.find(r => r.checkin <= ds && r.checkout > ds)?.guest_name || ''

    if (isCheckin && isCheckout) return { type: 'turnover', guest }
    if (isCheckin) return { type: 'checkin', guest }
    if (isCheckout) return { type: 'checkout', guest: aptRes.find(r => r.checkout === ds)?.guest_name || '' }
    if (isOccupied) return { type: 'occupied', guest }
    return { type: 'free' }
  }

  const today = dateStr(new Date())

  // ─── Login screen ───
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
          <input
            type="password"
            value={pin}
            onChange={e => setPin(e.target.value)}
            placeholder="PIN"
            className="w-full bg-[#1e1e24] border border-[#2a2a30] rounded-lg px-4 py-2.5 text-center text-[#f0eee8] text-lg tracking-[.3em] placeholder:text-[#94918a]/50 focus:outline-none focus:border-[#c9a96e]/50"
            autoFocus
          />
          <button type="submit" className="w-full bg-[#c9a96e] hover:bg-[#dbc192] text-[#1a1207] font-semibold rounded-lg py-2.5 text-sm transition-colors">
            Entrar
          </button>
        </form>
      </div>
    </div>
  )

  // ─── Main view ───
  const weekLabel1 = `${fmtDay(days[0])} – ${fmtDay(days[6])}`
  const weekLabel2 = `${fmtDay(days[7])} – ${fmtDay(days[13])}`

  return (
    <div className="min-h-screen bg-[#0c0c0f] text-[#f0eee8]">
      {/* Header */}
      <div className="bg-[#16161a] border-b border-[#2a2a30] px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[#f0eee8]">Agenda Equipe</h1>
            <p className="text-[11px] text-[#94918a]">Ocupação dos apartamentos</p>
          </div>
          <div className="flex items-center gap-1 bg-[#1e1e24] rounded-lg border border-[#2a2a30] px-1">
            <button onClick={() => setWeekOffset(w => w - 1)} className="p-1.5 text-[#94918a] hover:text-[#f0eee8]"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => setWeekOffset(0)} className="px-2 py-1 text-[11px] font-medium text-[#c9a96e] hover:text-[#dbc192]">Hoje</button>
            <button onClick={() => setWeekOffset(w => w + 1)} className="p-1.5 text-[#94918a] hover:text-[#f0eee8]"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-[#c9a96e]" /></div>
      ) : (
        <div className="max-w-3xl mx-auto px-3 py-4 space-y-5">

          {/* Legend */}
          <div className="flex items-center gap-3 flex-wrap text-[10px]">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/40" /><span className="text-[#94918a]">Livre</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/40" /><span className="text-[#94918a]">Ocupado</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500/40" /><span className="text-[#94918a]">Check-in</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/40" /><span className="text-[#94918a]">Check-out</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-purple-500/20 border border-purple-500/40" /><span className="text-[#94918a]">Troca</span></div>
          </div>

          {/* Week 1 */}
          <div>
            <h2 className="text-xs font-semibold text-[#94918a] uppercase tracking-wider mb-2">{weekLabel1}</h2>
            <div className="bg-[#16161a] border border-[#2a2a30] rounded-xl overflow-hidden">
              {/* Day headers */}
              <div className="grid grid-cols-[72px_repeat(7,1fr)] border-b border-[#2a2a30]">
                <div className="py-2 px-2 text-[10px] text-[#94918a]">Apt</div>
                {days.slice(0, 7).map((d, i) => {
                  const isT = dateStr(d) === today
                  return (
                    <div key={i} className={`py-2 text-center ${isT ? 'bg-[#c9a96e]/8' : ''}`}>
                      <div className={`text-[10px] font-medium ${isT ? 'text-[#c9a96e]' : 'text-[#94918a]'}`}>{DAYS_LABEL[d.getDay()]}</div>
                      <div className={`text-[11px] font-bold ${isT ? 'text-[#c9a96e]' : 'text-[#f0eee8]'}`}>{d.getDate()}</div>
                    </div>
                  )
                })}
              </div>

              {/* Rows per apartment */}
              {APARTMENTS.map(apt => {
                const c = APT_COLORS[apt]
                return (
                  <div key={apt} className="grid grid-cols-[72px_repeat(7,1fr)] border-b border-[#2a2a30]/50 last:border-b-0">
                    <div className={`px-2 py-3 flex items-center gap-1.5 ${c.text} text-xs font-bold border-r border-[#2a2a30]/30`}>
                      <div className={`w-2 h-2 rounded-full ${c.border.replace('border-', 'bg-')}`} />
                      {apt}
                    </div>
                    {days.slice(0, 7).map((d, i) => {
                      const s = getStatus(apt, d)
                      const isT = dateStr(d) === today
                      return (
                        <div key={i} className={`py-2 px-1 text-center border-r border-[#2a2a30]/20 last:border-r-0 ${isT ? 'bg-[#c9a96e]/5' : ''}`}>
                          {s.type === 'free' && <div className="text-[10px] text-emerald-400 font-semibold">LIVRE</div>}
                          {s.type === 'occupied' && <div><div className="text-[10px] text-red-400 font-semibold">OCUPADO</div><div className="text-[8px] text-[#94918a] truncate">{s.guest?.split(' ')[0]}</div></div>}
                          {s.type === 'checkin' && <div><div className="text-[10px] text-blue-400 font-semibold">IN</div><div className="text-[8px] text-[#94918a] truncate">{s.guest?.split(' ')[0]}</div></div>}
                          {s.type === 'checkout' && <div><div className="text-[10px] text-amber-400 font-semibold">OUT</div><div className="text-[8px] text-[#94918a] truncate">{s.guest?.split(' ')[0]}</div></div>}
                          {s.type === 'turnover' && <div><div className="text-[10px] text-purple-400 font-semibold">TROCA</div><div className="text-[8px] text-[#94918a] truncate">{s.guest?.split(' ')[0]}</div></div>}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Week 2 */}
          <div>
            <h2 className="text-xs font-semibold text-[#94918a] uppercase tracking-wider mb-2">{weekLabel2}</h2>
            <div className="bg-[#16161a] border border-[#2a2a30] rounded-xl overflow-hidden">
              <div className="grid grid-cols-[72px_repeat(7,1fr)] border-b border-[#2a2a30]">
                <div className="py-2 px-2 text-[10px] text-[#94918a]">Apt</div>
                {days.slice(7, 14).map((d, i) => {
                  const isT = dateStr(d) === today
                  return (
                    <div key={i} className={`py-2 text-center ${isT ? 'bg-[#c9a96e]/8' : ''}`}>
                      <div className={`text-[10px] font-medium ${isT ? 'text-[#c9a96e]' : 'text-[#94918a]'}`}>{DAYS_LABEL[d.getDay()]}</div>
                      <div className={`text-[11px] font-bold ${isT ? 'text-[#c9a96e]' : 'text-[#f0eee8]'}`}>{d.getDate()}</div>
                    </div>
                  )
                })}
              </div>
              {APARTMENTS.map(apt => {
                const c = APT_COLORS[apt]
                return (
                  <div key={apt} className="grid grid-cols-[72px_repeat(7,1fr)] border-b border-[#2a2a30]/50 last:border-b-0">
                    <div className={`px-2 py-3 flex items-center gap-1.5 ${c.text} text-xs font-bold border-r border-[#2a2a30]/30`}>
                      <div className={`w-2 h-2 rounded-full ${c.border.replace('border-', 'bg-')}`} />
                      {apt}
                    </div>
                    {days.slice(7, 14).map((d, i) => {
                      const s = getStatus(apt, d)
                      const isT = dateStr(d) === today
                      return (
                        <div key={i} className={`py-2 px-1 text-center border-r border-[#2a2a30]/20 last:border-r-0 ${isT ? 'bg-[#c9a96e]/5' : ''}`}>
                          {s.type === 'free' && <div className="text-[10px] text-emerald-400 font-semibold">LIVRE</div>}
                          {s.type === 'occupied' && <div><div className="text-[10px] text-red-400 font-semibold">OCUPADO</div><div className="text-[8px] text-[#94918a] truncate">{s.guest?.split(' ')[0]}</div></div>}
                          {s.type === 'checkin' && <div><div className="text-[10px] text-blue-400 font-semibold">IN</div><div className="text-[8px] text-[#94918a] truncate">{s.guest?.split(' ')[0]}</div></div>}
                          {s.type === 'checkout' && <div><div className="text-[10px] text-amber-400 font-semibold">OUT</div><div className="text-[8px] text-[#94918a] truncate">{s.guest?.split(' ')[0]}</div></div>}
                          {s.type === 'turnover' && <div><div className="text-[10px] text-purple-400 font-semibold">TROCA</div><div className="text-[8px] text-[#94918a] truncate">{s.guest?.split(' ')[0]}</div></div>}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Free days summary */}
          <div className="bg-[#16161a] border border-emerald-500/15 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-emerald-400 mb-3">Dias livres para reparos</h3>
            <div className="space-y-2">
              {APARTMENTS.map(apt => {
                const freeDays = days.filter(d => getStatus(apt, d).type === 'free')
                const c = APT_COLORS[apt]
                return (
                  <div key={apt} className="flex items-start gap-2">
                    <span className={`text-xs font-bold ${c.text} min-w-[40px]`}>{apt}</span>
                    {freeDays.length === 0
                      ? <span className="text-[11px] text-[#94918a]">Sem dias livres neste período</span>
                      : <div className="flex flex-wrap gap-1">
                          {freeDays.map((d, i) => (
                            <span key={i} className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded px-1.5 py-0.5 font-medium">
                              {DAYS_LABEL[d.getDay()]} {d.getDate()}/{d.getMonth() + 1}
                            </span>
                          ))}
                        </div>
                    }
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      )}

      <footer className="text-center py-6 text-[10px] text-[#94918a]/50">
        Sua Casa Leblon · Equipe
      </footer>
    </div>
  )
}
