'use client'

import { useState, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Loader2, Users, Sparkles, Calendar, ExternalLink } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
const APARTMENTS = ['103', '403', '102', '303', '334A']
const APT_COLORS: Record<string, string> = { '103': 'bg-blue-500', '403': 'bg-emerald-500', '102': 'bg-purple-500', '303': 'bg-orange-500', '334A': 'bg-pink-500' }
const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

interface Reservation {
  id: number
  apartment_code: string
  guest_name: string
  checkin: string
  checkout: string
  source: string
  total_value: number
  status: string
}

interface Cleaning {
  id: number
  apartment_code: string
  scheduled_date: string
  status: string
  type: string
  cleaner_name: string
}

export default function AgendaPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [cleanings, setCleanings] = useState<Cleaning[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(new Date().getMonth())
  const [year] = useState(2026)
  const [filterApt, setFilterApt] = useState('all')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
      const endDate = `${year}-${String(month + 2 > 12 ? 1 : month + 2).padStart(2, '0')}-01`

      const [resResult, cleanResult, directResult] = await Promise.allSettled([
        supabase.from('reservations').select('*').or(`checkin.gte.${startDate},checkout.gte.${startDate}`).lt('checkin', endDate).order('checkin'),
        supabase.from('cleanings').select('*').gte('scheduled_date', startDate).lt('scheduled_date', endDate).order('scheduled_date'),
        supabase.from('direct_reservations').select('*').or(`checkin.gte.${startDate},checkout.gte.${startDate}`).lt('checkin', endDate).order('checkin'),
      ])

      const allRes: Reservation[] = []
      if (resResult.status === 'fulfilled' && resResult.value.data) {
        allRes.push(...resResult.value.data.map((r: any) => ({ ...r, source: r.source || 'hospitable' })))
      }
      if (directResult.status === 'fulfilled' && directResult.value.data) {
        allRes.push(...directResult.value.data.map((r: any) => ({ ...r, source: r.source || 'direto' })))
      }
      setReservations(allRes)

      if (cleanResult.status === 'fulfilled' && cleanResult.value.data) {
        setCleanings(cleanResult.value.data)
      }
      setLoading(false)
    }
    load()
  }, [month, year])

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days: (number | null)[] = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let i = 1; i <= daysInMonth; i++) days.push(i)
    return days
  }, [month, year])

  function getDateStr(day: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  function getEventsForDay(day: number) {
    const dateStr = getDateStr(day)
    const dayRes = reservations.filter(r => {
      if (filterApt !== 'all' && r.apartment_code !== filterApt) return false
      return r.checkin <= dateStr && r.checkout > dateStr
    })
    const dayClean = cleanings.filter(c => {
      if (filterApt !== 'all' && c.apartment_code !== filterApt) return false
      return c.scheduled_date === dateStr
    })
    return { reservations: dayRes, cleanings: dayClean }
  }

  const today = new Date().toLocaleDateString('sv-SE')

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#f0eee8]">Agenda</h1>
          <p className="text-xs text-[#94918a] mt-0.5">Calendário de reservas e limpezas</p>
        </div>
        <div className="flex items-center gap-1.5 bg-[#1e1e24] rounded-lg border border-[#2a2a30] px-1">
          <button onClick={() => setMonth(m => m > 0 ? m - 1 : 11)} className="p-1.5 text-[#94918a] hover:text-[#f0eee8]"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-sm font-medium text-[#f0eee8] min-w-[120px] text-center">{MONTHS[month]} {year}</span>
          <button onClick={() => setMonth(m => m < 11 ? m + 1 : 0)} className="p-1.5 text-[#94918a] hover:text-[#f0eee8]"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Apartment filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex rounded-lg border border-[#2a2a30] overflow-hidden text-xs">
          <button onClick={() => setFilterApt('all')} className={`px-4 py-2 font-medium ${filterApt === 'all' ? 'bg-[#c9a96e] text-[#1a1207]' : 'bg-[#1e1e24] text-[#94918a] hover:text-[#f0eee8]'}`}>Todos</button>
          {APARTMENTS.map(a => (
            <button key={a} onClick={() => setFilterApt(a)} className={`px-3 py-2 font-medium ${filterApt === a ? 'bg-[#c9a96e] text-[#1a1207]' : 'bg-[#1e1e24] text-[#94918a] hover:text-[#f0eee8]'}`}>{a}</button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          {APARTMENTS.map(a => (
            <div key={a} className="flex items-center gap-1">
              <div className={`w-2.5 h-2.5 rounded-sm ${APT_COLORS[a]}`} />
              <span className="text-[#94918a]">{a}</span>
            </div>
          ))}
          <div className="flex items-center gap-1">
            <Sparkles className="h-2.5 w-2.5 text-yellow-400" />
            <span className="text-[#94918a]">Limpeza</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-[#c9a96e]" /></div>
      ) : (
        <div className="bg-[#16161a] border border-[#2a2a30] rounded-xl overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-[#2a2a30]">
            {DAYS.map(d => (
              <div key={d} className="py-2 text-center text-[10px] font-medium text-[#94918a] uppercase tracking-wider">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-[#2a2a30]/30 bg-[#0c0c0f]/30" />

              const dateStr = getDateStr(day)
              const isToday = dateStr === today
              const { reservations: dayRes, cleanings: dayClean } = getEventsForDay(day)

              return (
                <div key={day} className={`min-h-[80px] border-b border-r border-[#2a2a30]/30 p-1 ${isToday ? 'bg-[#c9a96e]/5' : 'hover:bg-[#1e1e24]/50'}`}>
                  <div className={`text-[11px] font-medium mb-0.5 ${isToday ? 'text-[#c9a96e] font-bold' : 'text-[#94918a]'}`}>{day}</div>
                  <div className="space-y-0.5">
                    {dayRes.map((r, ri) => (
                      <div key={ri} className={`${APT_COLORS[r.apartment_code] || 'bg-gray-500'} bg-opacity-20 rounded px-1 py-0.5 text-[8px] leading-tight truncate border-l-2 ${APT_COLORS[r.apartment_code]?.replace('bg-', 'border-') || 'border-gray-500'}`}>
                        <span className="text-[#f0eee8] font-medium">{r.apartment_code}</span>
                        <span className="text-[#94918a] ml-1">{r.guest_name?.split(' ')[0] || ''}</span>
                      </div>
                    ))}
                    {dayClean.map((c, ci) => (
                      <div key={`c-${ci}`} className="bg-yellow-500/10 rounded px-1 py-0.5 text-[8px] leading-tight truncate flex items-center gap-0.5">
                        <Sparkles className="h-2 w-2 text-yellow-400 shrink-0" />
                        <span className="text-yellow-400">{c.apartment_code}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Today's events sidebar */}
      <div className="bg-[#16161a] border border-[#c9a96e]/20 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-[#f0eee8] flex items-center gap-2 mb-3"><Calendar className="h-4 w-4 text-[#c9a96e]" /> Hoje — {new Date().toLocaleDateString('pt-BR')}</h3>
        {(() => {
          const todayDay = new Date().getDate()
          if (new Date().getMonth() !== month) return <p className="text-xs text-[#94918a]">Navegue para o mês atual para ver eventos de hoje</p>
          const { reservations: tRes, cleanings: tClean } = getEventsForDay(todayDay)
          if (tRes.length === 0 && tClean.length === 0) return <p className="text-xs text-[#94918a]">Nenhum evento hoje</p>
          return (
            <div className="space-y-2">
              {tRes.map((r, i) => (
                <div key={i} className="flex items-center justify-between bg-[#1e1e24] rounded-lg p-2.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-8 rounded ${APT_COLORS[r.apartment_code]}`} />
                    <div>
                      <span className="text-xs font-medium text-[#f0eee8]">Apt {r.apartment_code}</span>
                      <span className="text-[10px] text-[#94918a] block">{r.guest_name} • {r.checkin} → {r.checkout}</span>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-semibold">{r.source}</span>
                </div>
              ))}
              {tClean.map((c, i) => (
                <div key={`c-${i}`} className="flex items-center justify-between bg-[#1e1e24] rounded-lg p-2.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-yellow-400" />
                    <div>
                      <span className="text-xs font-medium text-[#f0eee8]">Limpeza Apt {c.apartment_code}</span>
                      <span className="text-[10px] text-[#94918a] block">{c.type} • {c.cleaner_name || 'Sem faxineira'}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${c.status === 'concluida' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-blue-500/15 text-blue-400'}`}>{c.status}</span>
                </div>
              ))}
            </div>
          )
        })()}
      </div>
    </div>
  )
}
