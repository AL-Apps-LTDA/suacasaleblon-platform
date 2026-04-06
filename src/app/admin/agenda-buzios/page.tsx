'use client'

import { useState, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Loader2, Phone, Users, MapPin } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { fmtBRL } from '@/lib/types'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')

const BUZIOS_APTS = ['BZ01', 'BZ02'] as const
const APT_META: Record<string, { label: string; owner: string; icon: string; color: string; colorBg: string; colorBorder: string }> = {
  BZ01: { label: 'Casa 01', owner: 'Gilberto', icon: '\u{1F3E0}', color: 'text-[#c9a96e]', colorBg: 'bg-[#c9a96e]/10', colorBorder: 'border-[#c9a96e]/25' },
  BZ02: { label: 'Casa 02', owner: 'Meri', icon: '\u{1F3E1}', color: 'text-[#7cb3a3]', colorBg: 'bg-[#7cb3a3]/10', colorBorder: 'border-[#7cb3a3]/25' },
}

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const WEEKDAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

interface Reservation {
  id: number
  apartment_code: string
  guest_name: string
  checkin: string
  checkout: string
  source: string
  total_value: number
  guests?: number
  guest_phone?: string
}

function fmtDateBR(iso: string) {
  if (!iso) return { day: '—', weekday: '' }
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return {
    day: `${String(d).padStart(2, '0')} ${MONTHS[m - 1]?.slice(0, 3) || ''}`,
    weekday: WEEKDAYS[dt.getDay()],
  }
}

