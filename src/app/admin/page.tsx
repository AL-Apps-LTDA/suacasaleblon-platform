'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  Loader2, RefreshCw, Building2, TrendingUp, TrendingDown,
  ChevronLeft, ChevronRight,
  Calendar, Users, DollarSign, Briefcase, UserCheck, ExternalLink,
  BarChart3, Hotel, Percent, BedDouble, Search, ChevronDown
} from 'lucide-react'
import { AgentChat } from '@/components/AgentChat'
import type { ApartmentSummary, MonthData, BizExpense } from '@/lib/types'

import { parseBRL, fmtBRL, getMonthIndex, MONTHS_SHORT, MONTHS_FULL, APARTMENTS } from '@/lib/types'

// ---------- Year helpers ----------
function getAvailableYears(): number[] {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() // 0-based, 11 = December
  const baseYear = 2026
  const years: number[] = []
  for (let y = baseYear; y <= currentYear + 1; y++) {
    // Add next year only from December 1st of the current year
    if (y > currentYear) {
      if (currentYear >= baseYear && currentMonth >= 11) {
        years.push(y)
      }
    } else {
      years.push(y)
    }
  }
  // Always include at least 2026
  if (years.length === 0) years.push(baseYear)
  return years
}

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

function filterMonths(months: MonthData[], filter: string, sel: number, year: number): MonthData[] {
  // filter months by year first
  const byYear = months.filter(m => {
    // MonthData may have a year field, or we infer from the data year context
    const my = (m as any).year
    if (my !== undefined) return my === year
    // If no year field, assume it belongs to the year (legacy: only 2026 data)
    return true
  })
  if (filter === 'all') return byYear
  if (filter === 'ytd') return byYear.filter(m => getMonthIndex(m.month) <= new Date().getMonth())
  if (filter === 'month') return byYear.filter(m => getMonthIndex(m.month) === sel)
  return byYear
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
function availableNights(filter: string, sel: number, aptCount: number, year: number): number {
  const now = new Date()
  const cm = now.getMonth()
  if (filter === 'month') {
    const daysInMonth = new Date(year, sel + 1, 0).getDate()
    return daysInMonth * aptCount
  }
  if (filter === 'ytd') {
    let total = 0
    for (let i = 0; i <= cm; i++) total += new Date(year, i + 1, 0).getDate()
    return total * aptCount
  }
  // full year — check if leap year
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
  return (isLeap ? 366 : 365) * aptCount
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

function AptBreakdownChart({ apts, filter, sel, year }: { apts: ApartmentSummary[]; filter: string; sel: number; year: number }) {
  const aptData = apts.map(a => {
    const f = filterMonths(a.months || [], filter, sel, year)
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
  if (val.includes('-') || val.includes('/')) {
    const d = new Date(val)
    if (!isNaN(d.getTime())) {