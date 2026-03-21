'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, CheckCircle2, Clock, AlertCircle, Loader2, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { fmtBRL, MONTHS_FULL } from '@/lib/types'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
const APARTMENTS = ['103', '403', '102', '303', '334A']
const TYPES: Record<string, string> = { checkout: 'Check-out', checkin: 'Check-in', manutencao: 'Manutenção', deep_clean: 'Limpeza Profunda' }
const STATUSES: Record<string, { label: string; color: string }> = {
  agendada: { label: 'Agendada', color: 'text-blue-400 bg-blue-500/15' },
  em_andamento: { label: 'Em andamento', color: 'text-yellow-400 bg-yellow-500/15' },
  concluida: { label: 'Concluída', color: 'text-emerald-400 bg-emerald-500/15' },
  cancelada: { label: 'Cancelada', color: 'text-[#94918a] bg-[#94918a]/15' },
}

interface Cleaning { id?: number; apartment_code: string; scheduled_date: string; scheduled_time: string; cleaner_name: string; status: string; checkout_guest: string; checkin_guest: string; type: string; notes: string; manually_edited: boolean; cost: number | null; completed_at: string | null }

export default function LimpezasPage() {
  const [cleanings, setCleanings] = useState<Cleaning[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filterApt, setFilterApt] = useState('all')
  const [form, setForm] = useState<Partial<Cleaning>>({ apartment_code: '103', scheduled_date: new Date().toISOString().slice(0, 10), scheduled_time: '11:00', cleaner_name: '', status: 'agendada', type: 'checkout', notes: '', cost: 150 })

  async function load() {
    setLoading(true)
    let q = supabase.from('cleanings').select('*').order('scheduled_date', { ascending: false }).limit(50)
    if (filterApt !== 'all') q = q.eq('apartment_code', filterApt)
    const { data } = await q
    if (data) setCleanings(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [filterApt])

  async function save() {
    if (!form.apartment_code || !form.scheduled_date) return
    const payload = { ...form, manually_edited: true }
    await supabase.from('cleanings').insert(payload)
    setShowForm(false)
    setForm({ apartment_code: '103', scheduled_date: new Date().toISOString().slice(0, 10), scheduled_time: '11:00', cleaner_name: '', status: 'agendada', type: 'checkout', notes: '', cost: 150 })
    load()
  }

  async function updateStatus(id: number, status: string) {
    const update: any = { status, manually_edited: true }
    if (status === 'concluida') update.completed_at = new Date().toISOString()
    await supabase.from('cleanings').update(update).eq('id', id)
    load()
  }

  async function remove(id: number) { await supabase.from('cleanings').delete().eq('id', id); load() }

  const totalCost = cleanings.filter(c => c.status === 'concluida').reduce((s, c) => s + (Number(c.cost) || 0), 0)

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-xl font-bold tracking-tight text-[#f0eee8]">Limpezas</h1><p className="text-xs text-[#94918a] mt-0.5">Agenda de limpezas integrada com app Giro Temporada</p></div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 bg-[#c9a96e] text-[#1a1207] px-4 py-2 rounded-lg text-xs font-semibold hover:bg-[#dbc192]"><Plus className="h-3.5 w-3.5" /> Nova Limpeza</button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex rounded-lg border border-[#2a2a30] overflow-hidden text-xs">
          <button onClick={() => setFilterApt('all')} className={`px-4 py-2 font-medium ${filterApt === 'all' ? 'bg-[#c9a96e] text-[#1a1207]' : 'bg-[#1e1e24] text-[#94918a] hover:text-[#f0eee8]'}`}>Todos</button>
          {APARTMENTS.map(a => (<button key={a} onClick={() => setFilterApt(a)} className={`px-3 py-2 font-medium ${filterApt === a ? 'bg-[#c9a96e] text-[#1a1207]' : 'bg-[#1e1e24] text-[#94918a] hover:text-[#f0eee8]'}`}>{a}</button>))}
        </div>
        <div className="ml-auto text-xs text-[#94918a]">Custo total concluídas: <span className="font-mono font-bold text-red-400">{fmtBRL(totalCost)}</span></div>
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

      {loading ? (<div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-[#c9a96e]" /></div>
      ) : cleanings.length === 0 ? (
        <div className="bg-[#16161a] border border-[#2a2a30] rounded-xl p-8 text-center"><Sparkles className="h-8 w-8 text-[#c9a96e]/30 mx-auto mb-3" /><p className="text-sm text-[#94918a]">Nenhuma limpeza encontrada</p></div>
      ) : (
        <div className="space-y-2">
          {cleanings.map(c => (
            <div key={c.id} className={`bg-[#16161a] border rounded-xl p-4 ${c.manually_edited ? 'border-[#c9a96e]/30' : 'border-[#2a2a30]'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#f0eee8]">Apt {c.apartment_code}</span>
                  <span className="text-xs font-mono text-[#94918a]">{c.scheduled_date} {c.scheduled_time}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUSES[c.status]?.color || 'text-[#94918a]'}`}>{STATUSES[c.status]?.label || c.status}</span>
                  <span className="text-[10px] text-[#94918a]">{TYPES[c.type] || c.type}</span>
                  {c.manually_edited && <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#c9a96e]/15 text-[#c9a96e] font-bold">MANUAL</span>}
                </div>
                <div className="flex items-center gap-1">
                  {c.status === 'agendada' && <button onClick={() => updateStatus(c.id!, 'concluida')} className="text-emerald-400 hover:bg-emerald-400/10 p-1 rounded"><CheckCircle2 className="h-4 w-4" /></button>}
                  <button onClick={() => remove(c.id!)} className="text-[#94918a] hover:text-red-400 p-1 rounded"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-[#94918a]">
                {c.cleaner_name && <span>Faxineira: {c.cleaner_name}</span>}
                {c.checkout_guest && <span>Saindo: {c.checkout_guest}</span>}
                {c.checkin_guest && <span>Entrando: {c.checkin_guest}</span>}
                {c.cost && <span className="font-mono text-red-400">{fmtBRL(Number(c.cost))}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
