'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  Loader2, RefreshCw, Building2, TrendingUp, TrendingDown,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Calendar, Users, DollarSign, Briefcase, UserCheck, ExternalLink,
  BarChart3, Hotel, Percent, BedDouble
} from 'lucide-react'
import type { ApartmentSummary, MonthData, BizExpense } from '@/lib/types'
import { parseBRL, fmtBRL, getMonthIndex, MONTHS_SHORT, MONTHS_FULL, APARTMENTS } from '@/lib/types'

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

function MetricCard({ label, value, sub, icon: Icon, color = 'text-[#f0eee8]', trend }: {
  label: string; value: string; sub?: string; icon: any; color?: string; trend?: { value: string; positive: boolean } | null
}) {
  return (
    <div className="bg-[#16161a] border border-[#2a2a30] rounded-xl p-4 hover:border-[#c9a96e]/20 transition-all">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] text-[#94918a] font-medium uppercase tracking-wider">{label}</p>
        <div className="w-7 h-7 rounded-lg bg-[#c9a96e]/10 flex items-center justify-center">
          <Icon className="h-3.5 w-3.5 text-[#c9a96e]" />
        </div>
      </div>
      <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
      <div className="flex items-center justify-between mt-1">
        {sub && <p className="text-[10px] text-[#94918a]">{sub}</p>}
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
    <div className="bg-[#16161a] border border-[#2a2a30] rounded-xl p-4">
      <p className="text-[10px] text-[#94918a] font-medium uppercase tracking-wider mb-3">{label}</p>
      <div className="flex items-end gap-[3px] h-16">
        {data.map((d, i) => {
          const h = Math.max((Math.abs(d.value) / max) * 100, 4)
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1" title={`${d.month}: ${fmtBRL(d.value)}`}>
              <div className={`w-full rounded-t ${d.value > 0 ? 'bg-emerald-400/70' : d.value < 0 ? 'bg-red-400/70' : 'bg-[#2a2a30]/40'}`} style={{ height: `${h}%` }} />
              <span className="text-[7px] text-[#94918a] leading-none">{d.month.slice(0, 3)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AptCard({ apt, filter, sel }: { apt: ApartmentSummary; filter: string; sel: number }) {
  const [open, setOpen] = useState(false)
  const fm = useMemo(() => filterMonths(apt.months || [], filter, sel), [apt.months, filter, sel])
  const rec = sumF(fm, 'receitaTotal'), desp = sumF(fm, 'despesaTotal'), res = sumF(fm, 'resultado')
  const com = sumF(fm, 'managerCommission'), own = fm.reduce((s, m) => s + ownerPart(m), 0)
  const pct = (apt as any).commissionPct
  const dr = apt.directReservations || []

  return (
    <div className="bg-[#16161a] border border-[#2a2a30] rounded-xl hover:border-[#c9a96e]/30 transition-all">
      <div className="p-4 cursor-pointer" onClick={() => setOpen(!open)}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#c9a96e]/15 flex items-center justify-center"><Building2 className="h-3.5 w-3.5 text-[#c9a96e]" /></div>
            <div>
              <span className="text-sm font-medium text-[#f0eee8]">Apt {apt.name}</span>
              {pct && <span className="ml-2 text-[8px] text-[#94918a]">{(pct * 100).toFixed(0)}% comissão</span>}
            </div>
            {dr.length > 0 && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-[#c9a96e]/15 text-[#c9a96e] font-bold">{dr.length} diretas</span>}
          </div>
          {open ? <ChevronUp className="h-4 w-4 text-[#94918a]" /> : <ChevronDown className="h-4 w-4 text-[#94918a]" />}
        </div>
        <div className="grid grid-cols-3 gap-2 mb-2">
          {[{ l: 'Receita', v: rec, c: 'text-emerald-400' }, { l: 'Despesa', v: desp, c: 'text-red-400' }, { l: 'Resultado', v: res, c: res >= 0 ? 'text-emerald-400' : 'text-red-400' }].map(({ l, v, c }) => (
            <div key={l} className="bg-[#1e1e24] rounded-lg p-2 text-center">
              <p className="text-[9px] text-[#94918a] uppercase tracking-wider">{l}</p>
              <p className={`text-xs font-bold font-mono mt-0.5 ${c}`}>{fmtBRL(v)}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[#c9a96e]/5 border border-[#c9a96e]/10 rounded-lg p-1.5 text-center">
            <p className="text-[8px] text-[#94918a] uppercase">Minha Comissão</p>
            <p className="text-[10px] font-bold text-[#c9a96e] font-mono">{fmtBRL(com)}</p>
          </div>
          <div className="bg-emerald-400/5 border border-emerald-400/10 rounded-lg p-1.5 text-center">
            <p className="text-[8px] text-[#94918a] uppercase">Proprietário</p>
            <p className="text-[10px] font-bold text-emerald-400 font-mono">{fmtBRL(own)}</p>
          </div>
        </div>
        <div className="flex gap-[3px] h-6 items-end px-1 mt-2">
          {MONTHS_SHORT.map((lb, i) => {
            const md = (apt.months || []).find(m => getMonthIndex(m.month) === i)
            const v = md ? parseBRL(md.resultado) : 0
            const mx = Math.max(...(apt.months || []).map(m => Math.abs(parseBRL(m.resultado))), 1)
            const h = Math.max((Math.abs(v) / mx) * 100, 4)
            return <div key={lb} className="flex-1 flex flex-col justify-end" title={`${lb}: ${fmtBRL(v)}`}><div className={`w-full rounded-sm ${v > 0 ? 'bg-emerald-400/60' : v < 0 ? 'bg-red-400/60' : 'bg-[#2a2a30]/30'}`} style={{ height: `${h}%` }} /></div>
          })}
        </div>
      </div>
      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-[#2a2a30] pt-3">
          {dr.length > 0 && (
            <div className="bg-[#c9a96e]/5 border border-[#c9a96e]/20 rounded-xl p-3">
              <h5 className="text-[10px] text-[#c9a96e] font-semibold mb-2 uppercase flex items-center gap-1"><UserCheck className="h-3 w-3" /> Reservas Diretas ({dr.length})</h5>
              {dr.map((r, i) => (
                <div key={i} className="bg-[#16161a]/60 rounded-lg p-2 border border-[#2a2a30]/50 mb-1">
                  <div className="flex items-center gap-2 text-[10px] text-[#94918a]"><Calendar className="h-3 w-3" />{r.checkin} → {r.checkout}</div>
                  <div className="flex justify-between mt-1"><span className="text-[11px] text-[#f0eee8]">{r.guest}</span><span className="font-mono text-xs font-bold text-[#c9a96e]">{r.totalValue}</span></div>
                </div>
              ))}
            </div>
          )}
          {fm.map(md => {
            const mi = getMonthIndex(md.month), ml = mi >= 0 ? MONTHS_FULL[mi] : md.month
            const r = parseBRL(md.receitaTotal), rs = parseBRL(md.resultado)
            if (r === 0 && md.expenses.length === 0 && md.reservations.length === 0) return null
            return (
              <div key={md.month} className="bg-[#1e1e24]/50 rounded-lg p-3 border border-[#2a2a30]/50">
                <div className="flex justify-between mb-2"><h4 className="text-xs font-semibold text-[#c9a96e] flex items-center gap-1"><Calendar className="h-3 w-3" />{ml}</h4><span className={`text-xs font-bold font-mono ${rs >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtBRL(rs)}</span></div>
                {md.reservations.length > 0 && (
                  <div className="mb-2">
                    <h5 className="text-[10px] text-emerald-400 font-semibold mb-1 uppercase flex items-center gap-1"><Users className="h-3 w-3" />Reservas ({md.reservations.filter(r => r.source !== 'adjustment').length})</h5>
                    {md.reservations.map((rv, ri) => {
                      const isAdj = rv.source === 'adjustment'
                      return (
                        <div key={ri} className={`flex items-center text-[11px] py-1 border-b border-[#2a2a30]/30 last:border-0 gap-2 ${isAdj ? 'pl-4 opacity-80' : ''}`}>
                          {!isAdj ? <span className="font-mono text-[#94918a] w-14 shrink-0">{rv.checkin}→{rv.checkout}</span> : <span className="w-14 shrink-0" />}
                          <span className={`flex-1 truncate ${isAdj ? 'text-orange-400/80 text-[10px] italic' : 'text-[#f0eee8]'}`}>{rv.guest || '—'}</span>
                          {rv.source && !isAdj && rv.source !== 'hospitable' && <span className={`text-[8px] px-1 py-0.5 rounded font-semibold ${rv.source === 'whatsapp' ? 'bg-green-500/15 text-green-400' : rv.source === 'site' ? 'bg-[#c9a96e]/15 text-[#c9a96e]' : 'bg-blue-500/15 text-blue-400'}`}>{rv.source === 'airbnb_csv' ? 'CSV' : rv.source}</span>}
                          {rv.guestOrigin && !isAdj && <span className="text-[9px] text-[#94918a] max-w-[80px] truncate">{rv.guestOrigin}</span>}
                          <span className={`font-mono font-medium shrink-0 ${isAdj ? 'text-orange-400' : 'text-emerald-400'}`}>{rv.revenue}</span>
                        </div>
                      )
                    })}
                    <div className="flex justify-between mt-1.5 pt-1.5 border-t border-[#2a2a30]/50 text-[11px]"><span className="text-[#94918a]">Receita Total</span><span className="font-mono font-bold text-emerald-400">{md.receitaTotal}</span></div>
                  </div>
                )}
                {md.expenses.length > 0 && (
                  <div>
                    <h5 className="text-[10px] text-red-400 font-semibold mb-1 uppercase flex items-center gap-1"><DollarSign className="h-3 w-3" />Despesas ({md.expenses.length})</h5>
                    {md.expenses.map((e, ei) => (
                      <div key={ei} className="flex items-center text-[11px] py-1 border-b border-[#2a2a30]/30 last:border-0 gap-2"><span className="text-[#f0eee8] flex-1 truncate">{e.label}{e.obs ? ` (${e.obs})` : ''}</span><span className="font-mono text-red-400 font-medium shrink-0">{e.value}</span></div>
                    ))}
                    <div className="flex justify-between mt-1.5 pt-1.5 border-t border-[#2a2a30]/50 text-[11px]"><span className="text-[#94918a]">Despesa Total</span><span className="font-mono font-bold text-red-400">{md.despesaTotal}</span></div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function AdminDashboard() {
  const [apts, setApts] = useState<ApartmentSummary[]>([])
  const [op, setOp] = useState<{ expenses: BizExpense[]; totalRow: BizExpense | null; resultadoRow: Record<string, string> } | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [filter, setFilter] = useState<'all' | 'ytd' | 'month'>('ytd')
  const [sel, setSel] = useState(new Date().getMonth() > 0 ? new Date().getMonth() - 1 : 0)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState('')

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
  const aptCount = valid.length || APARTMENTS.length

  const totals = useMemo(() => {
    let rec = 0, desp = 0, res = 0, com = 0, own = 0, nights = 0
    for (const a of valid) {
      const f = filterMonths(a.months || [], filter, sel)
      rec += sumF(f, 'receitaTotal'); desp += sumF(f, 'despesaTotal'); res += sumF(f, 'resultado'); com += sumF(f, 'managerCommission'); own += f.reduce((s, m) => s + ownerPart(m), 0); nights += countNights(f)
    }
    return { rec, desp, res, com, own, nights }
  }, [valid, filter, sel])

  const avail = availableNights(filter, sel, aptCount)
  const occupancy = avail > 0 ? (totals.nights / avail) * 100 : 0
  const adr = totals.nights > 0 ? totals.rec / totals.nights : 0
  const revpar = avail > 0 ? totals.rec / avail : 0
  const revpan = aptCount > 0 ? totals.rec / aptCount : 0

  // Monthly chart data
  const chartData = useMemo(() => {
    return MONTHS_SHORT.map((label, i) => {
      let revenue = 0
      for (const a of valid) {
        const md = (a.months || []).find(m => getMonthIndex(m.month) === i)
        if (md) revenue += parseBRL(md.receitaTotal)
      }
      return { month: label, value: revenue }
    })
  }, [valid])

  const commissionChart = useMemo(() => {
    return MONTHS_SHORT.map((label, i) => {
      let com = 0
      for (const a of valid) {
        const md = (a.months || []).find(m => getMonthIndex(m.month) === i)
        if (md) com += parseBRL(md.managerCommission)
      }
      return { month: label, value: com }
    })
  }, [valid])

  const bizTotal = useMemo(() => {
    if (!op?.expenses) return 0
    if (filter === 'all') return parseBRL(op.totalRow?.total || '0')
    if (filter === 'month') return op.expenses.reduce((s, e) => s + parseBRL(e.values[MONTHS_FULL[sel]] || '0'), 0)
    if (filter === 'ytd') { const cm = new Date().getMonth(); return op.expenses.reduce((s, e) => s + MONTHS_FULL.slice(0, cm + 1).reduce((ms, m) => ms + parseBRL(e.values[m] || '0'), 0), 0) }
    return 0
  }, [op, filter, sel])

  const filterLabel = filter === 'all' ? '2026' : filter === 'ytd' ? 'YTD 2026' : MONTHS_FULL[sel]

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#f0eee8]">Dashboard</h1>
          <p className="text-xs text-[#94918a] mt-0.5">Sua Casa Leblon — Gestão Completa • {filterLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={triggerSync} disabled={syncing} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${syncing ? 'bg-[#c9a96e]/20 text-[#c9a96e]' : 'bg-[#c9a96e] text-[#1a1207] hover:bg-[#dbc192]'}`}>
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />{syncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
          {lastSync && <span className="text-[9px] text-[#94918a]">Último: {lastSync}</span>}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex rounded-lg border border-[#2a2a30] overflow-hidden text-xs">
          {([{ k: 'month' as const, l: 'Mês' }, { k: 'ytd' as const, l: 'YTD' }, { k: 'all' as const, l: 'Ano' }]).map(f => (
            <button key={f.k} onClick={() => setFilter(f.k)} className={`px-4 py-2 font-medium transition-all ${filter === f.k ? 'bg-[#c9a96e] text-[#1a1207]' : 'bg-[#1e1e24] text-[#94918a] hover:text-[#f0eee8]'}`}>{f.l}</button>
          ))}
        </div>
        {filter === 'month' && (
          <div className="flex items-center gap-1.5 bg-[#1e1e24] rounded-lg border border-[#2a2a30] px-1">
            <button onClick={() => setSel(s => s > 0 ? s - 1 : 11)} className="p-1.5 text-[#94918a] hover:text-[#f0eee8]"><ChevronLeft className="h-4 w-4" /></button>
            <span className="text-sm font-medium text-[#f0eee8] min-w-[80px] text-center">{MONTHS_FULL[sel]}</span>
            <button onClick={() => setSel(s => s < 11 ? s + 1 : 0)} className="p-1.5 text-[#94918a] hover:text-[#f0eee8]"><ChevronRight className="h-4 w-4" /></button>
          </div>
        )}
      </div>

      {loading && <div className="flex items-center justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-[#c9a96e]" /><span className="ml-2 text-sm text-[#94918a]">Carregando dados...</span></div>}
      {err && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-400">{err}</div>}

      {!loading && !err && (<>
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard label="Receita Total" value={fmtBRL(totals.rec)} sub={`${aptCount} imóveis ativos`} icon={DollarSign} color="text-emerald-400" />
          <MetricCard label="Minha Comissão" value={fmtBRL(totals.com)} sub={`Resultado: ${fmtBRL(totals.com - bizTotal)}`} icon={Briefcase} color="text-[#c9a96e]" />
          <MetricCard label="Despesas Apts" value={fmtBRL(totals.desp)} icon={TrendingDown} color="text-red-400" />
          <MetricCard label="Resultado Líquido" value={fmtBRL(totals.res)} sub={`Repassar: ${fmtBRL(totals.own)}`} icon={BarChart3} color={totals.res >= 0 ? 'text-emerald-400' : 'text-red-400'} />
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard label="Tx. Ocupação" value={`${occupancy.toFixed(1)}%`} sub={`${totals.nights} de ${avail} noites`} icon={Hotel} color={occupancy > 60 ? 'text-emerald-400' : occupancy > 40 ? 'text-yellow-400' : 'text-red-400'} />
          <MetricCard label="ADR" value={fmtBRL(adr)} sub="Diária média" icon={BedDouble} color="text-[#f0eee8]" />
          <MetricCard label="RevPAR" value={fmtBRL(revpar)} sub="Receita por noite disponível" icon={BarChart3} color="text-[#f0eee8]" />
          <MetricCard label="RevPAN" value={fmtBRL(revpan)} sub="Receita por apt (período)" icon={Building2} color="text-[#f0eee8]" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <MiniChart data={chartData} label="Receita Mensal (todos os apts)" />
          <MiniChart data={commissionChart} label="Minha Comissão Mensal" />
        </div>

        {/* Monthly breakdown table */}
        {valid.length > 0 && (
          <div className="bg-[#16161a] border border-[#c9a96e]/20 rounded-xl p-4">
            <h3 className="text-sm text-[#f0eee8] flex items-center gap-2 mb-3 font-semibold"><Calendar className="h-4 w-4 text-[#c9a96e]" />Resumo por Apt — {filterLabel}</h3>
            <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b border-[#2a2a30]">
              {['Apt', '% Com.', 'Receita', 'Despesa', 'Comissão', 'Proprietário', 'Resultado'].map(h => <th key={h} className={`py-2 px-2 text-[#94918a] font-medium ${h === 'Apt' || h === '% Com.' ? 'text-left' : 'text-right'}`}>{h}</th>)}
            </tr></thead><tbody>
              {valid.map(a => {
                const f = filterMonths(a.months || [], filter, sel), r = sumF(f, 'receitaTotal'), d = sumF(f, 'despesaTotal'), rs = sumF(f, 'resultado'), c = sumF(f, 'managerCommission'), o = f.reduce((s, m) => s + ownerPart(m), 0)
                const pct = (a as any).commissionPct
                return (
                  <tr key={a.name} className="border-b border-[#2a2a30]/30 hover:bg-[#1e1e24]/50">
                    <td className="py-2 px-2 font-medium text-[#f0eee8]">Apt {a.name}</td>
                    <td className="py-2 px-2 text-[#94918a] text-xs">{pct ? `${(pct * 100).toFixed(0)}%` : '15%'}</td>
                    <td className="py-2 px-2 text-right font-mono text-emerald-400">{fmtBRL(r)}</td>
                    <td className="py-2 px-2 text-right font-mono text-red-400">{fmtBRL(d)}</td>
                    <td className="py-2 px-2 text-right font-mono text-[#c9a96e]">{fmtBRL(c)}</td>
                    <td className="py-2 px-2 text-right font-mono text-emerald-400">{fmtBRL(o)}</td>
                    <td className={`py-2 px-2 text-right font-mono font-bold ${rs >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtBRL(rs)}</td>
                  </tr>
                )
              })}
              <tr className="border-t-2 border-[#c9a96e]/30 font-bold">
                <td className="py-2 px-2 text-[#c9a96e]" colSpan={2}>TOTAL</td>
                <td className="py-2 px-2 text-right font-mono text-emerald-400">{fmtBRL(totals.rec)}</td>
                <td className="py-2 px-2 text-right font-mono text-red-400">{fmtBRL(totals.desp)}</td>
                <td className="py-2 px-2 text-right font-mono text-[#c9a96e]">{fmtBRL(totals.com)}</td>
                <td className="py-2 px-2 text-right font-mono text-emerald-400">{fmtBRL(totals.own)}</td>
                <td className={`py-2 px-2 text-right font-mono ${totals.res >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtBRL(totals.res)}</td>
              </tr>
            </tbody></table></div>
          </div>
        )}

        {/* Operational costs */}
        {op?.expenses && op.expenses.length > 0 && (
          <div className="bg-[#16161a] border border-[#2a2a30] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3"><h3 className="text-sm text-[#f0eee8] flex items-center gap-2 font-semibold"><Briefcase className="h-4 w-4 text-[#c9a96e]" />Custos Operação</h3><span className="text-sm font-bold font-mono text-red-400">{fmtBRL(bizTotal)}</span></div>
            {op.expenses.filter(e => { if (filter === 'all') return parseBRL(e.total) !== 0; if (filter === 'month') return parseBRL(e.values[MONTHS_FULL[sel]] || '0') !== 0; return true }).map((e, i) => {
              let val = e.total; if (filter === 'month') val = e.values[MONTHS_FULL[sel]] || 'R$ 0,00'; if (filter === 'ytd') { const cm = new Date().getMonth(); val = fmtBRL(MONTHS_FULL.slice(0, cm + 1).reduce((s, m) => s + parseBRL(e.values[m] || '0'), 0)) }
              return <div key={i} className="flex justify-between text-[11px] py-1.5 border-b border-[#2a2a30]/30 last:border-0"><span className="text-[#f0eee8]">{e.label}</span><span className="font-mono text-red-400 font-medium">{val}</span></div>
            })}
          </div>
        )}

        {/* Apartment cards */}
        <div>
          <h2 className="text-sm font-semibold mb-3 text-[#94918a] uppercase tracking-wider">Apartamentos</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {valid.map(a => <AptCard key={a.name} apt={a} filter={filter} sel={sel} />)}
          </div>
        </div>
      </>)}
    </div>
  )
}
