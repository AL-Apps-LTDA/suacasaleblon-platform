'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, CheckCircle2, Clock, AlertCircle, Loader2, Sparkles, DollarSign, Users, Camera, RefreshCw, Wrench, ClipboardList } from 'lucide-react'
import { fmtBRL } from '@/lib/types'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
const APARTMENTS = ['103', '403', '102', '303', '334A']
const TYPES: Record<string, string> = { checkout: 'Check-out', checkin: 'Check-in', manutencao: 'Manutenção', deep_clean: 'Limpeza Profunda' }
const STATUSES: Record<string, { label: string; color: string; icon: any }> = {
  agendada: { label: 'Agendada', color: 'text-blue-400 bg-blue-500/15', icon: Clock },
  em_andamento: { label: 'Em andamento', color: 'text-yellow-400 bg-yellow-500/15', icon: RefreshCw },
  concluida: { label: 'Concluída', color: 'text-emerald-400 bg-emerald-500/15', icon: CheckCircle2 },
  cancelada: { label: 'Cancelada', color: 'text-[#94918a] bg-[#94918a]/15', icon: AlertCircle },
}

interface Cleaning { id?: number; apartment_code: string; scheduled_date: string; cleaning_date: string | null; scheduled_time: string; cleaner_name: string; cleaner_id: string | null; status: string; checkout_guest: string; checkin_guest: string; type: string; notes: string; observations: string | null; manually_edited: boolean; cost: number | null; cleaning_cost: number | null; completed: boolean; completed_at: string | null; photos: string[]; source: string; guest_count: number | null; sort_order: number; created_at: string; updated_at: string | null }
type Tab = 'agenda' | 'gastos' | 'manutencao' | 'ocorrencias'

