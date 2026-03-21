'use client'
import { useState, useEffect } from 'react'
import { CalendarDays, Plus, Loader2, Trash2, MessageCircle } from 'lucide-react'
import { fmtBRL } from '@/lib/types'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
const APARTMENTS = ['103', '403', '102', '303', '334A']

interface DirectRes { id?: number; apartment_code: string; guest_name: string; guest_phone: string; guest_email: string; checkin: string; checkout: string; guests: number; total_value: number; cleaning_fee: number; payment_method: string; payment_status: string; notes: string }

export default function ReservasDiretasPage() {
  const [reservas, setReservas] = useState<DirectRes[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Partial<DirectRes>>({ apartment_code: '103', guest_name: '', guest_phone: '', guest_email: '', checkin: '', checkout: '', guests: 2, total_value: 0, cleaning_fee: 150, payment_method: 'pix', payment_status: 'pendente', notes: '' })

  async function load() { setLoading(true); const { data } = await supabase.from('direct_reservations').select('*').order('checkin', { ascending: false }); if (data) setReservas(data); setLoading(false) }
  useEffect(() => { load() }, [])

  async function save() {
    if (!form.guest_name || !form.checkin || !form.checkout) return
    await supabase.from('direct_reservations').insert(form)
    setShowForm(false); setForm({ apartment_code: '103', guest_name: '', guest_phone: '', guest_email: '', checkin: '', checkout: '', guests: 2, total_value: 0, cleaning_fee: 150, payment_method: 'pix', payment_status: 'pendente', notes: '' }); load()
  }

  async function updatePayment(id: number, status: string) { await supabase.from('direct_reservations').update({ payment_status: status }).eq('id', id); load() }
  async function remove(id: number) { await supabase.from('direct_reservations').delete().eq('id', id); load() }

  const total = reservas.reduce((s, r) => s + Number(r.total_value), 0)
  const pago = reservas.filter(r => r.payment_status === 'pago').reduce((s, r) => s + Number(r.total_value), 0)

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-xl font-bold tracking-tight text-[#f0eee8]">Reservas Diretas</h1><p className="text-xs text-[#94918a] mt-0.5">Reservas feitas pelo site, WhatsApp ou contato direto</p></div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 bg-[#c9a96e] text-[#1a1207] px-4 py-2 rounded-lg text-xs font-semibold hover:bg-[#dbc192]"><Plus className="h-3.5 w-3.5" /> Nova Reserva</button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#16161a] border border-[#2a2a30] rounded-xl p-4"><p className="text-[10px] text-[#94918a] uppercase">Total reservas</p><p className="text-lg font-bold text-[#c9a96e] font-mono mt-1">{fmtBRL(total)}</p></div>
        <div className="bg-[#16161a] border border-[#2a2a30] rounded-xl p-4"><p className="text-[10px] text-[#94918a] uppercase">Pago</p><p className="text-lg font-bold text-emerald-400 font-mono mt-1">{fmtBRL(pago)}</p></div>
      </div>

      {showForm && (
        <div className="bg-[#16161a] border border-[#c9a96e]/20 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-[#f0eee8]">Nova reserva manual</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><label className="text-[10px] text-[#94918a] uppercase block mb-1">Apartamento</label><select value={form.apartment_code} onChange={e => setForm(f => ({ ...f, apartment_code: e.target.value }))} className="w-full bg-[#1e1e24] border border-[#2a2a30] rounded-lg px-3 py-2 text-xs text-[#f0eee8]">{APARTMENTS.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
            <div><label className="text-[10px] text-[#94918a] uppercase block mb-1">Hóspede</label><input type="text" value={form.guest_name} onChange={e => setForm(f => ({ ...f, guest_name: e.target.value }))} placeholder="Nome" className="w-full bg-[#1e1e24] border border-[#2a2a30] rounded-lg px-3 py-2 text-xs text-[#f0eee8]" /></div>
            <div><label className="text-[10px] text-[#94918a] uppercase block mb-1">WhatsApp</label><input type="tel" value={form.guest_phone} onChange={e => setForm(f => ({ ...f, guest_phone: e.target.value }))} placeholder="+5521..." className="w-full bg-[#1e1e24] border border-[#2a2a30] rounded-lg px-3 py-2 text-xs text-[#f0eee8]" /></div>
            <div><label className="text-[10px] text-[#94918a] uppercase block mb-1">Email</label><input type="email" value={form.guest_email} onChange={e => setForm(f => ({ ...f, guest_email: e.target.value }))} className="w-full bg-[#1e1e24] border border-[#2a2a30] rounded-lg px-3 py-2 text-xs text-[#f0eee8]" /></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div><label className="text-[10px] text-[#94918a] uppercase block mb-1">Check-in</label><input type="date" value={form.checkin} onChange={e => setForm(f => ({ ...f, checkin: e.target.value }))} className="w-full bg-[#1e1e24] border border-[#2a2a30] rounded-lg px-3 py-2 text-xs text-[#f0eee8]" /></div>
            <div><label className="text-[10px] text-[#94918a] uppercase block mb-1">Check-out</label><input type="date" value={form.checkout} onChange={e => setForm(f => ({ ...f, checkout: e.target.value }))} className="w-full bg-[#1e1e24] border border-[#2a2a30] rounded-lg px-3 py-2 text-xs text-[#f0eee8]" /></div>
            <div><label className="text-[10px] text-[#94918a] uppercase block mb-1">Valor total</label><input type="number" value={form.total_value || ''} onChange={e => setForm(f => ({ ...f, total_value: parseFloat(e.target.value) || 0 }))} className="w-full bg-[#1e1e24] border border-[#2a2a30] rounded-lg px-3 py-2 text-xs text-[#f0eee8]" /></div>
            <div><label className="text-[10px] text-[#94918a] uppercase block mb-1">Pagamento</label><select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))} className="w-full bg-[#1e1e24] border border-[#2a2a30] rounded-lg px-3 py-2 text-xs text-[#f0eee8]"><option value="pix">Pix</option><option value="cartao">Cartão</option><option value="dinheiro">Dinheiro</option><option value="transferencia">Transferência</option></select></div>
            <div><label className="text-[10px] text-[#94918a] uppercase block mb-1">Status</label><select value={form.payment_status} onChange={e => setForm(f => ({ ...f, payment_status: e.target.value }))} className="w-full bg-[#1e1e24] border border-[#2a2a30] rounded-lg px-3 py-2 text-xs text-[#f0eee8]"><option value="pendente">Pendente</option><option value="pago">Pago</option><option value="parcial">Parcial</option></select></div>
          </div>
          <div><label className="text-[10px] text-[#94918a] uppercase block mb-1">Notas</label><input type="text" value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Observações..." className="w-full bg-[#1e1e24] border border-[#2a2a30] rounded-lg px-3 py-2 text-xs text-[#f0eee8]" /></div>
          <div className="flex gap-2">
            <button onClick={save} className="bg-[#c9a96e] text-[#1a1207] px-4 py-2 rounded-lg text-xs font-semibold">Salvar</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-xs text-[#94918a] border border-[#2a2a30]">Cancelar</button>
          </div>
        </div>
      )}

      {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-[#c9a96e]" /></div> : reservas.length === 0 ? (
        <div className="bg-[#16161a] border border-[#2a2a30] rounded-xl p-8 text-center"><CalendarDays className="h-8 w-8 text-[#c9a96e]/30 mx-auto mb-3" /><p className="text-sm text-[#94918a]">Nenhuma reserva direta cadastrada</p></div>
      ) : (
        <div className="space-y-2">
          {reservas.map(r => (
            <div key={r.id} className="bg-[#16161a] border border-[#2a2a30] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#f0eee8]">Apt {r.apartment_code}</span>
                  <span className="text-xs font-mono text-[#94918a]">{r.checkin} → {r.checkout}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${r.payment_status === 'pago' ? 'bg-emerald-500/15 text-emerald-400' : r.payment_status === 'parcial' ? 'bg-yellow-500/15 text-yellow-400' : 'bg-red-500/15 text-red-400'}`}>{r.payment_status}</span>
                </div>
                <div className="flex items-center gap-1">
                  {r.payment_status !== 'pago' && <button onClick={() => updatePayment(r.id!, 'pago')} className="text-xs text-emerald-400 hover:bg-emerald-400/10 px-2 py-1 rounded">✓ Pago</button>}
                  {r.guest_phone && <a href={`https://wa.me/${r.guest_phone.replace(/\D/g,'')}`} target="_blank" rel="noopener" className="text-green-400 p-1 hover:bg-green-400/10 rounded"><MessageCircle className="h-3.5 w-3.5" /></a>}
                  <button onClick={() => remove(r.id!)} className="text-[#94918a] hover:text-red-400 p-1"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <div className="flex items-center gap-4 text-[11px]">
                <span className="text-[#f0eee8]">{r.guest_name}</span>
                <span className="font-mono font-bold text-[#c9a96e]">{fmtBRL(Number(r.total_value))}</span>
                <span className="text-[#94918a]">{r.payment_method}</span>
                {r.notes && <span className="text-[#94918a]">• {r.notes}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
