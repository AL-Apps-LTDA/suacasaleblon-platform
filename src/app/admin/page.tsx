'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  Loader2, RefreshCw, Building2, TrendingUp, TrendingDown,
  ChevronLeft, ChevronRight,
  Calendar, Users, DollarSign, Briefcase, UserCheck, ExternalLink,
  BarChart3, Hotel, Percent, BedDouble, Search
} from 'lucide-react'
import type { ApartmentSummary, MonthData, BizExpense } from '@/lib/types'
import { parseBRL, fmtBRL, getMonthIndex, MONTHS_SHORT, MONTHS_FULL, APARTMENTS } from '@/lib/types'

// Format a date value: "2026-03-05" → "05/03/2026", or day number "5" + month context → "05/03/2026"
function fmtDate(val: string, monthIdx?: number, year = 2026): string {
  if (val.includes('-')) {
    const [y, m, d] = val.split('-')
    return `${d}/${m}/${y}`
  }
  const day = parseInt(val)
  if (!isNaN(day) && monthIdx !== undefined) {
    return `${String(day).padStart(2, '0')}/${String(monthIdx + 1).padStart(2, '0')}/${year}`
  }
  return val
}

function filterMonths(months: MonthData[], filter: string, sel: number): MonthData[] {
  if (filter === 'all') return months
  if (filter === 'ytd') return months.filter(m => getMonthIndex(m.month) <= new Date().getMonth())
  if (filter === 'month') return months.filter(m => getMonthIndex(m.month) === sel)
  return months
}
function sumF(months: MonthData[], f: 'receitaTotal'|'despesaTotal'|'resultado'|'managerCommission'|'repassar') {
  return months.reduce((s, m) => s + parseBRL(m[f]), 0)
}
function ownerPart(m: MonthData) { return parseBRL(m.resultado) - parseBRL(m.repassar) }

// Count occupied nights from reservations in filtered months
function countNights(months: MonthData[]): number {
  let nights = 0
  for (const m of months) {
    for (const r of m.reservations) {
      if (r.source === 'adjustment') continue
      const n = (r as any).nights
      if (n && n > 0) { nights += n; continue }
      const ci = parseInt(r.checkin), co = parseInt(r.checkout)
      if (!isNaN(ci) && !isNaN(co) && co > ci) nights += (co - ci)
    }
  }
  return nights
}

// Available nights in period
function availableNights(filter: string, sel: number, aptCount: number): number {
  const now = new Date()
  const cm = now.getMonth()
  if (filter === 'month') {
    const daysInMonth = new Date(2026, sel + 1, 0).getDate()
    return daysInMonth * aptCount
  }
  if (filter === 'ytd') {
    let total = 0
    for (let i = 0; i <= cm; i++) total += new Date(2026, i + 1, 0).getDate()
    return total * aptCount
  }
  // full year
  return 365 * aptCount
}