function initials(name: string) {
  if (!name || name === '—') return '?'
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function isCurrent(checkin: string, checkout: string) {
  const today = new Date().toLocaleDateString('sv-SE')
  return checkin <= today && checkout > today
}

function PropertyCard({ code, reservations }: { code: string; reservations: Reservation[] }) {
  const meta = APT_META[code] || { label: code, owner: '—', icon: '\u{1F3E0}', color: 'text-[rgb(var(--adm-accent))]', colorBg: 'bg-[rgb(var(--adm-accent)/0.10)]', colorBorder: 'border-[rgb(var(--adm-accent)/0.20)]' }
  const activeCount = reservations.filter(r => r.guest_name && r.guest_name !== '—').length

  return (
    <div className="bg-[rgb(var(--adm-surface))] border border-[rgb(var(--adm-border))] rounded-xl overflow-hidden">
      {/* Color stripe */}
      <div className={`h-1 ${code === 'BZ01' ? 'bg-gradient-to-r from-[#a8893f] via-[#dbc192] to-[#a8893f]' : 'bg-gradient-to-r from-[#5a9485] via-[#9fd4c4] to-[#5a9485]'}`} />

      {/* Card header */}
      <div className="flex items-center gap-4 px-5 py-4 border-b border-[rgb(var(--adm-border))]">
        <div className={`w-12 h-12 rounded-xl ${meta.colorBg} ${meta.colorBorder} border flex items-center justify-center text-xl`}>
          {meta.icon}
        </div>
        <div className="flex-1">
          <h2 className={`text-sm font-bold ${meta.color}`}>{meta.label} — {meta.owner}</h2>
          <p className="text-[10px] text-[rgb(var(--adm-muted))] mt-0.5">Responsável: {meta.owner}</p>
        </div>
        <span className="text-[10px] text-[rgb(var(--adm-muted))] bg-[rgb(var(--adm-elevated))] border border-[rgb(var(--adm-border))] rounded-full px-3 py-1">
          {activeCount} reserva{activeCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[rgb(var(--adm-border))]">
              <th className="text-left py-2.5 px-4 text-[rgb(var(--adm-muted))] font-semibold text-[10px] uppercase tracking-wider">Entrada</th>
              <th className="text-left py-2.5 px-4 text-[rgb(var(--adm-muted))] font-semibold text-[10px] uppercase tracking-wider">Saída</th>
              <th className="text-left py-2.5 px-4 text-[rgb(var(--adm-muted))] font-semibold text-[10px] uppercase tracking-wider">Hóspede</th>
              <th className="text-left py-2.5 px-4 text-[rgb(var(--adm-muted))] font-semibold text-[10px] uppercase tracking-wider hidden sm:table-cell">Telefone</th>
              <th className="text-center py-2.5 px-4 text-[rgb(var(--adm-muted))] font-semibold text-[10px] uppercase tracking-wider">Hóspedes</th>
              <th className="text-left py-2.5 px-4 text-[rgb(var(--adm-muted))] font-semibold text-[10px] uppercase tracking-wider">Fonte</th>
              <th className="text-right py-2.5 px-4 text-[rgb(var(--adm-muted))] font-semibold text-[10px] uppercase tracking-wider">Valor</th>
            </tr>
          </thead>
          <tbody>
            {reservations.length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center text-[rgb(var(--adm-muted))] text-xs">Nenhuma reserva neste período</td></tr>
            ) : reservations.map(r => {
              const cin = fmtDateBR(r.checkin)
              const cout = fmtDateBR(r.checkout)
              const current = isCurrent(r.checkin, r.checkout)
              const avatarColor = code === 'BZ01'
                ? (current ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' : 'bg-[#c9a96e]/15 text-[#dbc192] border-[#c9a96e]/25')
                : (current ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' : 'bg-[#7cb3a3]/15 text-[#9fd4c4] border-[#7cb3a3]/25')

              return (
                <tr key={r.id} className={`border-b border-[rgb(var(--adm-border)/0.30)] last:border-0 transition-colors ${current ? 'bg-[rgb(var(--adm-accent)/0.04)]' : 'hover:bg-[rgb(var(--adm-elevated))]'}`}>
                  {/* Entrada */}
                  <td className="py-3 px-4">
                    {current && <div className="absolute left-0 w-[3px] h-full bg-[rgb(var(--adm-accent))] rounded-r" />}
                    <div className="font-semibold text-[rgb(var(--adm-text))]">{cin.day}</div>
                    <div className="text-[10px] text-[rgb(var(--adm-muted))]">{cin.weekday}</div>
                  </td>
                  {/* Saída */}
                  <td className="py-3 px-4">
                    <div className="font-semibold text-[rgb(var(--adm-text))]">{cout.day}</div>
                    <div className="text-[10px] text-[rgb(var(--adm-muted))]">{cout.weekday}</div>
                  </td>
                  {/* Hóspede */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-full ${avatarColor} border flex items-center justify-center text-[10px] font-bold shrink-0`}>
                        {initials(r.guest_name)}
                      </div>
                      <span className="font-medium text-[rgb(var(--adm-text))]">{r.guest_name || '—'}</span>
                    </div>
                  </td>
                  {/* Telefone */}
                  <td className="py-3 px-4 hidden sm:table-cell">
                    {r.guest_phone ? (
                      <a href={`tel:${r.guest_phone.replace(/\D/g, '')}`} className="text-[rgb(var(--adm-muted))] hover:text-[rgb(var(--adm-accent))] transition-colors flex items-center gap-1">
                        <Phone className="h-3 w-3" />{r.guest_phone}
                      </a>
                    ) : <span className="text-[rgb(var(--adm-border))]">—</span>}
                  </td>
                  {/* Nº Hóspedes */}
                  <td className="py-3 px-4 text-center">
                    {r.guests && r.guests > 0 ? (
                      <span className="inline-flex items-center gap-1 bg-[rgb(var(--adm-elevated))] border border-[rgb(var(--adm-border))] rounded-full px-2 py-0.5 text-[10px] font-semibold text-[rgb(var(--adm-text))]">
                        <Users className="h-2.5 w-2.5" /> {r.guests}
                      </span>
                    ) : <span className="text-[rgb(var(--adm-border))]">—</span>}
                  </td>
                  {/* Fonte */}
                  <td className="py-3 px-4">
                    {r.source ? (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                        r.source.toLowerCase().includes('airbnb') ? 'bg-pink-500/15 text-pink-400' :
                        r.source.toLowerCase().includes('booking') ? 'bg-blue-500/15 text-blue-400' :
                        'bg-[rgb(var(--adm-accent)/0.15)] text-[rgb(var(--adm-accent))]'
                      }`}>{r.source}</span>
                    ) : <span className="text-[rgb(var(--adm-border))]">—</span>}
                  </td>
                  {/* Valor */}
                  <td className="py-3 px-4 text-right font-mono font-medium text-emerald-400">
                    {r.total_value ? fmtBRL(r.total_value) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function AgendaBuziosPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(new Date().getMonth())
  const [year, setYear] = useState(new Date().getFullYear())

  useEffect(() => {
    async function load() {
      setLoading(true)
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
      const endMonth = month + 2 > 12 ? 1 : month + 2
      const endYear = month + 2 > 12 ? year + 1 : year
      const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`

      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .in('apartment_code', BUZIOS_APTS)
        .or(`checkin.gte.${startDate},checkout.gte.${startDate}`)
        .lt('checkin', endDate)
        .order('checkin')

      if (!error && data) setReservations(data)
      setLoading(false)
    }
    load()
  }, [month, year])

  const grouped = useMemo(() => {
    const map: Record<string, Reservation[]> = {}
    for (const code of BUZIOS_APTS) {
      map[code] = reservations
        .filter(r => r.apartment_code === code)
        .sort((a, b) => a.checkin.localeCompare(b.checkin))
    }
    return map
  }, [reservations])

  const currentCount = reservations.filter(r => isCurrent(r.checkin, r.checkout)).length

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[rgb(var(--adm-text))]">Agenda Búzios</h1>
          <p className="text-xs text-[rgb(var(--adm-muted))] mt-0.5">Casa 01 — Gilberto &middot; Casa 02 — Meri</p>
        </div>
        <div className="flex items-center gap-2">
          {currentCount > 0 && (
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 text-[10px] text-emerald-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {currentCount} hóspede{currentCount !== 1 ? 's' : ''} agora
            </div>
          )}
          <div className="flex items-center gap-1.5 bg-[rgb(var(--adm-elevated))] rounded-lg border border-[rgb(var(--adm-border))] px-1">
            <button onClick={() => setMonth(m => m > 0 ? m - 1 : 11)} className="p-1.5 text-[rgb(var(--adm-muted))] hover:text-[rgb(var(--adm-text))]"><ChevronLeft className="h-4 w-4" /></button>
            <span className="text-sm font-medium text-[rgb(var(--adm-text))] min-w-[120px] text-center">{MONTHS[month]} {year}</span>
            <button onClick={() => setMonth(m => m < 11 ? m + 1 : 0)} className="p-1.5 text-[rgb(var(--adm-muted))] hover:text-[rgb(var(--adm-text))]"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="bg-[rgb(var(--adm-elevated))] border border-[rgb(var(--adm-border))] rounded-lg px-3 py-2 text-xs font-medium text-[rgb(var(--adm-text))]">
            {[2025, 2026, 2027, 2028, 2029, 2030].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-[rgb(var(--adm-accent))]" />
          <span className="ml-2 text-sm text-[rgb(var(--adm-muted))]">Carregando agenda...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {BUZIOS_APTS.map(code => (
            <PropertyCard key={code} code={code} reservations={grouped[code] || []} />
          ))}
        </div>
      )}

      {/* Footer */}
      <p className="text-[10px] text-[rgb(var(--adm-muted))] text-center">
        Dados sincronizados via Hospitable
      </p>
    </div>
  )
}
