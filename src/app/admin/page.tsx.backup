'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  Loader2, RefreshCw, Building2,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Calendar, Users, DollarSign, Briefcase, UserCheck, ExternalLink
} from 'lucide-react'
import type { ApartmentSummary, MonthData, BizExpense } from '@/lib/types'
import { parseBRL, fmtBRL, getMonthIndex, MONTHS_SHORT, MONTHS_FULL } from '@/lib/types'

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

function AptCard({ apt, filter, sel }: { apt: ApartmentSummary; filter: string; sel: number }) {
  const [open, setOpen] = useState(false)
  const fm = useMemo(() => filterMonths(apt.months || [], filter, sel), [apt.months, filter, sel])
  const rec = sumF(fm, 'receitaTotal'), desp = sumF(fm, 'despesaTotal'), res = sumF(fm, 'resultado')
  const com = sumF(fm, 'managerCommission'), own = fm.reduce((s,m) => s + ownerPart(m), 0)
  const mgr = fm.find(m => m.managerName)?.managerName || 'Gestor'
  const dr = apt.directReservations || []

  return (
    <div className="bg-[#16161a] border border-[#2a2a30] rounded-xl hover:border-[#c9a96e]/30 transition-all">
      <div className="p-4 cursor-pointer" onClick={() => setOpen(!open)}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#c9a96e]/15 flex items-center justify-center"><Building2 className="h-3.5 w-3.5 text-[#c9a96e]" /></div>
            <span className="text-sm font-medium text-[#f0eee8]">Apt {apt.name}</span>
            {dr.length > 0 && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-[#c9a96e]/15 text-[#c9a96e] font-bold">{dr.length} diretas</span>}
          </div>
          {open ? <ChevronUp className="h-4 w-4 text-[#94918a]" /> : <ChevronDown className="h-4 w-4 text-[#94918a]" />}
        </div>
        <div className="grid grid-cols-3 gap-2 mb-2">
          {[{l:'Receita',v:rec,c:'text-emerald-400'},{l:'Despesa',v:desp,c:'text-red-400'},{l:'Resultado',v:res,c:res>=0?'text-emerald-400':'text-red-400'}].map(({l,v,c})=>(
            <div key={l} className="bg-[#1e1e24] rounded-lg p-2 text-center">
              <p className="text-[9px] text-[#94918a] uppercase tracking-wider">{l}</p>
              <p className={`text-xs font-bold font-mono mt-0.5 ${c}`}>{fmtBRL(v)}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[#c9a96e]/5 border border-[#c9a96e]/10 rounded-lg p-1.5 text-center">
            <p className="text-[8px] text-[#94918a] uppercase">{mgr}</p>
            <p className="text-[10px] font-bold text-[#c9a96e] font-mono">{fmtBRL(com)}</p>
          </div>
          <div className="bg-emerald-400/5 border border-emerald-400/10 rounded-lg p-1.5 text-center">
            <p className="text-[8px] text-[#94918a] uppercase">Proprietário</p>
            <p className="text-[10px] font-bold text-emerald-400 font-mono">{fmtBRL(own)}</p>
          </div>
        </div>
        <div className="flex gap-[3px] h-6 items-end px-1 mt-2">
          {MONTHS_SHORT.map((lb,i) => {
            const md = (apt.months||[]).find(m => getMonthIndex(m.month)===i)
            const v = md ? parseBRL(md.resultado) : 0
            const mx = Math.max(...(apt.months||[]).map(m => Math.abs(parseBRL(m.resultado))), 1)
            const h = Math.max((Math.abs(v)/mx)*100, 4)
            return <div key={lb} className="flex-1 flex flex-col justify-end" title={`${lb}: ${fmtBRL(v)}`}><div className={`w-full rounded-sm ${v>0?'bg-emerald-400/60':v<0?'bg-red-400/60':'bg-[#2a2a30]/30'}`} style={{height:`${h}%`}} /></div>
          })}
        </div>
      </div>
      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-[#2a2a30] pt-3">
          {dr.length > 0 && (
            <div className="bg-[#c9a96e]/5 border border-[#c9a96e]/20 rounded-xl p-3">
              <h5 className="text-[10px] text-[#c9a96e] font-semibold mb-2 uppercase flex items-center gap-1"><UserCheck className="h-3 w-3" /> Reservas Diretas ({dr.length})</h5>
              {dr.map((r,i) => (
                <div key={i} className="bg-[#16161a]/60 rounded-lg p-2 border border-[#2a2a30]/50 mb-1">
                  <div className="flex items-center gap-2 text-[10px] text-[#94918a]"><Calendar className="h-3 w-3" />{r.checkin} → {r.checkout}</div>
                  <div className="flex justify-between mt-1"><span className="text-[11px] text-[#f0eee8]">{r.guest}</span><span className="font-mono text-xs font-bold text-[#c9a96e]">{r.totalValue}</span></div>
                </div>
              ))}
            </div>
          )}
          {fm.map(md => {
            const mi = getMonthIndex(md.month), ml = mi>=0 ? MONTHS_FULL[mi] : md.month
            const r = parseBRL(md.receitaTotal), rs = parseBRL(md.resultado)
            if (r===0 && md.expenses.length===0 && md.reservations.length===0) return null
            return (
              <div key={md.month} className="bg-[#1e1e24]/50 rounded-lg p-3 border border-[#2a2a30]/50">
                <div className="flex justify-between mb-2"><h4 className="text-xs font-semibold text-[#c9a96e] flex items-center gap-1"><Calendar className="h-3 w-3"/>{ml}</h4><span className={`text-xs font-bold font-mono ${rs>=0?'text-emerald-400':'text-red-400'}`}>{fmtBRL(rs)}</span></div>
                {md.reservations.length > 0 && (
                  <div className="mb-2">
                    <h5 className="text-[10px] text-emerald-400 font-semibold mb-1 uppercase flex items-center gap-1"><Users className="h-3 w-3"/>Reservas ({md.reservations.length})</h5>
                    {md.reservations.map((rv,ri) => {
                      const isAdj = rv.source==='adjustment', isDir = rv.guest?.includes('(Direto)')
                      return (
                        <div key={ri} className={`flex items-center text-[11px] py-1 border-b border-[#2a2a30]/30 last:border-0 gap-2 ${isAdj?'pl-4 opacity-80':''}`}>
                          {!isAdj?<span className="font-mono text-[#94918a] w-14 shrink-0">{rv.checkin}→{rv.checkout}</span>:<span className="w-14 shrink-0"/>}
                          <span className={`flex-1 truncate ${isAdj?'text-orange-400/80 text-[10px] italic':'text-[#f0eee8]'}`}>{rv.guest||'—'}</span>
                          {isDir&&<span className="text-[8px] px-1 py-0.5 rounded bg-[#c9a96e]/15 text-[#c9a96e] font-semibold">Direto</span>}
                          {rv.guestOrigin&&!isAdj&&<span className="text-[9px] text-[#94918a] max-w-[60px] truncate">📍{rv.guestOrigin}</span>}
                          <span className={`font-mono font-medium shrink-0 ${isAdj?'text-orange-400':'text-emerald-400'}`}>{rv.revenue}</span>
                        </div>
                      )
                    })}
                    <div className="flex justify-between mt-1.5 pt-1.5 border-t border-[#2a2a30]/50 text-[11px]"><span className="text-[#94918a]">Receita Total</span><span className="font-mono font-bold text-emerald-400">{md.receitaTotal}</span></div>
                  </div>
                )}
                {md.expenses.length > 0 && (
                  <div>
                    <h5 className="text-[10px] text-red-400 font-semibold mb-1 uppercase flex items-center gap-1"><DollarSign className="h-3 w-3"/>Despesas ({md.expenses.length})</h5>
                    {md.expenses.map((e,ei) => (
                      <div key={ei} className="flex items-center text-[11px] py-1 border-b border-[#2a2a30]/30 last:border-0 gap-2"><span className="text-[#f0eee8] flex-1 truncate">{e.label}{e.obs?` (${e.obs})`:''}</span><span className="font-mono text-red-400 font-medium shrink-0">{e.value}</span></div>
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
  const [op, setOp] = useState<{expenses:BizExpense[];totalRow:BizExpense|null;resultadoRow:Record<string,string>}|null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [filter, setFilter] = useState<'all'|'ytd'|'month'>('all')
  const [sel, setSel] = useState(new Date().getMonth())
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState('')

  async function loadData() {
    setLoading(true)
    try {
      const [a, o] = await Promise.all([fetch('/api/apartments'), fetch('/api/apartments/operacao')])
      if (a.ok) { const d = await a.json(); if (Array.isArray(d)) setApts(d) }
      if (o.ok) setOp(await o.json())
    } catch (e:any) { setErr(e.message) }
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
    try {
      const res = await fetch('/api/cron/sync-all')
      const data = await res.json()
      if (data.ok) {
        await loadLastSync()
        await loadData() // Refresh dashboard data
      }
    } catch {}
    finally { setSyncing(false) }
  }

  useEffect(() => { loadData(); loadLastSync() }, [])

  const valid = apts.filter(a => !a.error)
  const totals = useMemo(() => {
    let rec=0,desp=0,res=0,com=0,own=0
    for (const a of valid) { const f=filterMonths(a.months||[],filter,sel); rec+=sumF(f,'receitaTotal'); desp+=sumF(f,'despesaTotal'); res+=sumF(f,'resultado'); com+=sumF(f,'managerCommission'); own+=f.reduce((s,m)=>s+ownerPart(m),0) }
    return {rec,desp,res,com,own}
  }, [valid,filter,sel])

  const bizTotal = useMemo(() => {
    if (!op?.expenses) return 0
    if (filter==='all') return parseBRL(op.totalRow?.total||'0')
    if (filter==='month') return op.expenses.reduce((s,e)=>s+parseBRL(e.values[MONTHS_FULL[sel]]||'0'),0)
    if (filter==='ytd') { const cm=new Date().getMonth(); return op.expenses.reduce((s,e)=>s+MONTHS_FULL.slice(0,cm+1).reduce((ms,m)=>ms+parseBRL(e.values[m]||'0'),0),0) }
    return 0
  }, [op,filter,sel])

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-xl font-bold tracking-tight text-[#f0eee8]">Dashboard</h1><p className="text-xs text-[#94918a] mt-0.5">Sua Casa Leblon — Gestão Completa 2026</p></div>
        <div className="flex items-center gap-2">
          <button onClick={triggerSync} disabled={syncing} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${syncing ? 'bg-[#c9a96e]/20 text-[#c9a96e]' : 'bg-[#c9a96e] text-[#1a1207] hover:bg-[#dbc192]'}`}>
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`}/>{syncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
          {lastSync && <span className="text-[9px] text-[#94918a]">Último sync: {lastSync}</span>}
          <a href="https://docs.google.com/spreadsheets/d/1gSJBIJGlqgSezhtM22kDJ-zl2E0ELKB3rjDRqmN0Vsk/edit" target="_blank" rel="noopener" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs border border-[#2a2a30] text-[#94918a] hover:text-[#f0eee8]"><ExternalLink className="h-3.5 w-3.5"/>Planilha</a>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex rounded-lg border border-[#2a2a30] overflow-hidden text-xs">
          {([{k:'all' as const,l:'Ano'},{k:'ytd' as const,l:'YTD'},{k:'month' as const,l:'Mês'}]).map(f=>(
            <button key={f.k} onClick={()=>setFilter(f.k)} className={`px-4 py-2 font-medium ${filter===f.k?'bg-[#c9a96e] text-[#1a1207]':'bg-[#1e1e24] text-[#94918a] hover:text-[#f0eee8]'}`}>{f.l}</button>
          ))}
        </div>
        {filter==='month'&&(
          <div className="flex items-center gap-1.5 bg-[#1e1e24] rounded-lg border border-[#2a2a30] px-1">
            <button onClick={()=>setSel(s=>s>0?s-1:11)} className="p-1.5 text-[#94918a] hover:text-[#f0eee8]"><ChevronLeft className="h-4 w-4"/></button>
            <span className="text-sm font-medium text-[#f0eee8] min-w-[80px] text-center">{MONTHS_FULL[sel]}</span>
            <button onClick={()=>setSel(s=>s<11?s+1:0)} className="p-1.5 text-[#94918a] hover:text-[#f0eee8]"><ChevronRight className="h-4 w-4"/></button>
          </div>
        )}
      </div>

      {loading && <div className="flex items-center justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-[#c9a96e]"/><span className="ml-2 text-sm text-[#94918a]">Carregando Hospitable + Planilha...</span></div>}
      {err && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-400">{err}</div>}

      {!loading && !err && (<>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[{l:'Receitas Apts',v:totals.rec,c:'text-emerald-400'},{l:'Despesas Apts',v:totals.desp,c:'text-red-400'},{l:'Custos Operação',v:bizTotal,c:'text-red-400'},{l:'Resultado Apts',v:totals.res,c:totals.res>=0?'text-emerald-400':'text-red-400'}].map(({l,v,c})=>(
            <div key={l} className="bg-[#16161a] border border-[#2a2a30] rounded-xl p-4"><p className="text-[10px] text-[#94918a] font-medium uppercase tracking-wider">{l}</p><p className={`text-lg font-bold mt-1 font-mono ${c}`}>{fmtBRL(v)}</p></div>
          ))}
        </div>

        {filter==='month' && valid.length>0 && (
          <div className="bg-[#16161a] border border-[#c9a96e]/20 rounded-xl p-4">
            <h3 className="text-sm text-[#f0eee8] flex items-center gap-2 mb-3 font-semibold"><Calendar className="h-4 w-4 text-[#c9a96e]"/>Totais — {MONTHS_FULL[sel]}</h3>
            <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b border-[#2a2a30]">
              {['Apt','Receita','Despesa','Comissão','Proprietário','Resultado'].map(h=><th key={h} className={`py-2 px-2 text-[#94918a] font-medium ${h==='Apt'?'text-left':'text-right'}`}>{h}</th>)}
            </tr></thead><tbody>
              {valid.map(a=>{const f=filterMonths(a.months||[],'month',sel),r=sumF(f,'receitaTotal'),d=sumF(f,'despesaTotal'),rs=sumF(f,'resultado'),c=sumF(f,'managerCommission'),o=f.reduce((s,m)=>s+ownerPart(m),0);return(
                <tr key={a.name} className="border-b border-[#2a2a30]/30"><td className="py-2 px-2 font-medium text-[#f0eee8]">Apt {a.name}</td><td className="py-2 px-2 text-right font-mono text-emerald-400">{fmtBRL(r)}</td><td className="py-2 px-2 text-right font-mono text-red-400">{fmtBRL(d)}</td><td className="py-2 px-2 text-right font-mono text-[#c9a96e]">{fmtBRL(c)}</td><td className="py-2 px-2 text-right font-mono text-emerald-400">{fmtBRL(o)}</td><td className={`py-2 px-2 text-right font-mono font-bold ${rs>=0?'text-emerald-400':'text-red-400'}`}>{fmtBRL(rs)}</td></tr>
              )})}
              <tr className="border-t-2 border-[#c9a96e]/30 font-bold"><td className="py-2 px-2 text-[#c9a96e]">TOTAL</td><td className="py-2 px-2 text-right font-mono text-emerald-400">{fmtBRL(totals.rec)}</td><td className="py-2 px-2 text-right font-mono text-red-400">{fmtBRL(totals.desp)}</td><td className="py-2 px-2 text-right font-mono text-[#c9a96e]">{fmtBRL(totals.com)}</td><td className="py-2 px-2 text-right font-mono text-emerald-400">{fmtBRL(totals.own)}</td><td className={`py-2 px-2 text-right font-mono ${totals.res>=0?'text-emerald-400':'text-red-400'}`}>{fmtBRL(totals.res)}</td></tr>
            </tbody></table></div>
          </div>
        )}

        {op?.expenses && op.expenses.length>0 && (
          <div className="bg-[#16161a] border border-[#2a2a30] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3"><h3 className="text-sm text-[#f0eee8] flex items-center gap-2 font-semibold"><Briefcase className="h-4 w-4 text-[#c9a96e]"/>Custos Operação</h3><span className="text-sm font-bold font-mono text-red-400">{fmtBRL(bizTotal)}</span></div>
            {op.expenses.filter(e=>{if(filter==='all')return parseBRL(e.total)!==0;if(filter==='month')return parseBRL(e.values[MONTHS_FULL[sel]]||'0')!==0;return true}).map((e,i)=>{
              let val=e.total;if(filter==='month')val=e.values[MONTHS_FULL[sel]]||'R$ 0,00';if(filter==='ytd'){const cm=new Date().getMonth();val=fmtBRL(MONTHS_FULL.slice(0,cm+1).reduce((s,m)=>s+parseBRL(e.values[m]||'0'),0))}
              return <div key={i} className="flex justify-between text-[11px] py-1.5 border-b border-[#2a2a30]/30 last:border-0"><span className="text-[#f0eee8]">{e.label}</span><span className="font-mono text-red-400 font-medium">{val}</span></div>
            })}
          </div>
        )}

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
