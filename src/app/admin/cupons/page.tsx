'use client'
import { useState, useEffect } from 'react'
import { Plus, Trash2, Tag, Copy, Check, Loader2 } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')

interface Coupon { id?: number; code: string; discount_type: string; discount_value: number; max_uses: number; uses_count: number; valid_from: string | null; valid_until: string | null; active: boolean; notes: string }

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return 'SCL-' + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function CuponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [copied, setCopied] = useState('')
  const [form, setForm] = useState<Partial<Coupon>>({ code: generateCode(), discount_type: 'percent', discount_value: 10, max_uses: 10, notes: '' })

  async function load() { setLoading(true); const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false }); if (data) setCoupons(data); setLoading(false) }
  useEffect(() => { load() }, [])

  async function save() {
    if (!form.code || !form.discount_value) return
    await supabase.from('coupons').insert({ ...form, active: true, uses_count: 0 })
    setShowForm(false); setForm({ code: generateCode(), discount_type: 'percent', discount_value: 10, max_uses: 10, notes: '' }); load()
  }

  async function toggle(id: number, active: boolean) { await supabase.from('coupons').update({ active: !active }).eq('id', id); load() }
  async function remove(id: number) { await supabase.from('coupons').delete().eq('id', id); load() }

  function copyCode(code: string) { navigator.clipboard.writeText(code); setCopied(code); setTimeout(() => setCopied(''), 2000) }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-xl font-bold tracking-tight text-[rgb(var(--adm-text))]">Cupons de Desconto</h1><p className="text-xs text-[rgb(var(--adm-muted))] mt-0.5">Crie e gerencie cupons para reservas diretas</p></div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 bg-[rgb(var(--adm-accent))] text-[rgb(var(--adm-accent-fg))] px-4 py-2 rounded-lg text-xs font-semibold hover:bg-[rgb(var(--adm-accent-hover))]"><Plus className="h-3.5 w-3.5" /> Novo Cupom</button>
      </div>

      {showForm && (
        <div className="bg-[rgb(var(--adm-surface))] border border-[rgb(var(--adm-accent)/0.20)] rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-[rgb(var(--adm-text))]">Criar cupom</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><label className="text-[10px] text-[rgb(var(--adm-muted))] uppercase block mb-1">Código</label><div className="flex gap-1"><input type="text" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} className="flex-1 bg-[rgb(var(--adm-elevated))] border border-[rgb(var(--adm-border))] rounded-lg px-3 py-2 text-xs text-[rgb(var(--adm-text))] font-mono" /><button onClick={() => setForm(f => ({ ...f, code: generateCode() }))} className="px-2 text-[rgb(var(--adm-muted))] hover:text-[rgb(var(--adm-accent))]" title="Gerar novo">↻</button></div></div>
            <div><label className="text-[10px] text-[rgb(var(--adm-muted))] uppercase block mb-1">Tipo</label><select value={form.discount_type} onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))} className="w-full bg-[rgb(var(--adm-elevated))] border border-[rgb(var(--adm-border))] rounded-lg px-3 py-2 text-xs text-[rgb(var(--adm-text))]"><option value="percent">Percentual (%)</option><option value="fixed">Valor fixo (R$)</option></select></div>
            <div><label className="text-[10px] text-[rgb(var(--adm-muted))] uppercase block mb-1">Desconto</label><input type="number" value={form.discount_value || ''} onChange={e => setForm(f => ({ ...f, discount_value: parseFloat(e.target.value) || 0 }))} className="w-full bg-[rgb(var(--adm-elevated))] border border-[rgb(var(--adm-border))] rounded-lg px-3 py-2 text-xs text-[rgb(var(--adm-text))]" /></div>
            <div><label className="text-[10px] text-[rgb(var(--adm-muted))] uppercase block mb-1">Máx. usos</label><input type="number" value={form.max_uses || ''} onChange={e => setForm(f => ({ ...f, max_uses: parseInt(e.target.value) || 1 }))} className="w-full bg-[rgb(var(--adm-elevated))] border border-[rgb(var(--adm-border))] rounded-lg px-3 py-2 text-xs text-[rgb(var(--adm-text))]" /></div>
          </div>
          <div><label className="text-[10px] text-[rgb(var(--adm-muted))] uppercase block mb-1">Notas</label><input type="text" value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Ex: Cupom para Instagram" className="w-full bg-[rgb(var(--adm-elevated))] border border-[rgb(var(--adm-border))] rounded-lg px-3 py-2 text-xs text-[rgb(var(--adm-text))]" /></div>
          <div className="flex gap-2">
            <button onClick={save} className="bg-[rgb(var(--adm-accent))] text-[rgb(var(--adm-accent-fg))] px-4 py-2 rounded-lg text-xs font-semibold">Criar</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-xs text-[rgb(var(--adm-muted))] border border-[rgb(var(--adm-border))]">Cancelar</button>
          </div>
        </div>
      )}

      {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-[rgb(var(--adm-accent))]" /></div> : coupons.length === 0 ? (
        <div className="bg-[rgb(var(--adm-surface))] border border-[rgb(var(--adm-border))] rounded-xl p-8 text-center"><Tag className="h-8 w-8 text-[rgb(var(--adm-accent)/0.30)] mx-auto mb-3" /><p className="text-sm text-[rgb(var(--adm-muted))]">Nenhum cupom criado</p></div>
      ) : (
        <div className="space-y-2">
          {coupons.map(c => (
            <div key={c.id} className={`bg-[rgb(var(--adm-surface))] border rounded-xl p-4 ${c.active ? 'border-[rgb(var(--adm-border))]' : 'border-[rgb(var(--adm-border)/0.50)] opacity-50'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => copyCode(c.code)} className="flex items-center gap-1.5 bg-[rgb(var(--adm-elevated))] px-3 py-1.5 rounded-lg font-mono text-sm font-bold text-[rgb(var(--adm-accent))] hover:bg-[rgb(var(--adm-accent)/0.10)]">{copied === c.code ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{c.code}</button>
                  <span className="text-sm font-bold text-[rgb(var(--adm-text))]">{c.discount_type === 'percent' ? `${c.discount_value}%` : `R$ ${c.discount_value}`}</span>
                  <span className="text-xs text-[rgb(var(--adm-muted))]">{c.uses_count}/{c.max_uses} usos</span>
                  {c.notes && <span className="text-xs text-[rgb(var(--adm-muted))]">• {c.notes}</span>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => toggle(c.id!, c.active)} className={`text-xs px-2 py-1 rounded ${c.active ? 'text-emerald-400 hover:bg-emerald-400/10' : 'text-[rgb(var(--adm-muted))] hover:bg-[rgb(var(--adm-elevated))]'}`}>{c.active ? 'Ativo' : 'Inativo'}</button>
                  <button onClick={() => remove(c.id!)} className="text-[rgb(var(--adm-muted))] hover:text-red-400 p-1"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
