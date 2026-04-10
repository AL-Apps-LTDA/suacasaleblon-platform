'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, DollarSign, Building2, Calendar, Loader2, Save, ChevronLeft, ChevronRight, Pencil, Clock } from 'lucide-react'
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
  installment_group?: string | null
  installment_num?: number | null
  total_installments?: number | null
  original_amount?: number | null
  original_date?: string | null
}

interface PendingInstallment {
  id?: number
  installment_group: string
  apartment_code: string
  month: number
  year: number
  label: string
  amount: number
  category: string
  notes: string
  installment_num: number
  total_installments: number
  original_amount: number
  original_date: string | null
}

export default function DespesasPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedApt, setSelectedApt] = useState('all')
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [showForm, setShowForm] = useState(false)
  const [installments, setInstallments] = useState(1)
  const [originalDate, setOriginalDate] = useState('')
  const [pendingList, setPendingList] = useState<PendingInstallment[]>([])
  const defaultApt = () => selectedApt === 'all' ? 'geral' : selectedApt
  const [form, setForm] = useState<Expense>({
    apartment_code: 'geral', month: new Date().getMonth() + 1, year: selectedYear,
    label: '', amount: 0, category: 'outros', notes: ''
  })

  async function promoteInstallments() {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()
    const { data: due } = await supabase
      .from('pending_installments')
      .select('*')
      .or(`year.lt.${currentYear},and(year.eq.${currentYear},month.lte.${currentMonth})`)
    if (due && due.length > 0) {
      const rows = due.map(d => ({
        apartment_code: d.apartment_code, month: d.month, year: d.year,
        label: d.label, amount: d.amount, category: d.category, notes: d.notes,
        installment_group: d.installment_group, installment_num: d.installment_num,
        total_installments: d.total_installments, original_amount: d.original_amount,
        original_date: d.original_date,
      }))
      await supabase.from('expenses').insert(rows)
      await supabase.from('pending_installments').delete().in('id', due.map(d => d.id))
    }
  }

  async function loadExpenses() {
    setLoading(true)
    let query = supabase
      .from('expenses')
      .select('*')
      .eq('month', selectedMonth)
      .eq('year', selectedYear)
    if (selectedApt !== 'all') query = query.eq('apartment_code', selectedApt)
    const { data, error } = await query.order('created_at', { ascending: true })
    if (!error && data) setExpenses(data)
    setLoading(false)
  }

  async function loadPending() {
    let query = supabase.from('pending_installments').select('*')
    if (selectedApt !== 'all') query = query.eq('apartment_code', selectedApt)
    const { data } = await query.order('year', { ascending: true }).order('month', { ascending: true })
    if (data) setPendingList(data)
  }

  useEffect(() => { promoteInstallments().then(() => { loadExpenses(); loadPending() }) }, [])
  useEffect(() => { loadExpenses(); loadPending() }, [selectedApt, selectedMonth, selectedYear])

  async function handleSave() {
    if (!form.label || form.amount === 0) return
    setSaving(true)
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    if (form.id) {
      // Edit mode: update single row only
      const payload = { ...form, apartment_code: form.apartment_code, month: selectedMonth, year: selectedYear, original_date: originalDate || form.original_date || null }
      await supabase.from('expenses').update(payload).eq('id', form.id)
    } else if (installments <= 1) {
      // Single expense (à vista)
      const payload = {
        apartment_code: form.apartment_code, month: selectedMonth, year: selectedYear,
        label: form.label, amount: form.amount, category: form.category, notes: form.notes,
        original_date: originalDate || null,
      }
      await supabase.from('expenses').insert(payload)
    } else {
      // Installment mode: create N rows split between expenses and pending
      const groupId = crypto.randomUUID()
      const totalCents = Math.round(form.amount * 100)
      const perCents = Math.floor(totalCents / installments)
      const expenseRows: any[] = []
      const pendingRows: any[] = []
      let m = selectedMonth
      let y = selectedYear

      for (let i = 0; i < installments; i++) {
        const cents = (i === installments - 1) ? totalCents - perCents * (installments - 1) : perCents
        const row = {
          apartment_code: form.apartment_code, month: m, year: y,
          label: `${form.label} (${i + 1}/${installments})`,
          amount: cents / 100, category: form.category, notes: form.notes,
          installment_group: groupId, installment_num: i + 1,
          total_installments: installments, original_amount: form.amount,
          original_date: originalDate || null,
        }
        // Current or past month → expenses; future → pending
        if (y < currentYear || (y === currentYear && m <= currentMonth)) {
          expenseRows.push(row)
        } else {
          pendingRows.push(row)
        }
        m++
        if (m > 12) { m = 1; y++ }
      }

      if (expenseRows.length > 0) await supabase.from('expenses').insert(expenseRows)
      if (pendingRows.length > 0) await supabase.from('pending_installments').insert(pendingRows)
    }

    setSaving(false)
    setShowForm(false)
    setInstallments(1)
    setOriginalDate('')
    setForm({ apartment_code: defaultApt(), month: selectedMonth, year: selectedYear, label: '', amount: 0, category: 'outros', notes: '' })
    loadExpenses()
    loadPending()
  }

  async function handleDelete(expense: Expense) {
    if (expense.installment_group && expense.total_installments && expense.total_installments > 1) {
      const deleteAll = window.confirm(
        `Esta despesa faz parte de um parcelamento (${expense.installment_num}/${expense.total_installments}).\n\n` +
        `OK = Excluir TODAS as ${expense.total_installments} parcelas (inclusive agendadas)\n` +
        `Cancelar = Excluir apenas esta parcela`
      )
      if (deleteAll) {
        await supabase.from('expenses').delete().eq('installment_group', expense.installment_group)
        await supabase.from('pending_installments').delete().eq('installment_group', expense.installment_group)
      } else {
        await supabase.from('expenses').delete().eq('id', expense.id!)
      }
    } else {
      await supabase.from('expenses').delete().eq('id', expense.id!)
    }
    loadExpenses()
    loadPending()
  }

  async function handleDeletePending(p: PendingInstallment) {
    const deleteAll = window.confirm(
      `Esta parcela agendada faz parte de um parcelamento (${p.installment_num}/${p.total_installments}).\n\n` +
      `OK = Excluir TODAS as parcelas (inclusive já inseridas)\n` +
      `Cancelar = Excluir apenas esta parcela agendada`
    )
    if (deleteAll) {
      await supabase.from('expenses').delete().eq('installment_group', p.installment_group)
      await supabase.from('pending_installments').delete().eq('installment_group', p.installment_group)
    } else {
      await supabase.from('pending_installments').delete().eq('id', p.id!)
    }
    loadExpenses()
    loadPending()
  }

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const byCategory = CATEGORIES.map(c => ({
    cat: c, label: CATEGORY_LABELS[c],
    total: expenses.filter(e => e.category === c).reduce((s, e) => s + Number(e.amount), 0)
  })).filter(c => c.total > 0)

  function getInstallmentPreview(): string {
    if (installments <= 1 || !form.amount) return ''
    const perCents = Math.floor(Math.round(form.amount * 100) / installments)
    const perValue = perCents / 100
    const monthNames: string[] = []
    let m = selectedMonth, y = selectedYear
    for (let i = 0; i < installments; i++) {
      monthNames.push(`${MONTHS_FULL[m - 1].substring(0, 3)}/${y}`)
      m++; if (m > 12) { m = 1; y++ }
    }
    return `${installments}x de ${fmtBRL(perValue)} — ${monthNames.join(', ')}`
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[rgb(var(--adm-text))]">Despesas</h1>
          <p className="text-xs text-[rgb(var(--adm-muted))] mt-0.5">Gerencie despesas por apartamento e mês</p>
        </div>
        <button onClick={() => { setShowForm(true); setInstallments(1); setOriginalDate(''); setForm({ apartment_code: defaultApt(), month: selectedMonth, year: selectedYear, label: '', amount: 0, category: 'outros', notes: '' }) }}
          className="flex items-center gap-1.5 bg-[rgb(var(--adm-accent))] text-[rgb(var(--adm-accent-fg))] px-4 py-2 rounded-lg text-xs font-semibold hover:bg-[rgb(var(--adm-accent-hover))] transition-colors">
          <Plus className="h-3.5 w-3.5" /> Nova Despesa
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex rounded-lg border border-[rgb(var(--adm-border))] overflow-hidden text-xs">
          <button onClick={() => setSelectedApt('all')}
            className={`px-4 py-2 font-medium ${selectedApt === 'all' ? 'bg-[rgb(var(--adm-accent))] text-[rgb(var(--adm-accent-fg))]' : 'bg-[rgb(var(--adm-elevated))] text-[rgb(var(--adm-muted))] hover:text-[rgb(var(--adm-text))]'}`}>
            Todos
          </button>
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
        <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
          className="bg-[rgb(var(--adm-elevated))] border border-[rgb(var(--adm-border))] rounded-lg px-3 py-2 text-xs font-medium text-[rgb(var(--adm-text))]">
          {[2025, 2026, 2027, 2028, 2029, 2030].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Total */}
      <div className="bg-[rgb(var(--adm-surface))] border border-[rgb(var(--adm-border))] rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-red-400" />
          <div>
            <p className="text-[10px] text-[rgb(var(--adm-muted))] uppercase tracking-wider">Total despesas — {selectedApt === 'all' ? 'Todos os apts' : `Apt ${selectedApt}`} — {MONTHS_FULL[selectedMonth - 1]}</p>
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
          <h3 className="text-sm font-semibold text-[rgb(var(--adm-text))]">{form.id ? 'Editar' : 'Nova'} despesa — {selectedApt === 'all' ? 'Todos os apts' : `Apt ${selectedApt}`}</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] text-[rgb(var(--adm-muted))] uppercase tracking-wider block mb-1">Apartamento</label>
              <select value={form.apartment_code} onChange={e => setForm(f => ({ ...f, apartment_code: e.target.value }))} className="w-full bg-[rgb(var(--adm-elevated))] border border-[rgb(var(--adm-border))] rounded-lg px-3 py-2 text-xs text-[rgb(var(--adm-text))]">
                <option value="geral">Geral (empresa)</option>
                {APARTMENTS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] text-[rgb(var(--adm-muted))] uppercase tracking-wider block mb-1">Data da despesa</label>
              <input type="date" value={originalDate} onChange={e => setOriginalDate(e.target.value)} className="w-full bg-[rgb(var(--adm-elevated))] border border-[rgb(var(--adm-border))] rounded-lg px-3 py-2 text-xs text-[rgb(var(--adm-text))]" />
            </div>
            {!form.id && (
              <div>
                <label className="text-[10px] text-[rgb(var(--adm-muted))] uppercase tracking-wider block mb-1">Parcelas</label>
                <select value={installments} onChange={e => setInstallments(Number(e.target.value))} className="w-full bg-[rgb(var(--adm-elevated))] border border-[rgb(var(--adm-border))] rounded-lg px-3 py-2 text-xs text-[rgb(var(--adm-text))]">
                  <option value={1}>1x (à vista)</option>
                  {[2,3,4,5,6,7,8,9,10,11,12].map(n => <option key={n} value={n}>{n}x</option>)}
                </select>
              </div>
            )}
            <div className={!form.id ? 'md:col-span-2' : 'md:col-span-3'}>
              <label className="text-[10px] text-[rgb(var(--adm-muted))] uppercase tracking-wider block mb-1">Notas (opcional)</label>
              <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Observações..." className="w-full bg-[rgb(var(--adm-elevated))] border border-[rgb(var(--adm-border))] rounded-lg px-3 py-2 text-xs text-[rgb(var(--adm-text))]" />
            </div>
          </div>
          {installments > 1 && form.amount > 0 && (
            <p className="text-xs text-[rgb(var(--adm-accent))] font-medium">{getInstallmentPreview()}</p>
          )}
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={!form.label || form.amount === 0 || saving}
              className="flex items-center gap-1.5 bg-[rgb(var(--adm-accent))] text-[rgb(var(--adm-accent-fg))] px-4 py-2 rounded-lg text-xs font-semibold hover:bg-[rgb(var(--adm-accent-hover))] disabled:opacity-50">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Salvar
            </button>
            <button onClick={() => { setShowForm(false); setInstallments(1); setOriginalDate('') }} className="px-4 py-2 rounded-lg text-xs text-[rgb(var(--adm-muted))] border border-[rgb(var(--adm-border))]">Cancelar</button>
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
          <p className="text-xs text-[rgb(var(--adm-muted)/0.60)] mt-1">{selectedApt === 'all' ? 'Todos os apts' : `Apt ${selectedApt}`} — {MONTHS_FULL[selectedMonth - 1]} {selectedYear}</p>
        </div>
      ) : (
        <div className="bg-[rgb(var(--adm-surface))] border border-[rgb(var(--adm-border))] rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[rgb(var(--adm-border))]">
                {selectedApt === 'all' && <th className="text-left py-2.5 px-4 text-[rgb(var(--adm-muted))] font-medium">Apt</th>}
                <th className="text-left py-2.5 px-4 text-[rgb(var(--adm-muted))] font-medium">Descrição</th>
                <th className="text-left py-2.5 px-4 text-[rgb(var(--adm-muted))] font-medium">Categoria</th>
                <th className="text-right py-2.5 px-4 text-[rgb(var(--adm-muted))] font-medium">Valor</th>
                <th className="text-right py-2.5 px-4 text-[rgb(var(--adm-muted))] font-medium w-16"></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(e => (
                <tr key={e.id} className="border-b border-[rgb(var(--adm-border)/0.30)] hover:bg-[rgb(var(--adm-elevated))]">
                  {selectedApt === 'all' && <td className="py-2.5 px-4 text-[rgb(var(--adm-accent))] font-semibold">{e.apartment_code}</td>}
                  <td className="py-2.5 px-4">
                    <span className="text-[rgb(var(--adm-text))]">{e.label}</span>
                    {e.total_installments && e.total_installments > 1 && (
                      <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-[rgb(var(--adm-accent)/0.15)] text-[rgb(var(--adm-accent))]">
                        {e.installment_num}/{e.total_installments}
                      </span>
                    )}
                    {e.notes && <span className="block text-[10px] text-[rgb(var(--adm-muted))] mt-0.5">{e.notes}</span>}
                    {e.original_date && (
                      <span className="block text-[10px] text-[rgb(var(--adm-muted))] mt-0.5">
                        Data: {new Date(e.original_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-[rgb(var(--adm-muted))]">{CATEGORY_LABELS[e.category] || e.category}</td>
                  <td className="py-2.5 px-4 text-right font-mono font-medium text-red-400" title={e.original_amount ? `Total: ${fmtBRL(Number(e.original_amount))}` : undefined}>
                    {fmtBRL(Number(e.amount))}
                  </td>
                  <td className="py-2.5 px-4 text-right flex items-center justify-end gap-1">
                    <button onClick={() => { setForm({ ...e, amount: Number(e.amount) }); setOriginalDate(e.original_date || ''); setInstallments(1); setShowForm(true) }} className="text-[rgb(var(--adm-muted))] hover:text-[rgb(var(--adm-accent))] transition-colors" title="Editar"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => handleDelete(e)} className="text-[rgb(var(--adm-muted))] hover:text-red-400 transition-colors" title="Excluir"><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pending installments section */}
      {pendingList.length > 0 && (
        <div className="bg-[rgb(var(--adm-surface))] border border-[rgb(var(--adm-border))] rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[rgb(var(--adm-border))]">
            <Clock className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-[rgb(var(--adm-text))]">Parcelas agendadas</h3>
            <span className="text-[10px] text-[rgb(var(--adm-muted))]">({pendingList.length} parcelas futuras)</span>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[rgb(var(--adm-border))]">
                <th className="text-left py-2 px-4 text-[rgb(var(--adm-muted))] font-medium">Apt</th>
                <th className="text-left py-2 px-4 text-[rgb(var(--adm-muted))] font-medium">Descrição</th>
                <th className="text-left py-2 px-4 text-[rgb(var(--adm-muted))] font-medium">Mês</th>
                <th className="text-left py-2 px-4 text-[rgb(var(--adm-muted))] font-medium">Categoria</th>
                <th className="text-right py-2 px-4 text-[rgb(var(--adm-muted))] font-medium">Valor</th>
                <th className="text-right py-2 px-4 text-[rgb(var(--adm-muted))] font-medium w-10"></th>
              </tr>
            </thead>
            <tbody>
              {pendingList.map(p => (
                <tr key={p.id} className="border-b border-[rgb(var(--adm-border)/0.30)] hover:bg-[rgb(var(--adm-elevated))]">
                  <td className="py-2 px-4 text-[rgb(var(--adm-accent))] font-semibold">{p.apartment_code}</td>
                  <td className="py-2 px-4">
                    <span className="text-[rgb(var(--adm-text))]">{p.label}</span>
                    <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-400">
                      {p.installment_num}/{p.total_installments}
                    </span>
                  </td>
                  <td className="py-2 px-4 text-[rgb(var(--adm-muted))]">{MONTHS_FULL[p.month - 1]} {p.year}</td>
                  <td className="py-2 px-4 text-[rgb(var(--adm-muted))]">{CATEGORY_LABELS[p.category] || p.category}</td>
                  <td className="py-2 px-4 text-right font-mono font-medium text-amber-400" title={`Total: ${fmtBRL(Number(p.original_amount))}`}>
                    {fmtBRL(Number(p.amount))}
                  </td>
                  <td className="py-2 px-4 text-right">
                    <button onClick={() => handleDeletePending(p)} className="text-[rgb(var(--adm-muted))] hover:text-red-400 transition-colors" title="Excluir"><Trash2 className="h-3.5 w-3.5" /></button>
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