export default function LimpezasPage() {
  const [cleanings, setCleanings] = useState<Cleaning[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [maintenance, setMaintenance] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filterApt, setFilterApt] = useState('all')
  const [tab, setTab] = useState<Tab>('agenda')
  const [form, setForm] = useState<Partial<Cleaning>>({ apartment_code: '103', scheduled_date: new Date().toISOString().slice(0, 10), scheduled_time: '11:00', cleaner_name: '', status: 'agendada', type: 'checkout', notes: '', cost: 150, source: 'admin' })

  const loadCleanings = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('cleanings').select('*').order('scheduled_date', { ascending: false }).limit(100)
    if (filterApt !== 'all') q = q.eq('apartment_code', filterApt)
    const { data } = await q
    if (data) setCleanings(data)
    setLoading(false)
  }, [filterApt])

  const loadExtras = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        supabase.from('expenses').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('cleaner_payments').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('maintenance_items').select('*').order('created_at', { ascending: false }).limit(30),
        supabase.from('reports').select('*').order('created_at', { ascending: false }).limit(30),
      ])
      if (results[0].status === 'fulfilled' && results[0].value.data) setExpenses(results[0].value.data)
      if (results[1].status === 'fulfilled' && results[1].value.data) setPayments(results[1].value.data)
      if (results[2].status === 'fulfilled' && results[2].value.data) setMaintenance(results[2].value.data)
      if (results[3].status === 'fulfilled' && results[3].value.data) setReports(results[3].value.data)
    } catch (e) { console.warn('Erro ao carregar dados extras de limpezas:', e) }
  }, [])

  useEffect(() => { loadCleanings() }, [loadCleanings])
  useEffect(() => { loadExtras() }, [loadExtras])

  async function save() {
    if (!form.apartment_code || !form.scheduled_date) return
    await supabase.from('cleanings').insert({ ...form, manually_edited: true, source: 'admin' })
    setShowForm(false)
    setForm({ apartment_code: '103', scheduled_date: new Date().toISOString().slice(0, 10), scheduled_time: '11:00', cleaner_name: '', status: 'agendada', type: 'checkout', notes: '', cost: 150, source: 'admin' })
    loadCleanings()
  }

  async function updateStatus(id: number, status: string) {
    const update: any = { status, manually_edited: true }
    if (status === 'concluida') update.completed_at = new Date().toISOString()
    await supabase.from('cleanings').update(update).eq('id', id)
    loadCleanings()
  }

  async function remove(id: number) { await supabase.from('cleanings').delete().eq('id', id); loadCleanings() }

  const totalCostCompleted = cleanings.filter(c => c.status === 'concluida' || c.completed).reduce((s, c) => s + (Number(c.cost || c.cleaning_cost) || 0), 0)
  const totalScheduled = cleanings.filter(c => c.status === 'agendada' || (!c.completed && c.status !== 'cancelada')).length
  const fromApp = cleanings.filter(c => c.source && c.source !== 'admin' && c.source !== 'manual').length
  const totalExpenses = expenses.reduce((s: number, e: any) => s + Number(e.amount), 0)
  const openReports = reports.filter((r: any) => r.status === 'open').length

  const TABS: { key: Tab; label: string; icon: any; badge?: number }[] = [
    { key: 'agenda', label: 'Agenda', icon: ClipboardList, badge: totalScheduled },
    { key: 'gastos', label: 'Gastos', icon: DollarSign },
    { key: 'manutencao', label: 'Manutenção', icon: Wrench },
    { key: 'ocorrencias', label: 'Ocorrências', icon: AlertCircle, badge: openReports },
  ]

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#f0eee8]">Limpezas & Operações</h1>
          <p className="text-xs text-[#94918a] mt-0.5">Integrado com app Giro Temporada{fromApp > 0 && <span className="ml-2 text-[#c9a96e]">• {fromApp} do app</span>}</p>
        </div>
        <button onClick={() => { setTab('agenda'); setShowForm(true) }} className="flex items-center gap-1.5 bg-[#c9a96e] text-[#1a1207] px-4 py-2 rounded-lg text-xs font-semibold hover:bg-[#dbc192]"><Plus className="h-3.5 w-3.5" /> Nova Limpeza</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Agendadas', value: totalScheduled, color: 'text-blue-400' },
          { label: 'Custo concluídas', value: fmtBRL(totalCostCompleted), color: 'text-red-400' },
          { label: 'Gastos (app)', value: fmtBRL(totalExpenses), color: 'text-orange-400' },
          { label: 'Ocorrências abertas', value: openReports, color: 'text-yellow-400' },
        ].map(s => (
          <div key={s.label} className="bg-[#16161a] border border-[#2a2a30] rounded-xl p-3">
            <p className="text-[10px] text-[#94918a] uppercase">{s.label}</p>
            <p className={`text-lg font-bold font-mono ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex rounded-lg border border-[#2a2a30] overflow-hidden text-xs">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 px-4 py-2.5 font-medium transition-colors ${tab === t.key ? 'bg-[#c9a96e] text-[#1a1207]' : 'bg-[#1e1e24] text-[#94918a] hover:text-[#f0eee8]'}`}>
            <t.icon className="h-3.5 w-3.5" />{t.label}
            {t.badge ? <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab === t.key ? 'bg-[#1a1207]/20' : 'bg-[#c9a96e]/20 text-[#c9a96e]'}`}>{t.badge}</span> : null}
          </button>
        ))}
      </div>

      {tab === 'agenda' && (<>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg border border-[#2a2a30] overflow-hidden text-xs">
            <button onClick={() => setFilterApt('all')} className={`px-4 py-2 font-medium ${filterApt === 'all' ? 'bg-[#c9a96e] text-[#1a1207]' : 'bg-[#1e1e24] text-[#94918a] hover:text-[#f0eee8]'}`}>Todos</button>
            {APARTMENTS.map(a => (<button key={a} onClick={() => setFilterApt(a)} className={`px-3 py-2 font-medium ${filterApt === a ? 'bg-[#c9a96e] text-[#1a1207]' : 'bg-[#1e1e24] text-[#94918a] hover:text-[#f0eee8]'}`}>{a}</button>))}
          </div>
        </div>

        {showForm && (
          <div className="bg-[#16161a] border border-[#c9a96e]/20 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[#f0eee8]">Agendar limpeza</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div><label className="text-[10px] text-[#94918a] uppercase block mb-1">Apartamento</label><select value={form.apartment_code} onChange={e => setForm(f => ({ ...f, apartment_code: e.target.value }))} className="w-full bg-[#1e1e24] border border-[#2a2a30] rounded-lg px-3 py-2 text-xs text-[#f0eee8]">{APARTMENTS.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
              <div><label className="text-[10px] text-[#94918a] uppercase block mb-1">Data</label><input type="date" value={form.scheduled_date} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} className="w-full bg-[#1e1e24] border border-[#2a2a30] rounded-lg px-3 py-2 text-xs text-[#f0eee8]" /></div>
              <div><label className="text-[10px] text-[#94918a] uppercase block mb-1">Horário</label><input type="time" value={form.scheduled_time} onChange={e => setForm(f => ({ ...f, scheduled_time: e.target.value }))} className="w-full bg-[#1e1e24] border border-[#2a2a30] rounded-lg px-3 py-2 text-xs text-[#f0eee8]" /></div>
              <div><label className="text-[10px] text-[#94918a] uppercase block mb-1">Tipo</label><select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full bg-[#1e1e24] border border-[#2a2a30] rounded-lg px-3 py-2 text-xs text-[#f0eee8]">{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div><label className="text-[10px] text-[#94918a] uppercase block mb-1">Faxineira</label><input type="text" value={form.cleaner_name || ''} onChange={e => setForm(f => ({ ...f, cleaner_name: e.target.value }))} placeholder="Nome" className="w-full bg-[#1e1e24] border border-[#2a2a30] rounded-lg px-3 py-2 text-xs text-[#f0eee8]" /></div>
              <div><label className="text-[10px] text-[#94918a] uppercase block mb-1">Custo (R$)</label><input type="number" value={form.cost || ''} onChange={e => setForm(f => ({ ...f, cost: parseFloat(e.target.value) || 0 }))} className="w-full bg-[#1e1e24] border border-[#2a2a30] rounded-lg px-3 py-2 text-xs text-[#f0eee8]" /></div>
              <div><label className="text-[10px] text-[#94918a] uppercase block mb-1">Hóspede saindo</label><input type="text" value={form.checkout_guest || ''} onChange={e => setForm(f => ({ ...f, checkout_guest: e.target.value }))} className="w-full bg-[#1e1e24] border border-[#2a2a30] rounded-lg px-3 py-2 text-xs text-[#f0eee8]" /></div>
              <div><label className="text-[10px] text-[#94918a] uppercase block mb-1">Hóspede entrando</label><input type="text" value={form.checkin_guest || ''} onChange={e => setForm(f => ({ ...f, checkin_guest: e.target.value }))} className="w-full bg-[#1e1e24] border border-[#2a2a30] rounded-lg px-3 py-2 text-xs text-[#f0eee8]" /></div>
            </div>
            <div className="flex gap-2">
              <button onClick={save} className="bg-[#c9a96e] text-[#1a1207] px-4 py-2 rounded-lg text-xs font-semibold hover:bg-[#dbc192]">Salvar</button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-xs text-[#94918a] border border-[#2a2a30]">Cancelar</button>
            </div>
          </div>
        )}

        {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-[#c9a96e]" /></div>
        : cleanings.length === 0 ? <div className="bg-[#16161a] border border-[#2a2a30] rounded-xl p-8 text-center"><Sparkles className="h-8 w-8 text-[#c9a96e]/30 mx-auto mb-3" /><p className="text-sm text-[#94918a]">Nenhuma limpeza encontrada</p></div>
        : <div className="space-y-2">{cleanings.map(c => {
            const es = c.completed && c.status !== 'concluida' ? 'concluida' : (c.status || 'agendada')
            const si = STATUSES[es] || STATUSES.agendada
            const SI = si.icon
            const cost = Number(c.cost || c.cleaning_cost) || 0
            const hasPhotos = c.photos && Array.isArray(c.photos) && c.photos.length > 0
            const isApp = c.source && c.source !== 'admin' && c.source !== 'manual'
            return (
              <div key={c.id} className={`bg-[#16161a] border rounded-xl p-4 ${c.manually_edited ? 'border-[#c9a96e]/30' : 'border-[#2a2a30]'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-[#f0eee8]">Apt {c.apartment_code}</span>
                    <span className="text-xs font-mono text-[#94918a]">{c.scheduled_date || c.cleaning_date} {c.scheduled_time || ''}</span>
                    <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold ${si.color}`}><SI className="h-3 w-3" />{si.label}</span>
                    <span className="text-[10px] text-[#94918a]">{TYPES[c.type] || c.type || ''}</span>
                    {c.manually_edited && <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#c9a96e]/15 text-[#c9a96e] font-bold">MANUAL</span>}
                    {isApp && <span className="text-[8px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 font-bold">APP</span>}
                    {hasPhotos && <Camera className="h-3 w-3 text-[#94918a]" />}
                  </div>
                  <div className="flex items-center gap-1">
                    {es === 'agendada' && <button onClick={() => updateStatus(c.id!, 'concluida')} className="text-emerald-400 hover:bg-emerald-400/10 p-1 rounded"><CheckCircle2 className="h-4 w-4" /></button>}
                    <button onClick={() => remove(c.id!)} className="text-[#94918a] hover:text-red-400 p-1 rounded"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-[#94918a] flex-wrap">
                  {c.cleaner_name && <span>Faxineira: {c.cleaner_name}</span>}
                  {c.checkout_guest && <span>Saindo: {c.checkout_guest}</span>}
                  {c.checkin_guest && <span>Entrando: {c.checkin_guest}</span>}
                  {c.guest_count && <span><Users className="h-3 w-3 inline" /> {c.guest_count}</span>}
                  {c.observations && <span className="italic">&ldquo;{c.observations}&rdquo;</span>}
                  {cost > 0 && <span className="font-mono text-red-400">{fmtBRL(cost)}</span>}
                </div>
              </div>
            )
          })}</div>}
      </>)}

      {tab === 'gastos' && (<div className="space-y-4">
        <div className="flex items-center justify-between"><p className="text-sm text-[#94918a]">Gastos registrados pelo app de limpezas</p><p className="text-xs font-mono text-red-400 font-bold">Total: {fmtBRL(totalExpenses)}</p></div>
        {expenses.length === 0 ? <div className="bg-[#16161a] border border-[#2a2a30] rounded-xl p-8 text-center"><p className="text-sm text-[#94918a]">Nenhum gasto registrado ainda</p></div>
        : <div className="space-y-2">{expenses.map((e: any) => (
            <div key={e.id} className="bg-[#16161a] border border-[#2a2a30] rounded-xl p-3 flex items-center justify-between">
              <div><p className="text-xs text-[#f0eee8]">{e.description || e.label || 'Sem descrição'}</p><p className="text-[10px] text-[#94918a]">{e.expense_date || ''} {e.apartment_code ? `• Apt ${e.apartment_code}` : ''}</p></div>
              <span className="text-xs font-mono font-bold text-red-400">{fmtBRL(Number(e.amount))}</span>
            </div>
          ))}</div>}
        {payments.length > 0 && (<><h3 className="text-sm font-semibold text-[#f0eee8] pt-4">Pagamentos a faxineiras</h3><div className="space-y-2">{payments.map((p: any) => (
          <div key={p.id} className="bg-[#16161a] border border-[#2a2a30] rounded-xl p-3 flex items-center justify-between">
            <div><p className="text-xs text-[#f0eee8]">{p.label || p.type}</p><p className="text-[10px] text-[#94918a]">{new Date(p.created_at).toLocaleDateString('pt-BR')}</p></div>
            <span className="text-xs font-mono font-bold text-orange-400">{fmtBRL(Number(p.amount))}</span>
          </div>
        ))}</div></>)}
      </div>)}

      {tab === 'manutencao' && (<div className="space-y-2"><p className="text-sm text-[#94918a] mb-3">Itens de manutenção do app</p>
        {maintenance.length === 0 ? <div className="bg-[#16161a] border border-[#2a2a30] rounded-xl p-8 text-center"><p className="text-sm text-[#94918a]">Nenhum item de manutenção</p></div>
        : maintenance.map((m: any) => (
          <div key={m.id} className="bg-[#16161a] border border-[#2a2a30] rounded-xl p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><span className="text-xs font-bold text-[#f0eee8]">{m.title}</span>{m.apartment_code && <span className="text-[10px] text-[#94918a]">Apt {m.apartment_code}</span>}</div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${m.urgency === 'alta' ? 'text-red-400 bg-red-500/15' : m.urgency === 'media' ? 'text-yellow-400 bg-yellow-500/15' : 'text-[#94918a] bg-[#94918a]/15'}`}>{m.urgency}</span>
            </div>
            <p className="text-[10px] text-[#94918a] mt-1">{m.last_done_at ? `Último: ${new Date(m.last_done_at).toLocaleDateString('pt-BR')}` : 'Nunca feito'}</p>
          </div>
        ))}
      </div>)}

      {tab === 'ocorrencias' && (<div className="space-y-2"><p className="text-sm text-[#94918a] mb-3">Ocorrências reportadas pelo app</p>
        {reports.length === 0 ? <div className="bg-[#16161a] border border-[#2a2a30] rounded-xl p-8 text-center"><p className="text-sm text-[#94918a]">Nenhuma ocorrência</p></div>
        : reports.map((r: any) => (
          <div key={r.id} className={`bg-[#16161a] border rounded-xl p-3 ${r.status === 'open' ? 'border-yellow-500/30' : 'border-[#2a2a30]'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><span className="text-xs font-bold text-[#f0eee8]">{r.title}</span><span className="text-[10px] text-[#94918a]">Apt {r.apartment_code}</span></div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${r.urgency === 'urgente' ? 'text-red-400 bg-red-500/15' : 'text-yellow-400 bg-yellow-500/15'}`}>{r.urgency}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${r.status === 'open' ? 'text-yellow-400 bg-yellow-500/15' : 'text-emerald-400 bg-emerald-500/15'}`}>{r.status === 'open' ? 'Aberta' : 'Resolvida'}</span>
              </div>
            </div>
            <p className="text-[10px] text-[#94918a] mt-1">{new Date(r.created_at).toLocaleDateString('pt-BR')}</p>
          </div>
        ))}
      </div>)}
    </div>
  )
}
