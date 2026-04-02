'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, DollarSign, Building2, Calendar, Loader2, Save, ChevronLeft, ChevronRight, Pencil } from 'lucide-react'
import { fmtBRL, MONTHS_FULL, LEBLON_APARTMENTS } from '@/lib/types'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const APARTMENTS = [...LEBLON_APARTMENTS]
const CATEGORIES = [
  'condominio', 'iptu', 'luz', 'agua', 'gas', 'internet',
  'limpeza', 'produtos_limpeza', 'lavanderia',
  'manutencao', 'enxoval', 'amenities',
  'seguro', 'plataformas', 'comissao',
  'marketing', 'contabilidade', 'juridico',
  'mobilia', 'eletrodomesticos', 'decoracao',
  'outros'
]
const CATEGORY_LABELS: Record<string, string> = {
  condominio: 'Condomínio', iptu: 'IPTU', luz: 'Luz/Energia', agua: 'Água', gas: 'Gás',
  internet: 'Internet/TV', limpeza: 'Limpeza (serviço)', produtos_limpeza: 'Produtos de limpeza',
  lavanderia: 'Lavanderia', manutencao: 'Manutenção/Reparos', enxoval: 'Enxoval (cama/banho)',
  amenities: 'Amenities (café, sabonete...)', seguro: 'Seguro', plataformas: 'Taxa plataformas (Airbnb/Booking)',
  comissao: 'Comissão gestão', marketing: 'Marketing/Fotos', contabilidade: 'Contabilidade',
  juridico: 'Jurídico/Cartório', mobilia: 'Mobília', eletrodomesticos: 'Eletrodomésticos',
  decoracao: 'Decoração', outros: 'Outros'
}

interface Expense {
  id?: number
  apartment_code: string
  month: number
  year: number
  label: string
  amount: number
  category: string
  notes: string
}

