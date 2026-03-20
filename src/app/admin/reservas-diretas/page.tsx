'use client'

import { useState, useEffect } from 'react'
import { CalendarDays, Plus, Loader2, CheckCircle2, Trash2 } from 'lucide-react'
import { fmtBRL, APARTMENTS } from '@/lib/types'

interface DirectRes {
  id: string
  apartment: string
  guest: string
  checkin: string
  checkout: string
  totalValue: string
  paid: string
  obs: string
  syncedToSheet?: boolean
  source?: string
}

export default function ReservasDiretasPage() {
  const [reservas, setReservas] = useState<DirectRes[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [form, setForm] = useState({ apartment: '103', guestName: '', checkin: '', checkout: '', totalValue: '', paid: '', obs: '' })

  useEffect(() => {
    fetch('/api/direct-reservations').then(r => r.json()).then(d => { if (Array.isArray(d)) setReservas(d) }).finally(() => setLoading(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/direct-reservations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (res.ok) {
      const newRes = await res.json()
      setReservas(prev => [newRes, ...prev])
      setForm({ apartment: '103', guestName: '', checkin: '', checkout: '', totalValue: '', paid: '', obs: '' })
      setShowForm(false)
    }
  }

  async function handleSync() {
    setSyncing(true)
    await fetch('/api/direct-reservations/sync-to-sheet', { method: 'POST' })
    // Refresh
    const r = await fetch('/api/direct-reservations')
    if (r.ok) setReservas(await r.json())
    setSyncing(false)
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#f0eee8]">Reservas Diretas</h1>
          <p className="text-xs text-[#94918a] mt-0.5">Reservas fora do Airbnb/Booking — gerenciadas manualmente</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSync} disabled={syncing} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs border border-[#c9a96e]/30 text-[#c9a96e] hover:bg-[#c9a96e]/10 disabled:opacity-50">
            {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            Sync → Planilha
          </button>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-[#c9a96e] text-[#1a1207] font-semibold hover:bg-[#c9a96e]/90">
            <Plus className="h-3.5 w-3.5" /> Nova Reserva
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-[#16161a] border border-[#c9a96e]/20 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] text-[#94918a] uppercase">Apartamento</label>
              <select value={form.apartment} onChange={e => setForm({...form, apartment: e.target.value})} className="w-full mt-1 bg-[#1e1e24] border border-[#2a2a30] rounded-lg px-3 py-2 text-sm text-[#f0eee8]">
                {APARTMENTS.map(a => <option key={a} value={a}>Apt {a}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[#94918a] uppercase">Hóspede</label>
              <input value={form.guestName} onChange={e => setForm({...form, guestName: e.target.value})} className="w-full mt-1 bg-[#1e1e24] border border-[#2a2a30] rounded-lg px-3 py-2 text-sm text-[#f0eee8]" placeholder="Nome" required />
            </div>
            <div>
              <label className="text-[10px] text-[#94918a] uppercase">Check-in (DD/MM/AAAA)</label>
              <input value={form.checkin} onChange={e => setForm({...form, checkin: e.target.value})} className="w-full mt-1 bg-[#1e1e24] border border-[#2a2a30] rounded-lg px-3 py-2 text-sm text-[#f0eee8]" placeholder="01/04/2026" required />
            </div>
            <div>
              <label className="text-[10px] text-[#94918a] uppercase">Check-out (DD/MM/AAAA)</label>
              <input value={form.checkout} onChange={e => setForm({...form, checkout: e.target.value})} className="w-full mt-1 bg-[#1e1e24] border border-[#2a2a30] rounded-lg px-3 py-2 text-sm text-[#f0eee8]" placeholder="05/04/2026" required />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-[#94918a] uppercase">Valor Total</label>
              <input value={form.totalValue} onChange={e => setForm({...form, totalValue: e.target.value})} className="w-full mt-1 bg-[#1e1e24] border border-[#2a2a30] rounded-lg px-3 py-2 text-sm text-[#f0eee8]" placeholder="R$ 2.500,00" required />
            </div>
            <div>
              <label className="text-[10px] text-[#94918a] uppercase">Pago</label>
              <input value={form.paid} onChange={e => setForm({...form, paid: e.target.value})} className="w-full mt-1 bg-[#1e1e24] border border-[#2a2a30] rounded-lg px-3 py-2 text-sm text-[#f0eee8]" placeholder="R$ 2.500,00" />
            </div>
            <div>
              <label className="text-[10px] text-[#94918a] uppercase">Obs</label>
              <input value={form.obs} onChange={e => setForm({...form, obs: e.target.value})} className="w-full mt-1 bg-[#1e1e24] border border-[#2a2a30] rounded-lg px-3 py-2 text-sm text-[#f0eee8]" />
            </div>
          </div>
          <button type="submit" className="bg-[#c9a96e] text-[#1a1207] px-4 py-2 rounded-lg text-xs font-semibold">Salvar</button>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-[#c9a96e]" /></div>
      ) : (
        <div className="space-y-2">
          {reservas.map(r => (
            <div key={r.id} className="bg-[#16161a] border border-[#2a2a30] rounded-xl p-3 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-[#c9a96e]/10 flex items-center justify-center shrink-0">
                <CalendarDays className="h-5 w-5 text-[#c9a96e]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#f0eee8]">{r.guest}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1e1e24] text-[#94918a]">Apt {r.apartment}</span>
                  {r.syncedToSheet && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-emerald-400/15 text-emerald-400 font-semibold">Sync</span>}
                </div>
                <span className="text-[11px] text-[#94918a] font-mono">{r.checkin} → {r.checkout}</span>
              </div>
              <span className="font-mono text-sm font-bold text-[#c9a96e]">{r.totalValue}</span>
            </div>
          ))}
          {reservas.length === 0 && <p className="text-sm text-[#94918a] text-center py-8">Nenhuma reserva direta cadastrada.</p>}
        </div>
      )}
    </div>
  )
}
