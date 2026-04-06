'use client'
import { useState, useEffect } from 'react'
import { Plus, Trash2, Tag, Copy, Check, Loader2 } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')

interface Coupon {
  id?: number; code: string; discount_type: string; discount_value: number
  max_uses: number; uses_count: number; valid_from: string | null; valid_until: string | null
  active: boolean; notes: string; target: string; duration: string; duration_months: number | null
}

function generateCode(prefix: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return prefix + '-' + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

const TARGET_LABELS: Record<string, { label: string; color: string }> = {
  reservas: { label: 'Reservas', color: 'rgb(var(--adm-accent))' },
  giro:     { label: 'Giro Temporada', color: '#eab308' },
}

const DURATION_LABELS: Record<string, string> = {
  once: '1 mes',
  repeating: 'X meses',
  forever: 'Pra sempre',
}

export default function CuponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [copied, setCopied] = useState('')
  const [filter, setFilter] = useState<'all' | 'reservas' | 'giro'>('all')
  const [form, setForm] = useState<Partial<Coupon>>({
    code: generateCode('SCL'), discount_type: 'percent', discount_value: 10,
    max_uses: 10, notes: '', target: 'reservas', duration: 'once', duration_months: null,
  })

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false })
    if (data) setCoupons(data)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function save() {
    if (!form.code || !form.discount_value) return
    const payload = {
      ...form,
      active: true,
      uses_count: 0,
      duration_months: form.duration === 'repeating' ? (form.duration_months || 1) : null,
    }
    await supabase.from('coupons').insert(payload)
    setShowForm(false)
    setForm({
      code: generateCode(form.target === 'giro' ? 'GIRO' : 'SCL'),
      discount_type: 'percent', discount_value: 10, max_uses: 10,
      notes: '', target: 'reservas', duration: 'once', duration_months: null,
    })
    load()
  }

  async function toggle(id: number, active: boolean) { await supabase.from('coupons').update({ active: !active }).eq('id', id); load() }
  async function remove(id: number) { await supabase.from('coupons').delete().eq('id', id); load() }
  function copyCode(code: string) { navigator.clipboard.writeText(code); setCopied(code); setTimeout(() => setCopied(''), 2000) }

  const filtered = filter === 'all' ? coupons : coupons.filter(c => c.target === filter)

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[rgb(var(--adm-text))]">Cupons de Desconto</h1>
          <p className="text-xs text-[rgb(var(--adm-muted))] mt-0.5">Cupons para reservas diretas e assinaturas Giro Temporada</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 bg-[rgb(var(--adm-accent))] text-[rgb(var(--adm-accent-fg))] px-4 py-2 rounded-lg text-xs font-semibold hover:bg-[rgb(var(--adm-accent-hover))]">
          <Plus className="h-3.5 w-3.5" /> Novo Cupom
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'reservas', 'giro'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f
              ? 'bg-[rgb(var(--adm-accent)/0.10)] text-[rgb(var(--adm-accent))] border border-[rgb(var(--adm-accent)/0.20)]'
              : 'text-[rgb(var(--adm-muted))] border border-[rgb(var(--adm-border))] hover:text-[rgb(var(--adm-text))]'
            }`}>
            {f === 'all' ? 'Todos' : f === 'reservas' ? 'Reservas' : 'Giro Temporada'}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-[rgb(var(--adm-surface))] border border-[rgb(var(--adm-accent)/0.20)] rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-[rgb(var(--adm-text))]">Criar cupom</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Destino */}
            <div>
              <label className="text-[10px] text-[rgb(var(--adm-muted))] uppercase block mb-1">Destino</label>
              <select value={form.target} onChange={e => setForm(f => ({
                ...f, target: e.target.value,
                code: generateCode(e.target.value === 'giro' ? 'GIRO' : 'SCL'),
                duration: e.target.value === 'giro' ? (f.duration || 'once') : 'once',
              }))} className="w-full bg-[rgb(var(--adm-elevated))] border border-[rgb(var(--adm-border))] rounded-lg px-3 py-2 text-xs text-[rgb(var(--adm-text))]">
                <option value="reservas">Reservas diretas</option>
                <option value="giro">Giro Temporada</option>
              </select>
            </div>
            {/* Codigo */}
            <div>
              <label className="text-[10px] text-[rgb(var(--adm-muted))] uppercase block mb-1">Codigo</label>
              <div className="flex gap-1">
                <input type="text" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  className="flex-1 bg-[rgb(var(--adm-elevated))] border border-[rgb(var(--adm-border))] rounded-lg px-3 py-2 text-xs text-[rgb(var(--adm-text))] font-mono" />
                <button onClick={() => setForm(f => ({ ...f, code: generateCode(f.target === 'giro' ? 'GIRO' : 'SCL') }))}
                  className="px-2 text-[rgb(var(--adm-muted))] hover:text-[rgb(var(--adm-accent))]" title="Gerar novo">↻</button>
              </div>
            </div>
            {/* Tipo */}
            <div>
              <label className="text-[10px] text-[rgb(var(--adm-muted))] uppercase block mb-1">Tipo</label>
              <select value={form.discount_type} onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))}
                className="w-full bg-[rgb(var(--adm-elevated))] border border-[rgb(var(--adm-border))] rounded-lg px-3 py-2 text-xs text-[rgb(var(--adm-text))]">
                <option value="percent">Percentual (%)</option>
                <option value="fixed">Valor fixo (R$)</option>
              </select>
            </div>
            {/* Desconto */}
            <div>
              <label className="text-[10px] text-[rgb(var(--adm-muted))] uppercase block mb-1">Desconto</label>
              <input type="number" value={form.discount_value || ''} onChange={e => setForm(f => ({ ...f, discount_value: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-[rgb(var(--adm-elevated))] border border-[rgb(var(--adm-border))] rounded-lg px-3 py-2 text-xs text-[rgb(var(--adm-text))]" />
            </div>
          </div>

          {/* Giro-specific: duration */}
          {form.target === 'giro' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] text-[rgb(var(--adm-muted))] uppercase block mb-1">Duracao do desconto</label>
                <select value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                  className="w-full bg-[rgb(var(--adm-elevated))] border border-[rgb(var(--adm-border))] rounded-lg px-3 py-2 text-xs text-[rgb(var(--adm-text))]">
                  <option value="once">Primeiro mes</option>
                  <option value="repeating">X meses</option>
                  <option value="forever">Pra sempre (lifetime)</option>
                </select>
              </div>
              {form.duration === 'repeating' && (
                <div>
                  <label className="text-[10px] text-[rgb(var(--adm-muted))] uppercase block mb-1">Quantos meses</label>
                  <input type="number" min={1} max={24} value={form.duration_months || ''} onChange={e => setForm(f => ({ ...f, duration_months: parseInt(e.target.value) || 1 }))}
                    className="w-full bg-[rgb(var(--adm-elevated))] border border-[rgb(var(--adm-border))] rounded-lg px-3 py-2 text-xs text-[rgb(var(--adm-text))]" />
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] text-[rgb(var(--adm-muted))] uppercase block mb-1">Max. usos</label>
              <input type="number" value={form.max_uses || ''} onChange={e => setForm(f => ({ ...f, max_uses: parseInt(e.target.value) || 1 }))}
                className="w-full bg-[rgb(var(--adm-elevated))] border border-[rgb(var(--adm-border))] rounded-lg px-3 py-2 text-xs text-[rgb(var(--adm-text))]" />
            </div>
            <div className="col-span-2 md:col-span-3">
              <label className="text-[10px] text-[rgb(var(--adm-muted))] uppercase block mb-1">Notas</label>
              <input type="text" value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Ex: 1 mes gratis pro João" className="w-full bg-[rgb(var(--adm-elevated))] border border-[rgb(var(--adm-border))] rounded-lg px-3 py-2 text-xs text-[rgb(var(--adm-text))]" />
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={save} className="bg-[rgb(var(--adm-accent))] text-[rgb(var(--adm-accent-fg))] px-4 py-2 rounded-lg text-xs font-semibold">Criar</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-xs text-[rgb(var(--adm-muted))] border border-[rgb(var(--adm-border))]">Cancelar</button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-[rgb(var(--adm-accent))]" /></div> : filtered.length === 0 ? (
        <div className="bg-[rgb(var(--adm-surface))] border border-[rgb(var(--adm-border))] rounded-xl p-8 text-center">
          <Tag className="h-8 w-8 text-[rgb(var(--adm-accent)/0.30)] mx-auto mb-3" />
          <p className="text-sm text-[rgb(var(--adm-muted))]">Nenhum cupom {filter !== 'all' ? `para ${filter === 'giro' ? 'Giro Temporada' : 'reservas'}` : 'criado'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => {
            const tgt = TARGET_LABELS[c.target] || TARGET_LABELS.reservas
            const durLabel = c.target === 'giro'
              ? c.duration === 'forever' ? 'lifetime' : c.duration === 'repeating' ? `${c.duration_months} meses` : '1 mes'
              : null
            return (
              <div key={c.id} className={`bg-[rgb(var(--adm-surface))] border rounded-xl p-4 ${c.active ? 'border-[rgb(var(--adm-border))]' : 'border-[rgb(var(--adm-border)/0.50)] opacity-50'}`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <button onClick={() => copyCode(c.code)} className="flex items-center gap-1.5 bg-[rgb(var(--adm-elevated))] px-3 py-1.5 rounded-lg font-mono text-sm font-bold text-[rgb(var(--adm-accent))] hover:bg-[rgb(var(--adm-accent)/0.10)]">
                      {copied === c.code ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{c.code}
                    </button>
                    <span className="text-sm font-bold text-[rgb(var(--adm-text))]">
                      {c.discount_type === 'percent' ? `${c.discount_value}%` : `R$ ${c.discount_value}`}
                    </span>
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ color: tgt.color, background: `${tgt.color}15` }}>
                      {tgt.label}
                    </span>
                    {durLabel && (
                      <span className="text-[10px] text-[rgb(var(--adm-muted))] bg-[rgb(var(--adm-elevated))] px-2 py-0.5 rounded-full">
                        {durLabel}
                      </span>
                    )}
                    <span className="text-xs text-[rgb(var(--adm-muted))]">{c.uses_count}/{c.max_uses} usos</span>
                    {c.notes && <span className="text-xs text-[rgb(var(--adm-muted))]">• {c.notes}</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => toggle(c.id!, c.active)} className={`text-xs px-2 py-1 rounded ${c.active ? 'text-emerald-400 hover:bg-emerald-400/10' : 'text-[rgb(var(--adm-muted))] hover:bg-[rgb(var(--adm-elevated))]'}`}>
                      {c.active ? 'Ativo' : 'Inativo'}
                    </button>
                    <button onClick={() => remove(c.id!)} className="text-[rgb(var(--adm-muted))] hover:text-red-400 p-1"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