export default function DespesasPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedApt, setSelectedApt] = useState('103')
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Expense>({
    apartment_code: '103', month: new Date().getMonth() + 1, year: 2026,
    label: '', amount: 0, category: 'outros', notes: ''
  })

  async function loadExpenses() {
    setLoading(true)
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('apartment_code', selectedApt)
      .eq('month', selectedMonth)
      .eq('year', 2026)
      .order('created_at', { ascending: true })
    if (!error && data) setExpenses(data)
    setLoading(false)
  }

  useEffect(() => { loadExpenses() }, [selectedApt, selectedMonth])

  async function handleSave() {
    if (!form.label || form.amount === 0) return
    setSaving(true)
    const payload = { ...form, apartment_code: selectedApt, month: selectedMonth, year: 2026 }
    if (form.id) {
      await supabase.from('expenses').update(payload).eq('id', form.id)
    } else {
      await supabase.from('expenses').insert(payload)
    }
    setSaving(false)
    setShowForm(false)
    setForm({ apartment_code: selectedApt, month: selectedMonth, year: 2026, label: '', amount: 0, category: 'outros', notes: '' })
    loadExpenses()
  }

  async function handleDelete(id: number) {
    await supabase.from('expenses').delete().eq('id', id)
    loadExpenses()
  }

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const byCategory = CATEGORIES.map(c => ({
    cat: c, label: CATEGORY_LABELS[c],
    total: expenses.filter(e => e.category === c).reduce((s, e) => s + Number(e.amount), 0)
  })).filter(c => c.total > 0)

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[rgb(var(--adm-text))]">Despesas</h1>
          <p className="text-xs text-[rgb(var(--adm-muted))] mt-0.5">Gerencie despesas por apartamento e mês</p>
        </div>
        <button onClick={() => { setShowForm(true); setForm({ apartment_code: selectedApt, month: selectedMonth, year: 2026, label: '', amount: 0, category: 'outros', notes: '' }) }}
          className="flex items-center gap-1.5 bg-[rgb(var(--adm-accent))] text-[rgb(var(--adm-accent-fg))] px-4 py-2 rounded-lg text-xs font-semibold hover:bg-[rgb(var(--adm-accent-hover))] transition-colors">
          <Plus className="h-3.5 w-3.5" /> Nova Despesa
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex rounded-lg border border-[rgb(var(--adm-border))] overflow-hidden text-xs">
          {APARTMENTS.map(a => (
            <button key={a} onClick={() => setSelectedApt(a)}
              className={`px-4 py-2 font-medium ${selectedApt === a ? 'bg-[rgb(var(--adm-accent))] text-[rgb(var(--adm-accent-fg))]' : 'bg-[rgb(var(--adm-elevated))] text-[rgb(var(--adm-muted))] hover:text-[rgb(var(--adm-text))]'}`}>
              {a}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 bg-[rgb(var(--adm-elevated))] rounded-lg border border-[rgb(var(--adm-border))] px-1">
          <button onClick={() => setSelectedMonth(m => m > 1 ? m - 1 : 12)} className="p-1.5 text-[rgb(var(--adm-muted))] hover:text-[rgb(var(--adm-text))]"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-sm font-medium text-[rgb(var(--adm-text))] min-w-[80px] text-center">{MONTHS_FULL[selectedMonth - 1]}</span>
          <button onClick={() => setSelectedMonth(m => m < 12 ? m + 1 : 1)} className="p-1.5 text-[rgb(var(--adm-muted))] hover:text-[rgb(var(--adm-text))]"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Total */}
      <div className="bg-[rgb(var(--adm-surface))] border border-[rgb(var(--adm-border))] rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-red-400" />
          <div>
            <p className="text-[10px] text-[rgb(var(--adm-muted))] uppercase tracking-wider">Total despesas — Apt {selectedApt} — {MONTHS_FULL[selectedMonth - 1]}</p>
            <p className="text-xl font-bold text-red-400 font-mono">{fmtBRL(totalExpenses)}</p>
          </div>
        </div>
        {byCategory.length > 0 && (
          <div className="hidden md:flex gap-3">
            {byCategory.map(c => (
              <div key={c.cat} className="text-right">
                <p className="text-[9px] text-[rgb(var(--adm-muted))] uppercase">{c.label}</p>
                <p className="text-xs font-mono text-red-400">{fmtBRL(c.total)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-[rgb(var(--adm-surface))] border border-[rgb(var(--adm-accent)/0.20)] rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-[rgb(var(--adm-text))]">{form.id ? 'Editar' : 'Nova'} despesa — Apt {selectedApt}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-[rgb(var(--adm-muted))] uppercase tracking-wider block mb-1">Descrição</label>
              <input type="text" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Ex: Condomínio março" className="w-full bg-[rgb(var(--adm-elevated))] border border-[rgb(var(--adm-border))] rounded-lg px-3 py-2 text-xs text-[rgb(var(--adm-text))]" />
            </div>
            <div>
              <label className="text-[10px] text-[rgb(var(--adm-muted))] uppercase tracking-wider block mb-1">Valor (R$)</label>
              <input type="number" step="0.01" value={form.amount || ''} onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} placeholder="0,00" className="w-full bg-[rgb(var(--adm-elevated))] border border-[rgb(var(--adm-border))] rounded-lg px-3 py-2 text-xs text-[rgb(var(--adm-text))]" />
            </div>
            <div>
              <label className="text-[10px] text-[rgb(var(--adm-muted))] uppercase tracking-wider block mb-1">Categoria</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full bg-[rgb(var(--adm-elevated))] border border-[rgb(var(--adm-border))] rounded-lg px-3 py-2 text-xs text-[rgb(var(--adm-text))]">
                {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-[rgb(var(--adm-muted))] uppercase tracking-wider block mb-1">Notas (opcional)</label>
            <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Observações..." className="w-full bg-[rgb(var(--adm-elevated))] border border-[rgb(var(--adm-border))] rounded-lg px-3 py-2 text-xs text-[rgb(var(--adm-text))]" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={!form.label || form.amount === 0 || saving}
              className="flex items-center gap-1.5 bg-[rgb(var(--adm-accent))] text-[rgb(var(--adm-accent-fg))] px-4 py-2 rounded-lg text-xs font-semibold hover:bg-[rgb(var(--adm-accent-hover))] disabled:opacity-50">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Salvar
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-xs text-[rgb(var(--adm-muted))] border border-[rgb(var(--adm-border))]">Cancelar</button>
          </div>
        </div>
      )}

      {/* Expenses list */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-[rgb(var(--adm-accent))]" /><span className="ml-2 text-sm text-[rgb(var(--adm-muted))]">Carregando...</span></div>
      ) : expenses.length === 0 ? (
        <div className="bg-[rgb(var(--adm-surface))] border border-[rgb(var(--adm-border))] rounded-xl p-8 text-center">
          <DollarSign className="h-8 w-8 text-[rgb(var(--adm-accent)/0.30)] mx-auto mb-3" />
          <p className="text-sm text-[rgb(var(--adm-muted))]">Nenhuma despesa cadastrada</p>
          <p className="text-xs text-[rgb(var(--adm-muted)/0.60)] mt-1">Apt {selectedApt} — {MONTHS_FULL[selectedMonth - 1]} 2026</p>
        </div>
      ) : (
        <div className="bg-[rgb(var(--adm-surface))] border border-[rgb(var(--adm-border))] rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[rgb(var(--adm-border))]">
                <th className="text-left py-2.5 px-4 text-[rgb(var(--adm-muted))] font-medium">Descrição</th>
                <th className="text-left py-2.5 px-4 text-[rgb(var(--adm-muted))] font-medium">Categoria</th>
                <th className="text-right py-2.5 px-4 text-[rgb(var(--adm-muted))] font-medium">Valor</th>
                <th className="text-right py-2.5 px-4 text-[rgb(var(--adm-muted))] font-medium w-16"></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(e => (
                <tr key={e.id} className="border-b border-[rgb(var(--adm-border)/0.30)] hover:bg-[rgb(var(--adm-elevated))]">
                  <td className="py-2.5 px-4">
                    <span className="text-[rgb(var(--adm-text))]">{e.label}</span>
                    {e.notes && <span className="block text-[10px] text-[rgb(var(--adm-muted))] mt-0.5">{e.notes}</span>}
                  </td>
                  <td className="py-2.5 px-4 text-[rgb(var(--adm-muted))]">{CATEGORY_LABELS[e.category] || e.category}</td>
                  <td className="py-2.5 px-4 text-right font-mono font-medium text-red-400">{fmtBRL(Number(e.amount))}</td>
                  <td className="py-2.5 px-4 text-right flex items-center justify-end gap-1">
                    <button onClick={() => { setForm({ ...e, amount: Number(e.amount) }); setShowForm(true) }} className="text-[rgb(var(--adm-muted))] hover:text-[rgb(var(--adm-accent))] transition-colors" title="Editar"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => handleDelete(e.id!)} className="text-[rgb(var(--adm-muted))] hover:text-red-400 transition-colors" title="Excluir"><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
