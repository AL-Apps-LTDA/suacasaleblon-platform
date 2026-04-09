'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Building2, Loader2, X, Check, ExternalLink, Globe, User, Percent, Calendar } from 'lucide-react'

interface Apartment {
  id: number; code: string; title: string; subtitle: string | null; slug: string | null
  owner_name: string | null; owner_email: string | null; owner_phone: string | null
  commission_pct: number; commission_valid_from: string | null; address: string | null
  hospitable_uuid: string | null; show_on_site: boolean; active: boolean
  max_guests: number; base_guests: number; extra_per_guest_per_night: number; cleaning_fee: number
}

const EMPTY: Partial<Apartment> = {
  code: '', title: '', subtitle: '', slug: '', owner_name: '', owner_email: '', owner_phone: '',
  commission_pct: 0, commission_valid_from: new Date().toLocaleDateString('sv-SE'),
  address: '', hospitable_uuid: '', show_on_site: true, active: true,
  max_guests: 2, base_guests: 2, extra_per_guest_per_night: 0, cleaning_fee: 150,
}

export default function ApartamentosPage() {
  const [apts, setApts] = useState<Apartment[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Apartment | null>(null)
  const [form, setForm] = useState<Partial<Apartment>>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/apartments')
    if (res.ok) setApts(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openNew() {
    setEditing(null)
    setForm(EMPTY)
    setError('')
    setShowForm(true)
  }

  function openEdit(apt: Apartment) {
    setEditing(apt)
    setForm({
      ...apt,
      commission_pct: Number(apt.commission_pct) * 100, // show as percentage
    })
    setError('')
    setShowForm(true)
  }

  async function save() {
    setSaving(true); setError('')
    const method = editing ? 'PUT' : 'POST'
    const payload = editing ? { id: editing.id, ...form } : form

    // Convert commission from display % to decimal for new apartments
    if (!editing && form.commission_pct && Number(form.commission_pct) > 1) {
      payload.commission_pct = Number(form.commission_pct) / 100
    }

    const res = await fetch('/api/admin/apartments', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Erro ao salvar')
      setSaving(false)
      return
    }

    setShowForm(false)
    setSaving(false)
    load()
  }

  function f(key: keyof Apartment, value: any) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg text-sm bg-[rgb(var(--adm-border))] border border-[rgb(var(--adm-border))] text-[rgb(var(--adm-text))] placeholder-[#666] focus:border-[rgb(var(--adm-accent))] focus:outline-none'
  const labelCls = 'block text-xs font-semibold text-[rgb(var(--adm-muted))] mb-1'

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[rgb(var(--adm-text))]">Apartamentos</h1>
          <p className="text-xs text-[rgb(var(--adm-muted))] mt-0.5">Gerenciar imóveis, donos e comissões</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[rgb(var(--adm-accent))] text-[rgb(var(--adm-accent-fg))] hover:bg-[rgb(var(--adm-accent-hover))] transition">
          <Plus className="h-3.5 w-3.5" /> Novo Apartamento
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[rgb(var(--adm-accent))]" /></div>
      ) : (
        <div className="grid gap-3">
          {apts.map(apt => (
            <div key={apt.id} className={`rounded-xl border p-4 ${apt.active ? 'bg-[rgb(var(--adm-surface))] border-[rgb(var(--adm-border))]' : 'bg-[rgb(var(--adm-bg))] border-[rgb(var(--adm-border))] opacity-60'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[rgb(var(--adm-accent)/0.1)] flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-[rgb(var(--adm-accent))]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[rgb(var(--adm-text))]">{apt.code}</span>
                      <span className="text-sm text-[rgb(var(--adm-muted))]">{apt.title}</span>
                      {!apt.active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">Inativo</span>}
                      {apt.hospitable_uuid && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400">Hospitable</span>}
                      {!apt.hospitable_uuid && <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-400">Só diretas</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-[rgb(var(--adm-muted))]">
                      {apt.slug && <span className="flex items-center gap-1"><Globe className="h-3 w-3" />/{apt.slug}</span>}
                      {apt.owner_name && <span className="flex items-center gap-1"><User className="h-3 w-3" />{apt.owner_name}</span>}
                      <span className="flex items-center gap-1"><Percent className="h-3 w-3" />{Math.round(Number(apt.commission_pct) * 100)}%</span>
                      {apt.commission_valid_from && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />desde {apt.commission_valid_from}</span>}
                    </div>
                  </div>
                </div>
                <button onClick={() => openEdit(apt)} className="p-2 rounded-lg hover:bg-[rgb(var(--adm-border))] transition">
                  <Pencil className="h-4 w-4 text-[rgb(var(--adm-muted))]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowForm(false)}>
          <div className="bg-[rgb(var(--adm-elevated))] rounded-2xl border border-[rgb(var(--adm-border))] w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[rgb(var(--adm-text))]">{editing ? `Editar ${editing.code}` : 'Novo Apartamento'}</h2>
              <button onClick={() => setShowForm(false)}><X className="h-5 w-5 text-[rgb(var(--adm-muted))]" /></button>
            </div>

            <div className="space-y-4">
              {/* Identificacao */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Código *</label>
                  <input className={inputCls} value={form.code || ''} onChange={e => f('code', e.target.value)} placeholder="IPM01" disabled={!!editing} />
                </div>
                <div>
                  <label className={labelCls}>Slug (URL)</label>
                  <input className={inputCls} value={form.slug || ''} onChange={e => f('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="apto-lindo-ipanema" />
                </div>
              </div>

              <div>
                <label className={labelCls}>Título *</label>
                <input className={inputCls} value={form.title || ''} onChange={e => f('title', e.target.value)} placeholder="Ipanema Studio Vista Mar" />
              </div>

              <div>
                <label className={labelCls}>Subtítulo</label>
                <input className={inputCls} value={form.subtitle || ''} onChange={e => f('subtitle', e.target.value)} placeholder="2 hóspedes, ar condicionado, vista mar" />
              </div>

              <div>
                <label className={labelCls}>Endereço</label>
                <input className={inputCls} value={form.address || ''} onChange={e => f('address', e.target.value)} placeholder="Rua Visconde de Pirajá, 000 — Ipanema" />
              </div>

              {/* Dono */}
              <div className="border-t border-[rgb(var(--adm-border))] pt-4">
                <p className="text-xs font-bold text-[rgb(var(--adm-accent))] mb-3">Proprietário</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Nome</label>
                    <input className={inputCls} value={form.owner_name || ''} onChange={e => f('owner_name', e.target.value)} placeholder="João Silva" />
                  </div>
                  <div>
                    <label className={labelCls}>Telefone</label>
                    <input className={inputCls} value={form.owner_phone || ''} onChange={e => f('owner_phone', e.target.value)} placeholder="21999999999" />
                  </div>
                </div>
                <div className="mt-3">
                  <label className={labelCls}>Email</label>
                  <input className={inputCls} value={form.owner_email || ''} onChange={e => f('owner_email', e.target.value)} placeholder="joao@email.com" />
                </div>
              </div>

              {/* Comissao */}
              <div className="border-t border-[rgb(var(--adm-border))] pt-4">
                <p className="text-xs font-bold text-[rgb(var(--adm-accent))] mb-3">Comissão</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Comissão (%)</label>
                    <input type="number" className={inputCls} value={form.commission_pct || ''} onChange={e => f('commission_pct', e.target.value)} placeholder="15" min="0" max="100" step="0.5" />
                  </div>
                  <div>
                    <label className={labelCls}>Válido desde</label>
                    <input type="date" className={inputCls} value={form.commission_valid_from || ''} onChange={e => f('commission_valid_from', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Hospedes */}
              <div className="border-t border-[rgb(var(--adm-border))] pt-4">
                <p className="text-xs font-bold text-[rgb(var(--adm-accent))] mb-3">Hóspedes & Preço</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className={labelCls}>Máx hóspedes</label>
                    <input type="number" className={inputCls} value={form.max_guests || ''} onChange={e => f('max_guests', Number(e.target.value))} min="1" />
                  </div>
                  <div>
                    <label className={labelCls}>Base (sem extra)</label>
                    <input type="number" className={inputCls} value={form.base_guests || ''} onChange={e => f('base_guests', Number(e.target.value))} min="1" />
                  </div>
                  <div>
                    <label className={labelCls}>Extra/hósp/noite</label>
                    <input type="number" className={inputCls} value={form.extra_per_guest_per_night || ''} onChange={e => f('extra_per_guest_per_night', Number(e.target.value))} min="0" />
                  </div>
                  <div>
                    <label className={labelCls}>Taxa limpeza (R$)</label>
                    <input type="number" className={inputCls} value={form.cleaning_fee ?? ''} onChange={e => f('cleaning_fee', Number(e.target.value))} min="0" step="10" placeholder="150" />
                  </div>
                </div>
              </div>

              {/* Integracoes */}
              <div className="border-t border-[rgb(var(--adm-border))] pt-4">
                <p className="text-xs font-bold text-[rgb(var(--adm-accent))] mb-3">Integrações</p>
                <div>
                  <label className={labelCls}>UUID Hospitable (opcional)</label>
                  <input className={inputCls} value={form.hospitable_uuid || ''} onChange={e => f('hospitable_uuid', e.target.value)} placeholder="Deixe vazio para só reservas diretas" />
                  <p className="text-[10px] text-[#666] mt-1">Se preenchido, sincroniza reservas do Airbnb/Booking. Se vazio, só aceita reservas diretas pelo site.</p>
                </div>
              </div>

              {/* Toggles */}
              <div className="border-t border-[rgb(var(--adm-border))] pt-4 flex gap-6">
                <label className="flex items-center gap-2 text-sm text-[rgb(var(--adm-muted))] cursor-pointer">
                  <input type="checkbox" checked={form.show_on_site !== false} onChange={e => f('show_on_site', e.target.checked)} className="rounded" />
                  Visível no site
                </label>
                <label className="flex items-center gap-2 text-sm text-[rgb(var(--adm-muted))] cursor-pointer">
                  <input type="checkbox" checked={form.active !== false} onChange={e => f('active', e.target.checked)} className="rounded" />
                  Ativo
                </label>
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}

              <button onClick={save} disabled={saving} className="w-full py-2.5 rounded-lg text-sm font-semibold bg-[rgb(var(--adm-accent))] text-[rgb(var(--adm-accent-fg))] hover:bg-[rgb(var(--adm-accent-hover))] disabled:opacity-50 transition flex items-center justify-center gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {editing ? 'Salvar Alterações' : 'Criar Apartamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