function MetricCard({ label, value, sub, icon: Icon, color = 'text-[rgb(var(--adm-text))]', trend }: {
  label: string; value: string; sub?: string; icon: any; color?: string; trend?: { value: string; positive: boolean } | null
}) {
  return (
    <div className="bg-[rgb(var(--adm-surface))] border border-[rgb(var(--adm-border))] rounded-xl p-4 hover:border-[rgb(var(--adm-accent)/0.20)] transition-all">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] text-[rgb(var(--adm-muted))] font-medium uppercase tracking-wider">{label}</p>
        <div className="w-7 h-7 rounded-lg bg-[rgb(var(--adm-accent)/0.10)] flex items-center justify-center">
          <Icon className="h-3.5 w-3.5 text-[rgb(var(--adm-accent))]" />
        </div>
      </div>
      <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
      <div className="flex items-center justify-between mt-1">
        {sub && <p className="text-[10px] text-[rgb(var(--adm-muted))]">{sub}</p>}
        {trend && (
          <div className={`flex items-center gap-0.5 text-[10px] font-semibold ${trend.positive ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend.positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend.value}
          </div>
        )}
      </div>
    </div>
  )
}

function MiniChart({ data, label }: { data: { month: string; value: number }[]; label: string }) {
  const max = Math.max(...data.map(d => Math.abs(d.value)), 1)
  return (
    <div className="bg-[rgb(var(--adm-surface))] border border-[rgb(var(--adm-border))] rounded-xl p-4">
      <p className="text-[10px] text-[rgb(var(--adm-muted))] font-medium uppercase tracking-wider mb-3">{label}</p>
      <div className="flex items-end gap-[3px] h-16">
        {data.map((d, i) => {
          const h = Math.max((Math.abs(d.value) / max) * 100, 4)
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1" title={`${d.month}: ${fmtBRL(d.value)}`}>
              <div className={`w-full rounded-t ${d.value > 0 ? 'bg-emerald-400/70' : d.value < 0 ? 'bg-red-400/70' : 'bg-[rgb(var(--adm-border)/0.40)]'}`} style={{ height: `${h}%` }} />
              <span className="text-[7px] text-[rgb(var(--adm-muted))] leading-none">{d.month.slice(0, 3)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DualBarChart({ revenueData, expenseData, label }: { revenueData: { month: string; value: number }[]; expenseData: { month: string; value: number }[]; label: string }) {
  const allVals = [...revenueData.map(d => d.value), ...expenseData.map(d => Math.abs(d.value))]
  const max = Math.max(...allVals, 1)
  const gridLines = [0.25, 0.5, 0.75, 1].map(pct => Math.round(max * pct))
  return (
    <div className="bg-[rgb(var(--adm-surface))] border border-[rgb(var(--adm-border))] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] text-[rgb(var(--adm-muted))] font-medium uppercase tracking-wider">{label}</p>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[9px] text-[rgb(var(--adm-muted))]"><span className="w-2 h-2 rounded-sm bg-emerald-400/70" />Receita</span>
          <span className="flex items-center gap-1 text-[9px] text-[rgb(var(--adm-muted))]"><span className="w-2 h-2 rounded-sm bg-red-400/70" />Despesa</span>
        </div>
      </div>
      <div className="relative">
        {/* Grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none" style={{ bottom: '20px' }}>
          {gridLines.reverse().map((v, i) => (
            <div key={i} className="flex items-center gap-2 border-b border-[rgb(var(--adm-border)/0.15)]">
              <span className="text-[8px] text-[rgb(var(--adm-muted)/0.50)] font-mono w-10 text-right shrink-0">{v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0)}</span>
            </div>
          ))}
        </div>
        {/* Bars */}
        <div className="flex items-end gap-1 h-40 pl-12">
          {revenueData.map((d, i) => {
            const rH = max > 0 ? Math.max((d.value / max) * 100, d.value > 0 ? 3 : 0) : 0
            const eH = max > 0 ? Math.max((Math.abs(expenseData[i]?.value || 0) / max) * 100, expenseData[i]?.value ? 3 : 0) : 0
            const cm = new Date().getMonth()
            const isCurrent = i === cm
            return (
              <div key={i} className={`flex-1 flex flex-col items-center justify-end gap-0.5 ${isCurrent ? 'opacity-100' : 'opacity-80'}`} title={`${d.month}: Rec ${fmtBRL(d.value)} | Desp ${fmtBRL(Math.abs(expenseData[i]?.value || 0))}`}>
                <div className="flex items-end gap-[2px] w-full justify-center" style={{ height: '100%' }}>
                  <div className={`flex-1 max-w-[14px] rounded-t transition-all ${isCurrent ? 'bg-emerald-400' : 'bg-emerald-400/60'}`} style={{ height: `${rH}%` }} />
                  <div className={`flex-1 max-w-[14px] rounded-t transition-all ${isCurrent ? 'bg-red-400' : 'bg-red-400/50'}`} style={{ height: `${eH}%` }} />
                </div>
                <span className={`text-[8px] leading-none mt-1 ${isCurrent ? 'text-[rgb(var(--adm-accent))] font-bold' : 'text-[rgb(var(--adm-muted))]'}`}>{d.month.slice(0, 3)}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function AptBreakdownChart({ apts, filter, sel }: { apts: ApartmentSummary[]; filter: string; sel: number }) {
  const aptData = apts.map(a => {
    const f = filterMonths(a.months || [], filter, sel)
    return { name: a.name, rec: sumF(f, 'receitaTotal'), desp: sumF(f, 'despesaTotal') }
  }).sort((a, b) => b.rec - a.rec)
  const max = Math.max(...aptData.map(d => d.rec), 1)
  const colors = ['bg-emerald-400', 'bg-sky-400', 'bg-violet-400', 'bg-amber-400', 'bg-rose-400', 'bg-teal-400']
  return (
    <div className="bg-[rgb(var(--adm-surface))] border border-[rgb(var(--adm-border))] rounded-xl p-5">
      <p className="text-[10px] text-[rgb(var(--adm-muted))] font-medium uppercase tracking-wider mb-4">Receita por Apartamento</p>
      <div className="space-y-2.5">
        {aptData.map((d, i) => {
          const pct = max > 0 ? (d.rec / max) * 100 : 0
          return (
            <div key={d.name} className="flex items-center gap-3">
              <span className="text-[11px] font-medium text-[rgb(var(--adm-text))] w-10 shrink-0">{d.name}</span>
              <div className="flex-1 h-5 bg-[rgb(var(--adm-elevated))] rounded overflow-hidden relative">
                <div className={`h-full rounded ${colors[i % colors.length]}/60 transition-all`} style={{ width: `${Math.max(pct, 2)}%` }} />
                {pct > 20 && <span className="absolute inset-y-0 left-2 flex items-center text-[9px] font-mono font-bold text-white/90">{fmtBRL(d.rec)}</span>}
              </div>
              {pct <= 20 && <span className="text-[9px] font-mono text-[rgb(var(--adm-muted))] shrink-0">{fmtBRL(d.rec)}</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function fmtDateCol(val: string, monthIdx?: number): string {
  // If val looks like a full date (YYYY-MM-DD or DD/MM/YYYY), parse it
  if (val.includes('-') || val.includes('/')) {
    const d = new Date(val)
    if (!isNaN(d.getTime())) {
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
    }
  }
  // If val is just a day number, combine with month index
  const day = parseInt(val)
  if (!isNaN(day) && day >= 1 && day <= 31 && monthIdx !== undefined && monthIdx >= 0) {
    return `${String(day).padStart(2, '0')}/${String(monthIdx + 1).padStart(2, '0')}`
  }
  return val
}

function platformBadge(platform: string, source?: string) {
  // Determine display label and color based on platform or source
  const p = (platform || source || '').toLowerCase()
  let label = platform || source || ''
  let cls = 'bg-blue-500/15 text-blue-400'

  if (p.includes('airbnb')) { label = 'Airbnb'; cls = 'bg-rose-500/15 text-rose-400' }
  else if (p.includes('booking')) { label = 'Booking'; cls = 'bg-blue-600/15 text-blue-500' }
  else if (p === 'direct' || p === 'site') { label = 'Site'; cls = 'bg-[rgb(var(--adm-accent)/0.15)] text-[rgb(var(--adm-accent))]' }
  else if (p === 'whatsapp') { label = 'WhatsApp'; cls = 'bg-green-500/15 text-green-400' }
  else if (p === 'manual') { label = 'Manual'; cls = 'bg-violet-500/15 text-violet-400' }
  else if (p === 'airbnb_csv') { label = 'CSV'; cls = 'bg-orange-500/15 text-orange-400' }

  return <span className={`text-[8px] px-1.5 py-0.5 rounded font-semibold inline-block ${cls}`}>{label}</span>
}

function AptCard({ apt, filter, sel }: { apt: ApartmentSummary; filter: string; sel: number }) {
  const fm = useMemo(() => filterMonths(apt.months || [], filter, sel), [apt.months, filter, sel])
  const rec = sumF(fm, 'receitaTotal'), desp = sumF(fm, 'despesaTotal'), res = sumF(fm, 'resultado')
  const com = sumF(fm, 'managerCommission'), own = fm.reduce((s, m) => s + ownerPart(m), 0)
  const pct = (apt as any).commissionPct
  // Filter direct reservations by selected month (pro-rata overlap)
  const allDr = apt.directReservations || []
  const dr = useMemo(() => {
    if (filter !== 'month') return allDr
    return allDr.filter(r => {
      if (!r.checkin || !r.checkout) return false
      const ci = new Date(r.checkin.includes('/') ? r.checkin.split('/').reverse().join('-') : r.checkin)
      const co = new Date(r.checkout.includes('/') ? r.checkout.split('/').reverse().join('-') : r.checkout)
      const mStart = new Date(2026, sel, 1)
      const mEnd = new Date(2026, sel + 1, 0)
      return ci <= mEnd && co >= mStart
    })
  }, [allDr, filter, sel])

  const thCls = 'py-1.5 px-2 text-[9px] text-[rgb(var(--adm-muted))] font-semibold uppercase tracking-wider'
  const tdCls = 'py-1.5 px-2 text-[11px]'

  return (
    <div className="bg-[rgb(var(--adm-surface))] border border-[rgb(var(--adm-border))] rounded-xl hover:border-[rgb(var(--adm-accent)/0.30)] transition-all">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[rgb(var(--adm-accent)/0.15)] flex items-center justify-center"><Building2 className="h-3.5 w-3.5 text-[rgb(var(--adm-accent))]" /></div>
            <div>
              <span className="text-sm font-medium text-[rgb(var(--adm-text))]">Apt {apt.name}</span>
              {pct && <span className="ml-2 text-[8px] text-[rgb(var(--adm-muted))]">{(pct * 100).toFixed(0)}% comissão</span>}
            </div>
            {dr.length > 0 && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-[rgb(var(--adm-accent)/0.15)] text-[rgb(var(--adm-accent))] font-bold">{dr.length} diretas</span>}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-2">
          {[{ l: 'Receita', v: rec, c: 'text-emerald-400' }, { l: 'Despesa', v: desp, c: 'text-red-400' }, { l: 'Resultado', v: res, c: res >= 0 ? 'text-emerald-400' : 'text-red-400' }].map(({ l, v, c }) => (
            <div key={l} className="bg-[rgb(var(--adm-elevated))] rounded-lg p-2 text-center">
              <p className="text-[9px] text-[rgb(var(--adm-muted))] uppercase tracking-wider">{l}</p>
              <p className={`text-xs font-bold font-mono mt-0.5 ${c}`}>{fmtBRL(v)}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[rgb(var(--adm-accent)/0.5)] border border-[rgb(var(--adm-accent)/0.10)] rounded-lg p-1.5 text-center">
            <p className="text-[8px] text-[rgb(var(--adm-muted))] uppercase">Comissão Sua Casa</p>
            <p className="text-[10px] font-bold text-[rgb(var(--adm-accent))] font-mono">{fmtBRL(com)}</p>
          </div>
          <div className="bg-emerald-400/5 border border-emerald-400/10 rounded-lg p-1.5 text-center">
            <p className="text-[8px] text-[rgb(var(--adm-muted))] uppercase">Proprietário</p>
            <p className="text-[10px] font-bold text-emerald-400 font-mono">{fmtBRL(own)}</p>
          </div>
        </div>
        <div className="flex gap-[3px] h-6 items-end px-1 mt-2">
          {MONTHS_SHORT.map((lb, i) => {
            const md = (apt.months || []).find(m => getMonthIndex(m.month) === i)
            const v = md ? parseBRL(md.resultado) : 0
            const mx = Math.max(...(apt.months || []).map(m => Math.abs(parseBRL(m.resultado))), 1)
            const h = Math.max((Math.abs(v) / mx) * 100, 4)
            return <div key={lb} className="flex-1 flex flex-col justify-end" title={`${lb}: ${fmtBRL(v)}`}><div className={`w-full rounded-sm ${v > 0 ? 'bg-emerald-400/60' : v < 0 ? 'bg-red-400/60' : 'bg-[rgb(var(--adm-border)/0.30)]'}`} style={{ height: `${h}%` }} /></div>
          })}
        </div>
      </div>
        <div className="px-4 pb-4 space-y-3 border-t border-[rgb(var(--adm-border))] pt-3">
          {/* Direct Reservations Table */}
          {dr.length > 0 && (
            <div className="bg-[rgb(var(--adm-accent)/0.5)] border border-[rgb(var(--adm-accent)/0.20)] rounded-xl p-3">
              <h5 className="text-[10px] text-[rgb(var(--adm-accent))] font-semibold mb-2 uppercase flex items-center gap-1"><UserCheck className="h-3 w-3" /> Reservas Diretas ({dr.length})</h5>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[rgb(var(--adm-accent)/0.15)]">
                      <th className={`${thCls} text-left`}>Check-in / Check-out</th>
                      <th className={`${thCls} text-left`}>Hóspede</th>
                      <th className={`${thCls} text-right`}>Receita</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dr.map((r, i) => (
                      <tr key={i} className="border-b border-[rgb(var(--adm-border)/0.40)] last:border-0">
                        <td className={`${tdCls} font-mono text-[rgb(var(--adm-muted))]`}>
                          <Calendar className="h-3 w-3 inline mr-1 opacity-50" />{fmtDateCol(r.checkin)} → {fmtDateCol(r.checkout)}
                        </td>
                        <td className={`${tdCls} text-[rgb(var(--adm-text))]`}>{r.guest}</td>
                        <td className={`${tdCls} text-right font-mono font-bold text-[rgb(var(--adm-accent))]`}>{r.totalValue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Monthly Breakdown */}
          {fm.map(md => {
            const mi = getMonthIndex(md.month), ml = mi >= 0 ? MONTHS_FULL[mi] : md.month
            const r = parseBRL(md.receitaTotal), rs = parseBRL(md.resultado)
            if (r === 0 && md.expenses.length === 0 && md.reservations.length === 0) return null
            const reservationsCount = md.reservations.filter(rv => rv.source !== 'adjustment').length
            return (
              <div key={md.month} className="bg-[rgb(var(--adm-elevated)/0.50)] rounded-xl p-3 border border-[rgb(var(--adm-border)/0.50)]">
                <div className="flex justify-between mb-3">
                  <h4 className="text-xs font-semibold text-[rgb(var(--adm-accent))] flex items-center gap-1"><Calendar className="h-3 w-3" />{ml}</h4>
                  <span className={`text-xs font-bold font-mono ${rs >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtBRL(rs)}</span>
                </div>

                {/* Reservations Table */}
                {md.reservations.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-[10px] text-emerald-400 font-semibold mb-1.5 uppercase flex items-center gap-1"><Users className="h-3 w-3" />Reservas ({reservationsCount})</h5>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[rgb(var(--adm-border)/0.40)]">
                            <th className={`${thCls} text-left`}>Data</th>
                            <th className={`${thCls} text-left`}>Hóspede</th>
                            <th className={`${thCls} text-left`}>Fonte</th>
                            <th className={`${thCls} text-right`}>Receita</th>
                          </tr>
                        </thead>
                        <tbody>
                          {md.reservations.map((rv, ri) => {
                            const isAdj = rv.source === 'adjustment'
                            return (
                              <tr key={ri} className={`border-b border-[rgb(var(--adm-border)/0.40)] last:border-0 ${isAdj ? 'opacity-75' : ''} ${ri % 2 === 0 ? '' : 'bg-[rgb(var(--adm-surface)/0.30)]'}`}>
                                <td className={`${tdCls} font-mono text-[rgb(var(--adm-muted))] whitespace-nowrap`}>
                                  {!isAdj ? `${fmtDateCol(rv.checkin, mi)} → ${fmtDateCol(rv.checkout, mi)}` : ''}
                                </td>
                                <td className={`${tdCls} ${isAdj ? 'text-orange-400/80 italic text-[10px]' : 'text-[rgb(var(--adm-text))]'} max-w-[160px] truncate`}>
                                  {rv.guest || '\u2014'}
                                  {rv.guestOrigin && !isAdj && <span className="ml-1 text-[9px] text-[rgb(var(--adm-muted))]">({rv.guestOrigin})</span>}
                                </td>
                                <td className={`${tdCls}`}>
                                  {!isAdj ? platformBadge((rv as any).platform, rv.source) : null}
                                </td>
                                <td className={`${tdCls} text-right font-mono font-medium whitespace-nowrap ${isAdj ? 'text-orange-400' : 'text-emerald-400'}`}>
                                  {rv.revenue}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-[rgb(var(--adm-border)/0.50)]">
                            <td className={`${tdCls} font-bold text-[rgb(var(--adm-muted))]`} colSpan={3}>Total</td>
                            <td className={`${tdCls} text-right font-mono font-bold text-emerald-400`}>{md.receitaTotal}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* Expenses Table */}
                {md.expenses.length > 0 && (
                  <div>
                    <h5 className="text-[10px] text-red-400 font-semibold mb-1.5 uppercase flex items-center gap-1"><DollarSign className="h-3 w-3" />Despesas ({md.expenses.length})</h5>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[rgb(var(--adm-border)/0.40)]">
                            <th className={`${thCls} text-left`}>Descrição</th>
                            <th className={`${thCls} text-right`}>Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {md.expenses.map((e, ei) => (
                            <tr key={ei} className={`border-b border-[rgb(var(--adm-border)/0.40)] last:border-0 ${ei % 2 === 0 ? '' : 'bg-[rgb(var(--adm-surface)/0.30)]'}`}>
                              <td className={`${tdCls} text-[rgb(var(--adm-text))]`}>
                                {e.label}{e.obs ? <span className="ml-1 text-[9px] text-[rgb(var(--adm-muted))]">({e.obs})</span> : ''}
                              </td>
                              <td className={`${tdCls} text-right font-mono text-red-400 font-medium whitespace-nowrap`}>{e.value}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-[rgb(var(--adm-border)/0.50)]">
                            <td className={`${tdCls} font-bold text-[rgb(var(--adm-muted))]`}>Total</td>
                            <td className={`${tdCls} text-right font-mono font-bold text-red-400`}>{md.despesaTotal}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
    </div>
  )
}

export default function AdminDashboard() {
  const [apts, setApts] = useState<ApartmentSummary[]>([])
  const [op, setOp] = useState<{ expenses: BizExpense[]; totalRow: BizExpense | null; resultadoRow: Record<string, string> } | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [filter, setFilter] = useState<'all' | 'ytd' | 'month'>('month')
  const [sel, setSel] = useState(() => { const m = new Date().getMonth(); return m > 0 ? m - 1 : 11 })
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState('')
  const [activeTab, setActiveTab] = useState<'visao' | 'apartamentos'>('visao')
  const [aptFilter, setAptFilter] = useState<string>('todos')
  const [aptTabFilter, setAptTabFilter] = useState<string>('todos')
  const [aptSearch, setAptSearch] = useState('')

  async function loadData() {
    setLoading(true)
    try {
      const [a, o] = await Promise.all([fetch('/api/apartments'), fetch('/api/apartments/operacao')])
      if (a.ok) { const d = await a.json(); if (Array.isArray(d)) setApts(d) }
      if (o.ok) setOp(await o.json())
    } catch (e: any) { setErr(e.message) }
    finally { setLoading(false) }
  }

  async function loadLastSync() {
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
      const { data } = await sb.from('sync_logs').select('created_at, status').order('created_at', { ascending: false }).limit(1)
      if (data?.[0]) {
        const d = new Date(data[0].created_at)
        setLastSync(d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }))
      }
    } catch {}
  }

  async function triggerSync() {
    setSyncing(true)
    try { const res = await fetch('/api/cron/sync-all'); const data = await res.json(); if (data.ok) { await loadLastSync(); await loadData() } } catch {}
    finally { setSyncing(false) }
  }

  useEffect(() => { loadData(); loadLastSync() }, [])

  const valid = apts.filter(a => !a.error)

  // Filtered apartments for Visao Geral tab (by aptFilter)
  const filteredValid = useMemo(() => {
    if (aptFilter === 'todos') return valid
    return valid.filter(a => a.name === aptFilter)
  }, [valid, aptFilter])

  const aptCount = aptFilter === 'todos' ? (valid.length || APARTMENTS.length) : filteredValid.length

  const totals = useMemo(() => {
    let rec = 0, desp = 0, res = 0, com = 0, own = 0, nights = 0, blocked = 0
    for (const a of filteredValid) {
      const f = filterMonths(a.months || [], filter, sel)
      rec += sumF(f, 'receitaTotal'); desp += sumF(f, 'despesaTotal'); res += sumF(f, 'resultado'); com += sumF(f, 'managerCommission'); own += f.reduce((s, m) => s + ownerPart(m), 0); nights += countNights(f)
      blocked += f.reduce((s, m) => s + ((m as any).blockedNights || 0), 0)
    }
    return { rec, desp, res, com, own, nights, blocked }
  }, [filteredValid, filter, sel])

  const avail = availableNights(filter, sel, aptCount)
  const occupancy = avail > 0 ? (totals.nights / avail) * 100 : 0
  const adr = totals.nights > 0 ? totals.rec / totals.nights : 0
  const revpar = avail > 0 ? totals.rec / avail : 0
  // RevPAN: receita / noites disponíveis pra venda (descontando bloqueios do dono)
  const availForSale = avail - totals.blocked
  const revpan = availForSale > 0 ? totals.rec / availForSale : 0

  // Monthly chart data
  const chartData = useMemo(() => {
    return MONTHS_SHORT.map((label, i) => {
      let revenue = 0
      for (const a of filteredValid) {
        const md = (a.months || []).find(m => getMonthIndex(m.month) === i)
        if (md) revenue += parseBRL(md.receitaTotal)
      }
      return { month: label, value: revenue }
    })
  }, [filteredValid])

  const expenseChartData = useMemo(() => {
    return MONTHS_SHORT.map((label, i) => {
      let expense = 0
      for (const a of filteredValid) {
        const md = (a.months || []).find(m => getMonthIndex(m.month) === i)
        if (md) expense += parseBRL(md.despesaTotal)
      }
      return { month: label, value: expense }
    })
  }, [filteredValid])

  const commissionChart = useMemo(() => {
    return MONTHS_SHORT.map((label, i) => {
      let com = 0
      for (const a of filteredValid) {
        const md = (a.months || []).find(m => getMonthIndex(m.month) === i)
        if (md) com += parseBRL(md.managerCommission)
      }
      return { month: label, value: com }
    })
  }, [filteredValid])

  const resultChart = useMemo(() => {
    return MONTHS_SHORT.map((label, i) => {
      let result = 0
      for (const a of filteredValid) {
        const md = (a.months || []).find(m => getMonthIndex(m.month) === i)
        if (md) result += parseBRL(md.resultado)
      }
      return { month: label, value: result }
    })
  }, [filteredValid])

  const bizTotal = useMemo(() => {
    if (!op?.expenses) return 0
    if (filter === 'all') return parseBRL(op.totalRow?.total || '0')
    if (filter === 'month') return op.expenses.reduce((s, e) => s + parseBRL(e.values[MONTHS_FULL[sel]] || '0'), 0)
    if (filter === 'ytd') { const cm = new Date().getMonth(); return op.expenses.reduce((s, e) => s + MONTHS_FULL.slice(0, cm + 1).reduce((ms, m) => ms + parseBRL(e.values[m] || '0'), 0), 0) }
    return 0
  }, [op, filter, sel])

  const filterLabel = filter === 'all' ? '2026' : filter === 'ytd' ? 'YTD 2026' : MONTHS_FULL[sel]

  // Apartments tab: filtered list
  const aptTabList = useMemo(() => {
    let list = valid
    if (aptTabFilter !== 'todos') list = list.filter(a => a.name === aptTabFilter)
    if (aptSearch.trim()) {
      const q = aptSearch.trim().toLowerCase()
      list = list.filter(a => {
        if (a.name.toLowerCase().includes(q)) return true
        // Search in reservations guest names
        return (a.months || []).some(m =>
          m.reservations.some(r => r.guest?.toLowerCase().includes(q))
        )
      })
    }
    return list
  }, [valid, aptTabFilter, aptSearch])

  // Apartments tab uses shared filter/sel
  const aptTabEffectiveFilter = filter
  const aptTabEffectiveSel = sel

  // Pill button style helper
  const pillBtn = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
      active
        ? 'bg-[rgb(var(--adm-accent))] text-[rgb(var(--adm-accent-fg))]'
        : 'bg-[rgb(var(--adm-elevated))] text-[rgb(var(--adm-muted))] hover:text-[rgb(var(--adm-text))] border border-[rgb(var(--adm-border))]'
    }`

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[rgb(var(--adm-text))]">Sua Casa Leblon</h1>
          <p className="text-xs text-[rgb(var(--adm-muted))] mt-0.5">Gestão Completa</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={triggerSync} disabled={syncing} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${syncing ? 'bg-[rgb(var(--adm-accent)/0.20)] text-[rgb(var(--adm-accent))]' : 'bg-[rgb(var(--adm-accent))] text-[rgb(var(--adm-accent-fg))] hover:bg-[rgb(var(--adm-accent-hover))]'}`}>
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />{syncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
          {lastSync && <span className="text-[9px] text-[rgb(var(--adm-muted))]">Último: {lastSync}</span>}
        </div>
      </div>

      {/* Agent placeholder */}
      <div className="bg-[rgb(var(--adm-surface))] border border-[rgb(var(--adm-border))] rounded-xl px-4 py-3 flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-[rgb(var(--adm-accent)/0.12)] border border-[rgb(var(--adm-accent)/0.20)] flex items-center justify-center shrink-0">
          <Briefcase className="h-3.5 w-3.5 text-[rgb(var(--adm-accent))]" />
        </div>
        <input
          type="text"
          disabled
          placeholder="Assistente IA — configure a API key para ativar"
          className="flex-1 bg-transparent text-sm text-[rgb(var(--adm-muted))] placeholder:text-[rgb(var(--adm-muted)/0.50)] outline-none cursor-not-allowed"
        />
        <span className="text-[9px] text-[rgb(var(--adm-muted)/0.40)] shrink-0 hidden sm:block">Em breve</span>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[rgb(var(--adm-border))]">
        {([{ k: 'visao' as const, l: 'Visão Geral' }, { k: 'apartamentos' as const, l: 'Apartamentos' }]).map(t => (
          <button
            key={t.k}
            onClick={() => setActiveTab(t.k)}
            className={`px-4 py-2.5 text-sm font-medium transition-all relative ${
              activeTab === t.k
                ? 'text-[rgb(var(--adm-accent))]'
                : 'text-[rgb(var(--adm-muted))] hover:text-[rgb(var(--adm-text))]'
            }`}
          >
            {t.l}
            {activeTab === t.k && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[rgb(var(--adm-accent))] rounded-t" />
            )}
          </button>
        ))}
      </div>

      {/* Time Filters (shared) */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 bg-[rgb(var(--adm-elevated))] rounded-lg border border-[rgb(var(--adm-border))] px-1">
          <button onClick={() => setSel(s => s > 0 ? s - 1 : 11)} className="p-1.5 text-[rgb(var(--adm-muted))] hover:text-[rgb(var(--adm-text))]"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-sm font-medium text-[rgb(var(--adm-text))] min-w-[80px] text-center">{MONTHS_FULL[sel]}</span>
          <button onClick={() => setSel(s => s < 11 ? s + 1 : 0)} className="p-1.5 text-[rgb(var(--adm-muted))] hover:text-[rgb(var(--adm-text))]"><ChevronRight className="h-4 w-4" /></button>
        </div>

        <div className="flex rounded-lg border border-[rgb(var(--adm-border))] overflow-hidden text-xs">
          {([{ k: 'month' as const, l: 'Mês' }, { k: 'ytd' as const, l: 'YTD' }, { k: 'all' as const, l: 'Ano' }]).map(f => (
            <button key={f.k} onClick={() => setFilter(f.k)} className={`px-4 py-2 font-medium transition-all ${filter === f.k ? 'bg-[rgb(var(--adm-accent))] text-[rgb(var(--adm-accent-fg))]' : 'bg-[rgb(var(--adm-elevated))] text-[rgb(var(--adm-muted))] hover:text-[rgb(var(--adm-text))]'}`}>{f.l}</button>
          ))}
        </div>

        {/* Apartment filter pills — only on Visao Geral tab */}
        {activeTab === 'visao' && valid.length > 0 && (
          <>
            <span className="text-[rgb(var(--adm-border))] hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button onClick={() => setAptFilter('todos')} className={pillBtn(aptFilter === 'todos')}>Todos</button>
              {valid.map(a => (
                <button key={a.name} onClick={() => setAptFilter(a.name)} className={pillBtn(aptFilter === a.name)}>
                  {a.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {loading && <div className="flex items-center justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-[rgb(var(--adm-accent))]" /><span className="ml-2 text-sm text-[rgb(var(--adm-muted))]">Carregando dados...</span></div>}
      {err && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-400">{err}</div>}

      {!loading && !err && activeTab === 'visao' && (<>
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard label="Receita Total" value={fmtBRL(totals.rec)} sub={`${aptCount} imóve${aptCount === 1 ? 'l' : 'is'} ${aptFilter === 'todos' ? 'ativos' : ''}`} icon={DollarSign} color="text-emerald-400" />
          <MetricCard label="Comissão Sua Casa" value={fmtBRL(totals.com)} sub={aptFilter === 'todos' ? `Resultado: ${fmtBRL(totals.com - bizTotal)}` : undefined} icon={Briefcase} color="text-[rgb(var(--adm-accent))]" />
          <MetricCard label="Despesas Apts" value={fmtBRL(totals.desp)} icon={TrendingDown} color="text-red-400" />
          <MetricCard label="Resultado Líquido" value={fmtBRL(totals.res - totals.com)} sub={`Repassar: ${fmtBRL(totals.own)}`} icon={BarChart3} color={(totals.res - totals.com) >= 0 ? 'text-emerald-400' : 'text-red-400'} />
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard label="Tx. Ocupação" value={`${occupancy.toFixed(1)}%`} sub={`${totals.nights} de ${avail} noites`} icon={Hotel} color={occupancy > 60 ? 'text-emerald-400' : occupancy > 40 ? 'text-yellow-400' : 'text-red-400'} />
          <MetricCard label="ADR" value={fmtBRL(adr)} sub="Diária média" icon={BedDouble} color="text-[rgb(var(--adm-text))]" />
          <MetricCard label="RevPAR" value={fmtBRL(revpar)} sub="Receita / noites totais" icon={BarChart3} color="text-[rgb(var(--adm-text))]" />
          <MetricCard label="RevPAN" value={fmtBRL(revpan)} sub={totals.blocked > 0 ? `${availForSale} noites à venda (${totals.blocked} bloq.)` : `Receita / noites à venda`} icon={Building2} color="text-[rgb(var(--adm-text))]" />
        </div>

        {/* Resumo por Apt — logo após métricas */}
        {filteredValid.length > 0 && (
          <div className="bg-[rgb(var(--adm-surface))] border border-[rgb(var(--adm-accent)/0.20)] rounded-xl p-4">
            <h3 className="text-sm text-[rgb(var(--adm-text))] flex items-center gap-2 mb-3 font-semibold"><Calendar className="h-4 w-4 text-[rgb(var(--adm-accent))]" />Resumo por Apt — {filterLabel}</h3>
            <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b border-[rgb(var(--adm-border))]">
              {['Apt', '% Com.', 'Receita', 'Despesa', 'Comissão', 'Proprietário', 'Resultado'].map(h => <th key={h} className={`py-2 px-2 text-[rgb(var(--adm-muted))] font-medium ${h === 'Apt' || h === '% Com.' ? 'text-left' : 'text-right'}`}>{h}</th>)}
            </tr></thead><tbody>
              {filteredValid.map(a => {
                const f = filterMonths(a.months || [], filter, sel), r = sumF(f, 'receitaTotal'), d = sumF(f, 'despesaTotal'), rs = sumF(f, 'resultado'), c = sumF(f, 'managerCommission'), o = f.reduce((s, m) => s + ownerPart(m), 0)
                const pct = (a as any).commissionPct
                return (
                  <tr key={a.name} className="border-b border-[rgb(var(--adm-border)/0.30)] hover:bg-[rgb(var(--adm-elevated)/0.50)]">
                    <td className="py-2 px-2 font-medium text-[rgb(var(--adm-text))]">Apt {a.name}</td>
                    <td className="py-2 px-2 text-[rgb(var(--adm-muted))] text-xs">{pct != null ? `${(pct * 100).toFixed(0)}%` : '—'}</td>
                    <td className="py-2 px-2 text-right font-mono text-emerald-400">{fmtBRL(r)}</td>
                    <td className="py-2 px-2 text-right font-mono text-red-400">{fmtBRL(d)}</td>
                    <td className="py-2 px-2 text-right font-mono text-[rgb(var(--adm-accent))]">{fmtBRL(c)}</td>
                    <td className="py-2 px-2 text-right font-mono text-emerald-400">{fmtBRL(o)}</td>
                    <td className={`py-2 px-2 text-right font-mono font-bold ${rs >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtBRL(rs)}</td>
                  </tr>
                )
              })}
              {filteredValid.length > 1 && (
                <tr className="border-t-2 border-[rgb(var(--adm-accent)/0.30)] font-bold">
                  <td className="py-2 px-2 text-[rgb(var(--adm-accent))]" colSpan={2}>TOTAL</td>
                  <td className="py-2 px-2 text-right font-mono text-emerald-400">{fmtBRL(totals.rec)}</td>
                  <td className="py-2 px-2 text-right font-mono text-red-400">{fmtBRL(totals.desp)}</td>
                  <td className="py-2 px-2 text-right font-mono text-[rgb(var(--adm-accent))]">{fmtBRL(totals.com)}</td>
                  <td className="py-2 px-2 text-right font-mono text-emerald-400">{fmtBRL(totals.own)}</td>
                  <td className={`py-2 px-2 text-right font-mono ${totals.res >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtBRL(totals.res)}</td>
                </tr>
              )}
            </tbody></table></div>
          </div>
        )}

        {/* Operational costs */}
        {aptFilter === 'todos' && op?.expenses && op.expenses.length > 0 && (
          <div className="bg-[rgb(var(--adm-surface))] border border-[rgb(var(--adm-border))] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3"><h3 className="text-sm text-[rgb(var(--adm-text))] flex items-center gap-2 font-semibold"><Briefcase className="h-4 w-4 text-[rgb(var(--adm-accent))]" />Custos Operação</h3><span className="text-sm font-bold font-mono text-red-400">{fmtBRL(bizTotal)}</span></div>
            {op.expenses.filter(e => { if (filter === 'all') return parseBRL(e.total) !== 0; if (filter === 'month') return parseBRL(e.values[MONTHS_FULL[sel]] || '0') !== 0; return true }).map((e, i) => {
              let val = e.total; if (filter === 'month') val = e.values[MONTHS_FULL[sel]] || 'R$ 0,00'; if (filter === 'ytd') { const cm = new Date().getMonth(); val = fmtBRL(MONTHS_FULL.slice(0, cm + 1).reduce((s, m) => s + parseBRL(e.values[m] || '0'), 0)) }
              return <div key={i} className="flex justify-between text-[11px] py-1.5 border-b border-[rgb(var(--adm-border)/0.30)] last:border-0"><span className="text-[rgb(var(--adm-text))]">{e.label}</span><span className="font-mono text-red-400 font-medium">{val}</span></div>
            })}
          </div>
        )}
      </>)}

      {/* === APARTAMENTOS TAB === */}
      {!loading && !err && activeTab === 'apartamentos' && (<>
        {/* Apartment tab filters */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Apartment filter pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button onClick={() => setAptTabFilter('todos')} className={pillBtn(aptTabFilter === 'todos')}>Todos</button>
            {valid.map(a => (
              <button key={a.name} onClick={() => setAptTabFilter(a.name)} className={pillBtn(aptTabFilter === a.name)}>
                {a.name}
              </button>
            ))}
          </div>

          <span className="text-[rgb(var(--adm-border))] hidden sm:inline">|</span>

          {/* Search */}
          <div className="relative min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[rgb(var(--adm-muted))]" />
            <input
              type="text"
              placeholder="Buscar apartamento ou hóspede..."
              value={aptSearch}
              onChange={e => setAptSearch(e.target.value)}
              className="w-full bg-[rgb(var(--adm-elevated))] border border-[rgb(var(--adm-border))] text-[rgb(var(--adm-text))] text-xs rounded-lg pl-8 pr-3 py-1.5 placeholder:text-[rgb(var(--adm-muted))] focus:outline-none focus:border-[rgb(var(--adm-accent))]"
            />
          </div>
        </div>

        {/* Apartment cards */}
        {aptTabList.length === 0 ? (
          <div className="text-center py-12 text-sm text-[rgb(var(--adm-muted))]">Nenhum apartamento encontrado.</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {aptTabList.map(a => <AptCard key={a.name} apt={a} filter={aptTabEffectiveFilter} sel={aptTabEffectiveSel} />)}
          </div>
        )}
      </>)}
    </div>
  )
}
