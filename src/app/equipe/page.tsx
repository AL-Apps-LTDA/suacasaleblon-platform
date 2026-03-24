'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Loader2, KeyRound, ChevronLeft, ChevronRight, Users, Calendar, Home, ArrowRight, Wrench } from 'lucide-react'

const APARTMENTS = ['103', '403', '102', '303', '334A']
const EQUIPE_PIN = 'giro2026'
const DAYS_LABEL = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const APT_COLORS: Record<string, { accent: string; bg: string; border: string; dot: string }> = {
  '103': { accent: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', dot: 'bg-blue-400' },
  '403': { accent: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
  '102': { accent: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', dot: 'bg-purple-400' },
  '303': { accent: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', dot: 'bg-orange-400' },
  '334A': { accent: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/30', dot: 'bg-pink-400' },
}

interface Reservation {
  apartment_code: string
  guest_name: string
  checkin: string
  checkout: string
  nights?: number
  guests?: number
  source?: string
}

function fmtDate(ds: string) {
  const [y, m, d] = ds.split('-').map(Number)
  return `${d.toString().padStart(2, '0')}/${m.toString().padStart(2, '0')}`
}

function fmtDateFull(ds: string) {
  const dt = new Date(ds + 'T12:00:00')
  return `${DAYS_LABEL[dt.getDay()]} ${dt.getDate()} ${MONTHS[dt.getMonth()]}`
}

function dateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

function fmtDay(d: Date) {
  return `${d.getDate().toString().padStart(2, '0')} ${MONTHS[d.getMonth()]}`
}

export default function EquipePage() {
  const [pin, setPin] = useState('')
  const [auth, setAuth] = useState(false)
  const [loading, setLoading] = useState(false)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [weekOffset, setWeekOffset] = useState(0)
  const [view, setView] = useState<'lista' | 'grade'>('lista')

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

  // Generate 14 days
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
    try {
      const res = await fetch('/api/equipe')
      const data = await res.json()
      if (data.ok && data.reservations) {
        setReservations(data.reservations)
      }
    } catch (e) {
      console.warn('Erro ao carregar reservas:', e)
    }
    setLoading(false)
  }, [auth])

  useEffect(() => { loadReservations() }, [loadReservations])

  const today = dateStr(new Date())
  const periodStart = dateStr(days[0])
  const periodEnd = dateStr(days[13])

  // ─── Get status for grid view ───
  function getStatus(apt: string, day: Date): { type: 'free' | 'occupied' | 'checkin' | 'checkout' | 'turnover'; guest?: string } {
    const ds = dateStr(day)
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

  // ─── Get reservations visible in this period per apartment ───
  const reservationsByApt = useMemo(() => {
    const map: Record<string, Reservation[]> = {}
    APARTMENTS.forEach(apt => {
      map[apt] = reservations
        .filter(r => r.apartment_code === apt && r.checkout >= periodStart && r.checkin <= periodEnd)
        .sort((a, b) => a.checkin.localeCompare(b.checkin))
    })
    return map
  }, [reservations, periodStart, periodEnd])

  // ─── Free days per apartment ───
  const freeDaysByApt = useMemo(() => {
    const map: Record<string, Date[]> = {}
    APARTMENTS.forEach(apt => {
      map[apt] = days.filter(d => getStatus(apt, d).type === 'free')
    })
    return map
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservations, days])

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
  return (
    <div className="min-h-screen bg-[#0c0c0f] text-[#f0eee8]">
      {/* Header */}
      <div className="bg-[#16161a] border-b border-[#2a2a30] px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-base font-bold text-[#f0eee8]">Agenda Equipe</h1>
              <p className="text-[10px] text-[#94918a]">Ocupação dos apartamentos · Leblon</p>
            </div>
            {/* View toggle */}
            <div className="flex items-center gap-0.5 bg-[#1e1e24] rounded-lg border border-[#2a2a30] p-0.5">
              <button
                onClick={() => setView('lista')}
                className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-colors ${view === 'lista' ? 'bg-[#c9a96e] text-[#1a1207]' : 'text-[#94918a] hover:text-[#f0eee8]'}`}
              >Lista</button>
              <button
                onClick={() => setView('grade')}
                className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-colors ${view === 'grade' ? 'bg-[#c9a96e] text-[#1a1207]' : 'text-[#94918a] hover:text-[#f0eee8]'}`}
              >Grade</button>
            </div>
          </div>
          {/* Week nav */}
          <div className="flex items-center justify-between">
            <button onClick={() => setWeekOffset(w => w - 1)} className="p-1.5 rounded-lg bg-[#1e1e24] border border-[#2a2a30] text-[#94918a] hover:text-[#f0eee8]">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-center">
              <span className="text-xs font-medium text-[#f0eee8]">{fmtDay(days[0])} – {fmtDay(days[13])}</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setWeekOffset(0)} className="px-2 py-1 text-[10px] font-medium rounded-md bg-[#1e1e24] border border-[#2a2a30] text-[#c9a96e] hover:text-[#dbc192]">Hoje</button>
              <button onClick={() => setWeekOffset(w => w + 1)} className="p-1.5 rounded-lg bg-[#1e1e24] border border-[#2a2a30] text-[#94918a] hover:text-[#f0eee8]">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-[#c9a96e]" /></div>
      ) : (
        <div className="max-w-3xl mx-auto px-3 py-4 space-y-4">

          {/* ═══════════ LISTA VIEW (mobile-friendly) ═══════════ */}
          {view === 'lista' && (
            <>
              {APARTMENTS.map(apt => {
                const c = APT_COLORS[apt]
                const aptReservations = reservationsByApt[apt] || []
                const free = freeDaysByApt[apt] || []

                return (
                  <div key={apt} className={`rounded-xl border ${c.border} overflow-hidden`}>
                    {/* Apartment header */}
                    <div className={`${c.bg} px-3 py-2 flex items-center justify-between`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                        <span className={`text-sm font-bold ${c.accent}`}>Apt {apt}</span>
                      </div>
                      {free.length > 0 && (
                        <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
                          {free.length} {free.length === 1 ? 'dia livre' : 'dias livres'}
                        </span>
                      )}
                    </div>

                    {/* Reservations list */}
                    <div className="bg-[#16161a] divide-y divide-[#2a2a30]/50">
                      {aptReservations.length === 0 ? (
                        <div className="px-3 py-4 text-center">
                          <span className="text-xs text-emerald-400 font-medium">Totalmente livre neste período</span>
                        </div>
                      ) : (
                        aptReservations.map((r, idx) => {
                          const isActive = r.checkin <= today && r.checkout > today
                          const isUpcoming = r.checkin > today
                          const isPast = r.checkout <= today

                          return (
                            <div key={idx} className={`px-3 py-2.5 ${isActive ? 'bg-red-500/5 border-l-2 border-l-red-400' : isPast ? 'opacity-50' : ''}`}>
                              {/* Row 1: Guest name + status */}
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-sm font-semibold text-[#f0eee8] truncate max-w-[60%]">
                                  {r.guest_name || 'Hóspede'}
                                </span>
                                {isActive && (
                                  <span className="text-[9px] font-bold uppercase tracking-wider bg-red-500/15 text-red-400 border border-red-500/25 rounded-full px-2 py-0.5">Hospedado</span>
                                )}
                                {isUpcoming && (
                                  <span className="text-[9px] font-bold uppercase tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/25 rounded-full px-2 py-0.5">Próximo</span>
                                )}
                                {isPast && (
                                  <span className="text-[9px] font-bold uppercase tracking-wider bg-[#94918a]/15 text-[#94918a] border border-[#94918a]/25 rounded-full px-2 py-0.5">Saiu</span>
                                )}
                              </div>

                              {/* Row 2: Dates + details */}
                              <div className="flex items-center gap-3 flex-wrap">
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="h-3 w-3 text-[#94918a]" />
                                  <span className="text-xs text-[#f0eee8]">
                                    <span className="text-blue-400 font-medium">{fmtDateFull(r.checkin)}</span>
                                    <ArrowRight className="inline h-2.5 w-2.5 mx-1 text-[#94918a]" />
                                    <span className="text-amber-400 font-medium">{fmtDateFull(r.checkout)}</span>
                                  </span>
                                </div>
                              </div>

                              {/* Row 3: Nights + guests + source */}
                              <div className="flex items-center gap-3 mt-1.5">
                                {(r.nights !== undefined && r.nights > 0) && (
                                  <span className="text-[10px] text-[#94918a]">
                                    {r.nights} {r.nights === 1 ? 'noite' : 'noites'}
                                  </span>
                                )}
                                {(r.guests !== undefined && r.guests > 0) && (
                                  <span className="flex items-center gap-0.5 text-[10px] text-[#94918a]">
                                    <Users className="h-2.5 w-2.5" /> {r.guests} {r.guests === 1 ? 'hóspede' : 'hóspedes'}
                                  </span>
                                )}
                                {r.source && (
                                  <span className="text-[10px] text-[#94918a]/70 capitalize">{r.source}</span>
                                )}
                              </div>
                            </div>
                          )
                        })
                      )}

                      {/* Free days for repairs */}
                      {free.length > 0 && (
                        <div className="px-3 py-2 bg-emerald-500/5">
                          <div className="flex items-center gap-1 mb-1">
                            <Wrench className="h-3 w-3 text-emerald-400" />
                            <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Dias livres</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {free.map((d, i) => (
                              <span key={i} className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded px-1.5 py-0.5 font-medium">
                                {DAYS_LABEL[d.getDay()]} {d.getDate()}/{d.getMonth() + 1}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </>
          )}

          {/* ═══════════ GRADE VIEW (calendar grid) ═══════════ */}
          {view === 'grade' && (
            <>
              {/* Legend */}
              <div className="flex items-center gap-3 flex-wrap text-[10px]">
                <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-emerald-400" /><span className="text-[#94918a]">Livre</span></div>
                <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-red-400" /><span className="text-[#94918a]">Ocupado</span></div>
                <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-blue-400" /><span className="text-[#94918a]">Check-in</span></div>
                <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-amber-400" /><span className="text-[#94918a]">Check-out</span></div>
                <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-purple-400" /><span className="text-[#94918a]">Troca</span></div>
              </div>

              {[0, 1].map(weekIdx => {
                const weekDays = days.slice(weekIdx * 7, weekIdx * 7 + 7)
                return (
                  <div key={weekIdx}>
                    <h2 className="text-[10px] font-semibold text-[#94918a] uppercase tracking-wider mb-1.5">
                      {fmtDay(weekDays[0])} – {fmtDay(weekDays[6])}
                    </h2>
                    <div className="bg-[#16161a] border border-[#2a2a30] rounded-xl overflow-x-auto">
                      <table className="w-full min-w-[360px]">
                        <thead>
                          <tr className="border-b border-[#2a2a30]">
                            <th className="py-1.5 px-2 text-left text-[10px] text-[#94918a] font-medium w-[52px]">Apt</th>
                            {weekDays.map((d, i) => {
                              const isT = dateStr(d) === today
                              return (
                                <th key={i} className={`py-1.5 text-center ${isT ? 'bg-[#c9a96e]/8' : ''}`}>
                                  <div className={`text-[9px] font-medium ${isT ? 'text-[#c9a96e]' : 'text-[#94918a]'}`}>{DAYS_LABEL[d.getDay()]}</div>
                                  <div className={`text-[11px] font-bold ${isT ? 'text-[#c9a96e]' : 'text-[#f0eee8]'}`}>{d.getDate()}</div>
                                </th>
                              )
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {APARTMENTS.map(apt => {
                            const c = APT_COLORS[apt]
                            return (
                              <tr key={apt} className="border-b border-[#2a2a30]/30 last:border-b-0">
                                <td className={`px-2 py-2 ${c.accent} text-[11px] font-bold`}>
                                  <div className="flex items-center gap-1">
                                    <div className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                                    {apt}
                                  </div>
                                </td>
                                {weekDays.map((d, i) => {
                                  const s = getStatus(apt, d)
                                  const isT = dateStr(d) === today
                                  const dotColor =
                                    s.type === 'free' ? 'bg-emerald-400' :
                                    s.type === 'occupied' ? 'bg-red-400' :
                                    s.type === 'checkin' ? 'bg-blue-400' :
                                    s.type === 'checkout' ? 'bg-amber-400' :
                                    'bg-purple-400'
                                  return (
                                    <td key={i} className={`py-2 text-center ${isT ? 'bg-[#c9a96e]/5' : ''}`}>
                                      <div className={`w-3 h-3 rounded-full ${dotColor} mx-auto`} />
                                    </td>
                                  )
                                })}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })}

              {/* Free days summary */}
              <div className="bg-[#16161a] border border-emerald-500/15 rounded-xl p-3">
                <h3 className="text-xs font-semibold text-emerald-400 mb-2">Dias livres para reparos</h3>
                <div className="space-y-1.5">
                  {APARTMENTS.map(apt => {
                    const free = freeDaysByApt[apt] || []
                    const c = APT_COLORS[apt]
                    return (
                      <div key={apt} className="flex items-start gap-2">
                        <span className={`text-[11px] font-bold ${c.accent} min-w-[36px]`}>{apt}</span>
                        {free.length === 0
                          ? <span className="text-[10px] text-[#94918a]">Sem dias livres</span>
                          : <div className="flex flex-wrap gap-1">
                              {free.map((d, i) => (
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
            </>
          )}

        </div>
      )}

      <footer className="text-center py-4 text-[10px] text-[#94918a]/50">
        Sua Casa Leblon · Equipe
      </footer>
    </div>
  )
}
