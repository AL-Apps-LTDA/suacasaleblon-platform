'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, Trash2, Pencil, X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { LEBLON_APARTMENTS, MONTHS_FULL, MONTHS_SHORT } from '@/lib/types'

// ─── TYPES ─────────────────────────────────────────────
interface AppUser { id: string; username: string; display_name: string; role: string; pix_key?: string }
type T = {
  bg: string; cardBg: string; border: string; borderInner: string
  textPrimary: string; textSecondary: string; labelColor: string
  gold: string; goldBg: string
  green: string; greenBg: string; greenBorder: string
  yellow: string; yellowBg: string; yellowBorder: string
  red: string; redBg: string; redBorder: string
  btnBg: string; btnBorder: string; btnText: string
  inputBg: string; inputBorder: string; inputFocus: string
  overlay: string; modalBg: string
  [k: string]: string
}

interface ExpenseCategory { id: string; name: string }
interface Expense {
  id: string; category_id?: string; description: string; amount: number
  expense_date: string; apartment_code?: string; created_by?: string
  expense_categories?: { name: string }
}
interface CleaningCost {
  id: string; apartment_code: string; scheduled_date: string
  cleaning_cost?: number; extra_costs?: { type: string; description?: string; amount: number }[]
  cleaner_id?: string; cleaner_name?: string
}
interface CostItem {
  id: string; type: 'expense' | 'cleaning'
  description: string; amount: number; date: string
  category?: string; apartment_code?: string; person?: string
  raw?: Expense
}

interface CustosTabProps { t: T; token: string; user: AppUser; cleaners: AppUser[] }

type Period = 'month' | 'year' | 'all'

const APTS = [...LEBLON_APARTMENTS]
const fmtBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default function CustosTab({ t, token, user, cleaners }: CustosTabProps) {
  const now = new Date()
  const [period, setPeriod] = useState<Period>('month')
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [personFilter, setPersonFilter] = useState('all')

  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [items, setItems] = useState<CostItem[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [form, setForm] = useState({ category_id: '', description: '', amount: '', expense_date: '', apartment_code: '' })
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const h = { Authorization: `Basic ${token}`, 'Content-Type': 'application/json' }

  // ── Load categories once ──
  useEffect(() => {
    fetch(`/api/limpezas?action=expense-categories`, { headers: { Authorization: `Basic ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setCategories(d) })
      .catch(() => {})
  }, [token])

  // ── Load costs ──
  const load = useCallback(async () => {
    setLoading(true)
    try {
      let url = `/api/limpezas?action=costs-summary&month=${month}&year=${year}`
      if (period === 'year') url = `/api/limpezas?action=costs-summary&year=${year}`
      if (period === 'all') url = `/api/limpezas?action=costs-summary&all=true`

      const r = await fetch(url, { headers: { Authorization: `Basic ${token}` } })
      if (!r.ok) { setLoading(false); return }
      const data = await r.json()

      const merged: CostItem[] = []

      // Expenses
      if (Array.isArray(data.expenses)) {
        for (const e of data.expenses) {
          merged.push({
            id: e.id,
            type: 'expense',
            description: e.description || e.expense_categories?.name || 'Despesa',
            amount: Number(e.amount) || 0,
            date: e.expense_date,
            category: e.expense_categories?.name || '',
            apartment_code: e.apartment_code,
            person: e.created_by,
            raw: e,
          })
        }
      }

      // Cleanings
      if (Array.isArray(data.cleanings)) {
        for (const c of data.cleanings as CleaningCost[]) {
          const base = Number(c.cleaning_cost) || 0
          const extras = (c.extra_costs || []).reduce((s, x) => s + (Number(x.amount) || 0), 0)
          const total = base + extras
          if (total <= 0) continue
          const extraDesc = (c.extra_costs || []).map(x => x.type).join(', ')
          merged.push({
            id: c.id,
            type: 'cleaning',
            description: `Limpeza ${c.apartment_code}${extraDesc ? ' + ' + extraDesc : ''}`,
            amount: total,
            date: c.scheduled_date,
            category: 'Limpeza',
            apartment_code: c.apartment_code,
            person: c.cleaner_id,
          })
        }
      }

      merged.sort((a, b) => b.date.localeCompare(a.date))
      setItems(merged)
    } catch { }
    setLoading(false)
  }, [token, month, year, period])

  useEffect(() => { load() }, [load])

  // ── Filtered items ──
  const filtered = useMemo(() => {
    if (personFilter === 'all') return items
    return items.filter(i => i.person === personFilter)
  }, [items, personFilter])

  const total = useMemo(() => filtered.reduce((s, i) => s + i.amount, 0), [filtered])
  const count = filtered.length

  // ── Navigator ──
  function nav(dir: -1 | 1) {
    if (period === 'month') {
      let m = month + dir, y = year
      if (m < 1) { m = 12; y-- }
      if (m > 12) { m = 1; y++ }
      setMonth(m); setYear(y)
    } else if (period === 'year') {
      setYear(y => y + dir)
    }
  }

  const periodLabel = period === 'month'
    ? `${MONTHS_FULL[month - 1]} ${year}`
    : period === 'year' ? `${year}` : 'Até Hoje'

  // ── Modal helpers ──
  function openNew() {
    setEditing(null)
    const today = new Date().toISOString().slice(0, 10)
    setForm({ category_id: categories[0]?.id || '', description: '', amount: '', expense_date: today, apartment_code: '' })
    setShowModal(true)
  }

  function openEdit(e: Expense) {
    setEditing(e)
    setForm({
      category_id: e.category_id || '',
      description: e.description || '',
      amount: String(e.amount || ''),
      expense_date: e.expense_date || '',
      apartment_code: e.apartment_code || '',
    })
    setShowModal(true)
  }

  async function save() {
    if (!form.amount || isNaN(Number(form.amount))) return
    setSaving(true)
    try {
      const expense: any = {
        category_id: form.category_id || null,
        description: form.description,
        amount: parseFloat(form.amount),
        expense_date: form.expense_date,
        apartment_code: form.apartment_code || null,
      }
      if (editing) {
        expense.id = editing.id
        await fetch('/api/limpezas', { method: 'POST', headers: h, body: JSON.stringify({ action: 'update-expense', expense }) })
      } else {
        await fetch('/api/limpezas', { method: 'POST', headers: h, body: JSON.stringify({ action: 'create-expense', expense }) })
      }
      setShowModal(false)
      load()
    } catch { }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    try {
      await fetch('/api/limpezas', { method: 'POST', headers: h, body: JSON.stringify({ action: 'delete', table: 'app_expenses', id }) })
      setDeleteConfirm(null)
      load()
    } catch { }
  }

  function fmtDate(d: string) {
    if (!d) return ''
    const [y, m, day] = d.split('-')
    return `${day}/${m}`
  }

  const isAdmin = user.role === 'admin'

  // ─── RENDER ──────────────────────────────────────────────
  return (
    <div style={{ padding: '0 0 100px' }}>

      {/* Period filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {([['month', 'Mês'], ['year', 'Ano'], ['all', 'Até Hoje']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setPeriod(key as Period)} style={{
            flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 700,
            border: `1.5px solid ${period === key ? t.gold : t.border}`,
            background: period === key ? t.goldBg : t.cardBg,
            color: period === key ? t.gold : t.textSecondary,
            cursor: 'pointer',
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* Navigator */}
      {period !== 'all' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 14 }}>
          <button onClick={() => nav(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <ChevronLeft size={20} color={t.textSecondary} />
          </button>
          <span style={{ fontSize: 15, fontWeight: 700, color: t.textPrimary, minWidth: 140, textAlign: 'center' }}>
            {periodLabel}
          </span>
          <button onClick={() => nav(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <ChevronRight size={20} color={t.textSecondary} />
          </button>
        </div>
      )}

      {/* Person filter dropdown */}
      <div style={{ marginBottom: 14 }}>
        <select
          value={personFilter}
          onChange={e => setPersonFilter(e.target.value)}
          style={{
            width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: t.inputBg, border: `1.5px solid ${t.inputBorder}`, color: t.textPrimary,
            outline: 'none', cursor: 'pointer', appearance: 'auto',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = t.inputFocus)}
          onBlur={e => (e.currentTarget.style.borderColor = t.inputBorder)}
        >
          <option value="all">Todos</option>
          {cleaners.map(c => (
            <option key={c.id} value={c.id}>{c.display_name}</option>
          ))}
        </select>
      </div>

      {/* Summary card */}
      <div style={{
        borderRadius: 14, padding: '20px 18px', marginBottom: 18,
        background: `linear-gradient(135deg, ${t.gold}28, ${t.gold}08)`,
        border: `1.5px solid ${t.gold}40`,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: t.gold, textTransform: 'uppercase', marginBottom: 8 }}>
          {periodLabel}
        </div>
        {loading ? (
          <Loader2 size={20} color={t.gold} style={{ animation: 'spin 1s linear infinite' }} />
        ) : (
          <>
            <div style={{ fontSize: 26, fontWeight: 800, color: t.textPrimary, marginBottom: 4 }}>
              {fmtBRL(total)}
            </div>
            <div style={{ fontSize: 12, color: t.textSecondary }}>
              {count} {count === 1 ? 'item' : 'itens'}
            </div>
          </>
        )}
      </div>

      {/* Expense list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Loader2 size={24} color={t.gold} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: t.textSecondary, fontSize: 13 }}>
          Nenhum custo neste periodo.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map(item => (
            <div key={`${item.type}-${item.id}`} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              background: t.cardBg, border: `1px solid ${t.borderInner}`, borderRadius: 10,
            }}>
              {/* Color indicator */}
              <div style={{
                width: 4, height: 32, borderRadius: 2, flexShrink: 0,
                background: item.type === 'cleaning' ? t.green : t.gold,
              }} />
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.description}
                </div>
                <div style={{ fontSize: 10, color: t.textSecondary, marginTop: 2, display: 'flex', gap: 6 }}>
                  {item.category && <span>{item.category}</span>}
                  {item.apartment_code && <span>{item.apartment_code}</span>}
                  <span>{fmtDate(item.date)}</span>
                </div>
              </div>
              {/* Amount */}
              <div style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary, whiteSpace: 'nowrap' }}>
                {fmtBRL(item.amount)}
              </div>
              {/* Actions (only for manual expenses, admin only) */}
              {item.type === 'expense' && isAdmin && (
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => item.raw && openEdit(item.raw)} style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                  }}>
                    <Pencil size={14} color={t.textSecondary} />
                  </button>
                  {deleteConfirm === item.id ? (
                    <button onClick={() => handleDelete(item.id)} style={{
                      background: t.redBg, border: `1px solid ${t.redBorder}`, borderRadius: 6,
                      cursor: 'pointer', padding: '2px 8px', fontSize: 10, fontWeight: 700, color: t.red,
                    }}>
                      Confirmar
                    </button>
                  ) : (
                    <button onClick={() => setDeleteConfirm(item.id)} style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                    }}>
                      <Trash2 size={14} color={t.textSecondary} />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add button */}
      {isAdmin && (
        <button onClick={openNew} style={{
          width: '100%', marginTop: 16, padding: '12px 0', borderRadius: 10,
          border: `2px dashed ${t.gold}60`, background: 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          cursor: 'pointer', color: t.gold, fontSize: 13, fontWeight: 700,
        }}>
          <Plus size={16} /> Nova Despesa
        </button>
      )}

      {/* ─── MODAL ───────────────────────────────────────── */}
      {showModal && (
        <div onClick={() => setShowModal(false)} style={{
          position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: t.overlay,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: t.modalBg, borderRadius: 16, padding: 20, width: '92%', maxWidth: 400,
            border: `1.5px solid ${t.border}`, maxHeight: '85vh', overflowY: 'auto',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: t.textPrimary }}>
                {editing ? 'Editar Despesa' : 'Nova Despesa'}
              </span>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={20} color={t.textSecondary} />
              </button>
            </div>

            {/* Category buttons */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: t.labelColor, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'block' }}>
                Categoria
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {categories.map(cat => (
                  <button key={cat.id} onClick={() => setForm(f => ({ ...f, category_id: cat.id }))} style={{
                    padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    border: `1.5px solid ${form.category_id === cat.id ? t.gold : t.border}`,
                    background: form.category_id === cat.id ? t.goldBg : t.cardBg,
                    color: form.category_id === cat.id ? t.gold : t.textSecondary,
                  }}>
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: t.labelColor, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'block' }}>
                Descricao
              </label>
              <input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Ex: Uber para o apto"
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13,
                  background: t.inputBg, border: `1.5px solid ${t.inputBorder}`, color: t.textPrimary,
                  outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = t.inputFocus)}
                onBlur={e => (e.currentTarget.style.borderColor = t.inputBorder)}
              />
            </div>

            {/* Amount */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: t.labelColor, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'block' }}>
                Valor (R$)
              </label>
              <input
                type="number"
                inputMode="decimal"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0,00"
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13,
                  background: t.inputBg, border: `1.5px solid ${t.inputBorder}`, color: t.textPrimary,
                  outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = t.inputFocus)}
                onBlur={e => (e.currentTarget.style.borderColor = t.inputBorder)}
              />
            </div>

            {/* Date */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: t.labelColor, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'block' }}>
                Data
              </label>
              <input
                type="date"
                value={form.expense_date}
                onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))}
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13,
                  background: t.inputBg, border: `1.5px solid ${t.inputBorder}`, color: t.textPrimary,
                  outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = t.inputFocus)}
                onBlur={e => (e.currentTarget.style.borderColor = t.inputBorder)}
              />
            </div>

            {/* Apartment */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: t.labelColor, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'block' }}>
                Apartamento (opcional)
              </label>
              <select
                value={form.apartment_code}
                onChange={e => setForm(f => ({ ...f, apartment_code: e.target.value }))}
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13,
                  background: t.inputBg, border: `1.5px solid ${t.inputBorder}`, color: t.textPrimary,
                  outline: 'none', boxSizing: 'border-box', cursor: 'pointer',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = t.inputFocus)}
                onBlur={e => (e.currentTarget.style.borderColor = t.inputBorder)}
              >
                <option value="">Nenhum</option>
                {APTS.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            {/* Save button */}
            <button onClick={save} disabled={saving || !form.amount} style={{
              width: '100%', padding: '12px 0', borderRadius: 10, fontSize: 14, fontWeight: 700,
              background: t.gold, color: '#fff', border: 'none', cursor: 'pointer',
              opacity: saving || !form.amount ? 0.5 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              {saving && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
              {editing ? 'Salvar' : 'Adicionar'}
            </button>
          </div>
        </div>
      )}

      {/* Spin keyframes */}
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
