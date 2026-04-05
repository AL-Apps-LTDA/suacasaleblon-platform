'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Check,
  X,
  Loader2,
  DollarSign,
  Wrench,
  Repeat,
  Calendar,
} from 'lucide-react'

// ─── TYPES ─────────────────────────────────────────────
interface AppUser {
  id: string
  username: string
  display_name: string
  role: string
  pix_key?: string
}

interface Props {
  t: any
  token: string
  user: AppUser
  isAdm: boolean
}

interface ExtraCost {
  type: string
  description?: string
  amount: number
}

interface Cleaning {
  id?: string
  apartment_code: string
  scheduled_date: string
  cleaning_cost?: number
  cost?: number
  extra_costs?: ExtraCost[]
  completed?: boolean
  cleaner_name?: string
}

interface Maintenance {
  id: string
  title: string
  apartment_code: string
  cost?: number
  last_done_at?: string
  description?: string
}

interface FixedExpense {
  id: string
  label: string
  amount: number
  active: boolean
  created_by?: string
  payment: { paid: boolean }
}

// ─── CONSTANTS ─────────────────────────────────────────
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const DEFAULT_FIXED_LABELS = [
  'Salário (funcionária contratada)',
  'Contador',
  'Tributos/Impostos',
  'Lavanderia',
  'Pró-labore',
]

// ─── HELPERS ───────────────────────────────────────────
function fmtBRL(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function parseMonth(m: number): string {
  return String(m + 1).padStart(2, '0')
}

function apiH(token: string) {
  return { Authorization: `Basic ${token}`, 'Content-Type': 'application/json' }
}

// ─── COLLAPSIBLE SECTION ───────────────────────────────
function Section({
  title,
  icon,
  t,
  children,
  badge,
}: {
  title: string
  icon: React.ReactNode
  t: any
  children: React.ReactNode
  badge?: string
}) {
  const [open, setOpen] = useState(true)
  return (
    <div
      style={{
        background: t.cardBg,
        border: `1.5px solid ${t.border}`,
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {icon}
          <span style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary }}>{title}</span>
          {badge && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: t.gold,
                background: t.goldBg,
                padding: '2px 8px',
                borderRadius: 6,
              }}
            >
              {badge}
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp size={18} color={t.textSecondary} />
        ) : (
          <ChevronDown size={18} color={t.textSecondary} />
        )}
      </div>
      {open && (
        <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${t.borderInner}` }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ─── MAIN COMPONENT ────────────────────────────────────
export default function CustosTab({ t, token, user, isAdm }: Props) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())
  const [ytd, setYtd] = useState(false)

  const [cleanings, setCleanings] = useState<Cleaning[]>([])
  const [maintenance, setMaintenance] = useState<Maintenance[]>([])
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [fixedLoading, setFixedLoading] = useState(false)

  // New fixed expense form
  const [showNewFixed, setShowNewFixed] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [savingNew, setSavingNew] = useState(false)

  // Editing fixed expense amounts
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [savingEdit, setSavingEdit] = useState<string | null>(null)

  const h = apiH(token)

  const inputS = (extra?: any): any => ({
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    fontSize: 13,
    background: t.inputBg,
    border: `1.5px solid ${t.inputBorder}`,
    color: t.textPrimary,
    outline: 'none',
    boxSizing: 'border-box' as const,
    ...extra,
  })

  // Years range
  const years = useMemo(() => {
    const cur = now.getFullYear()
    return [cur - 2, cur - 1, cur, cur + 1, cur + 2]
  }, [])

  // ─── Period label ────────────────────────────────────
  const periodLabel = useMemo(() => {
    if (ytd) {
      if (month === 0) return `Janeiro ${year} (YTD)`
      return `Janeiro — ${MONTHS[month]} ${year} (YTD)`
    }
    return `${MONTHS[month]} ${year}`
  }, [month, year, ytd])

  // ─── Date range for filtering ────────────────────────
  const dateRange = useMemo(() => {
    const startMonth = ytd ? 0 : month
    const start = `${year}-${String(startMonth + 1).padStart(2, '0')}-01`
    const endMonthDate = new Date(year, month + 1, 0)
    const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(endMonthDate.getDate()).padStart(2, '0')}`
    return { start, end }
  }, [month, year, ytd])

  // ─── Fetch cleanings & maintenance ───────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [cRes, mRes] = await Promise.all([
        fetch('/api/limpezas?action=cleanings', { headers: { Authorization: `Basic ${token}` } }),
        fetch('/api/limpezas?action=maintenance', { headers: { Authorization: `Basic ${token}` } }),
      ])
      if (cRes.ok) {
        const d = await cRes.json()
        setCleanings(Array.isArray(d) ? d : [])
      }
      if (mRes.ok) {
        const d = await mRes.json()
        setMaintenance(Array.isArray(d) ? d : [])
      }
    } catch {
      // silent
    }
    setLoading(false)
  }, [token])

  // ─── Fetch fixed expenses (per month or YTD) ────────
  const fetchFixed = useCallback(async () => {
    setFixedLoading(true)
    if (ytd) {
      // Fetch all months from Jan to selected month and merge
      const startMonth = 0
      const endMonth = month
      const promises: Promise<FixedExpense[]>[] = []
      for (let m = startMonth; m <= endMonth; m++) {
        const mm = String(m + 1).padStart(2, '0')
        promises.push(
          fetch(`/api/limpezas?action=fixed-expenses&month=${mm}&year=${year}`, {
            headers: { Authorization: `Basic ${token}` },
          })
            .then((r) => (r.ok ? r.json() : []))
            .then((d) => (Array.isArray(d) ? d : []))
            .catch(() => [] as FixedExpense[])
        )
      }
      const results = await Promise.all(promises)
      // For YTD, accumulate: group by label, sum amounts
      const map = new Map<string, FixedExpense>()
      for (const monthExpenses of results) {
        for (const exp of monthExpenses) {
          const existing = map.get(exp.label)
          if (existing) {
            existing.amount = (existing.amount || 0) + (exp.amount || 0)
            // If any month is unpaid, mark as unpaid
            if (!exp.payment?.paid) existing.payment = { paid: false }
          } else {
            map.set(exp.label, { ...exp, amount: exp.amount || 0 })
          }
        }
      }
      setFixedExpenses(Array.from(map.values()))
    } else {
      try {
        const mm = parseMonth(month)
        const r = await fetch(
          `/api/limpezas?action=fixed-expenses&month=${mm}&year=${year}`,
          { headers: { Authorization: `Basic ${token}` } }
        )
        if (r.ok) {
          const d = await r.json()
          setFixedExpenses(Array.isArray(d) ? d : [])
        } else {
          setFixedExpenses([])
        }
      } catch {
        setFixedExpenses([])
      }
    }
    setFixedLoading(false)
  }, [token, month, year, ytd])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    fetchFixed()
  }, [fetchFixed])

  // ─── Filter cleanings by period ──────────────────────
  const filteredCleanings = useMemo(() => {
    return cleanings.filter((c) => {
      const d = c.scheduled_date
      if (!d) return false
      return d >= dateRange.start && d <= dateRange.end && c.completed
    })
  }, [cleanings, dateRange])

  // ─── Filter maintenance by period ────────────────────
  const filteredMaintenance = useMemo(() => {
    return maintenance.filter((m) => {
      const d = m.last_done_at
      if (!d) return false
      return d >= dateRange.start && d <= dateRange.end
    })
  }, [maintenance, dateRange])

  // ─── Compute totals ─────────────────────────────────
  const totals = useMemo(() => {
    let limpezas = 0
    let extras = 0
    for (const c of filteredCleanings) {
      limpezas += c.cleaning_cost ?? c.cost ?? 0
      if (c.extra_costs && Array.isArray(c.extra_costs)) {
        for (const ec of c.extra_costs) {
          extras += ec.amount ?? 0
        }
      }
    }
    let manutencao = 0
    for (const m of filteredMaintenance) {
      manutencao += m.cost ?? 0
    }
    let fixos = 0
    for (const f of fixedExpenses) {
      fixos += f.amount ?? 0
    }
    return { limpezas, extras, manutencao, fixos, total: limpezas + extras + manutencao + fixos }
  }, [filteredCleanings, filteredMaintenance, fixedExpenses])

  // ─── Upsert fixed expense ───────────────────────────
  async function saveFixedExpense(id: string | null, label: string, amount: number) {
    const mm = parseMonth(month)
    const body: any = {
      action: 'upsert-fixed-expense',
      label,
      amount,
      month: mm,
      year: String(year),
    }
    if (id) body.id = id
    const r = await fetch('/api/limpezas', { method: 'POST', headers: h, body: JSON.stringify(body) })
    return r.ok
  }

  async function toggleFixedPaid(id: string, paid: boolean) {
    setSavingEdit(id)
    try {
      await fetch('/api/limpezas', {
        method: 'POST',
        headers: h,
        body: JSON.stringify({ action: 'mark-fixed-paid', id, paid: !paid }),
      })
      await fetchFixed()
    } catch {
      // silent
    }
    setSavingEdit(null)
  }

  async function handleAddFixed() {
    if (!newLabel.trim()) return
    setSavingNew(true)
    const amt = parseFloat(newAmount.replace(',', '.')) || 0
    const ok = await saveFixedExpense(null, newLabel.trim(), amt)
    if (ok) {
      setNewLabel('')
      setNewAmount('')
      setShowNewFixed(false)
      await fetchFixed()
    }
    setSavingNew(false)
  }

  async function handleEditAmount(exp: FixedExpense) {
    setSavingEdit(exp.id)
    const amt = parseFloat(editAmount.replace(',', '.')) || 0
    const ok = await saveFixedExpense(exp.id, exp.label, amt)
    if (ok) {
      setEditingId(null)
      setEditAmount('')
      await fetchFixed()
    }
    setSavingEdit(null)
  }

  function canEditFixed(exp: FixedExpense): boolean {
    if (isAdm) return true
    if (exp.created_by === user.id) return true
    return false
  }

  // ─── Extra cost type labels ─────────────────────────
  function extraLabel(type: string): string {
    switch (type) {
      case 'transporte': return 'Transporte'
      case 'compra': return 'Compra'
      case 'manutencao': return 'Manutenção'
      case 'outro': return 'Outro'
      default: return type
    }
  }

  function fmtDate(s: string): string {
    if (!s) return '—'
    const [y, m, d] = s.split('-')
    return `${d}/${m}/${y}`
  }

  // ─── RENDER ─────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
        <Loader2 size={28} color={t.gold} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Spin animation */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* ─── FILTER BAR ──────────────────────────────── */}
      <div
        style={{
          background: t.cardBg,
          border: `1.5px solid ${t.border}`,
          borderRadius: 12,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Month selector */}
          <div style={{ flex: '1 1 140px', minWidth: 120 }}>
            <label
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: t.labelColor,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 4,
                display: 'block',
              }}
            >
              Mês
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              style={{
                ...inputS(),
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
                paddingRight: 32,
              }}
            >
              {MONTHS.map((m, i) => (
                <option key={i} value={i}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Year selector */}
          <div style={{ flex: '0 1 100px', minWidth: 80 }}>
            <label
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: t.labelColor,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 4,
                display: 'block',
              }}
            >
              Ano
            </label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              style={{
                ...inputS(),
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
                paddingRight: 32,
              }}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* YTD toggle */}
          <div style={{ flex: '0 0 auto', alignSelf: 'flex-end' }}>
            <button
              onClick={() => setYtd(!ytd)}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                border: `1.5px solid ${ytd ? t.gold : t.btnBorder}`,
                background: ytd ? t.goldBg : t.btnBg,
                color: ytd ? t.gold : t.btnText,
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              <Calendar size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              Year to Date
            </button>
          </div>
        </div>

        {/* Period label */}
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: t.gold,
            textAlign: 'center',
            padding: '4px 0',
          }}
        >
          {periodLabel}
        </div>
      </div>

      {/* ─── CUSTOS DE LIMPEZA ───────────────────────── */}
      <Section
        title="Custos de Limpeza"
        icon={<DollarSign size={16} color={t.gold} />}
        t={t}
        badge={`R$ ${fmtBRL(totals.limpezas + totals.extras)}`}
      >
        {filteredCleanings.length === 0 ? (
          <div
            style={{
              padding: '20px 0 4px',
              fontSize: 13,
              color: t.textSecondary,
              textAlign: 'center',
              fontStyle: 'italic',
            }}
          >
            Nenhuma limpeza concluída no período.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 12 }}>
            {filteredCleanings.map((c, i) => {
              const costVal = c.cleaning_cost ?? c.cost ?? 0
              const extrasTotal =
                c.extra_costs?.reduce((s, ec) => s + (ec.amount ?? 0), 0) ?? 0
              return (
                <div
                  key={c.id ?? i}
                  style={{
                    background: t.inputBg,
                    border: `1px solid ${t.borderInner}`,
                    borderRadius: 8,
                    padding: '10px 12px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>
                      {c.apartment_code}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: t.gold }}>
                      R$ {fmtBRL(costVal)}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 11,
                      color: t.textSecondary,
                    }}
                  >
                    <span>{fmtDate(c.scheduled_date)}</span>
                    <span>{c.cleaner_name || '—'}</span>
                  </div>
                  {/* Extra costs */}
                  {c.extra_costs && c.extra_costs.length > 0 && (
                    <div
                      style={{
                        marginTop: 8,
                        paddingTop: 8,
                        borderTop: `1px dashed ${t.borderInner}`,
                      }}
                    >
                      {c.extra_costs.map((ec, j) => (
                        <div
                          key={j}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: 11,
                            color: t.textSecondary,
                            marginBottom: 2,
                          }}
                        >
                          <span>
                            {extraLabel(ec.type)}
                            {ec.description ? ` — ${ec.description}` : ''}
                          </span>
                          <span style={{ fontWeight: 600 }}>R$ {fmtBRL(ec.amount ?? 0)}</span>
                        </div>
                      ))}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          fontSize: 11,
                          fontWeight: 700,
                          color: t.gold,
                          marginTop: 4,
                        }}
                      >
                        Extras: R$ {fmtBRL(extrasTotal)}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Sub-totals */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 8,
                background: t.goldBg,
                border: `1px solid ${t.gold}30`,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              <div style={{ color: t.textPrimary }}>
                Limpezas: <span style={{ color: t.gold }}>R$ {fmtBRL(totals.limpezas)}</span>
              </div>
              <div style={{ color: t.textPrimary }}>
                Extras: <span style={{ color: t.gold }}>R$ {fmtBRL(totals.extras)}</span>
              </div>
            </div>
          </div>
        )}
      </Section>

      {/* ─── CUSTOS DE MANUTENÇÃO ────────────────────── */}
      <Section
        title="Custos de Manutenção"
        icon={<Wrench size={16} color={t.gold} />}
        t={t}
        badge={`R$ ${fmtBRL(totals.manutencao)}`}
      >
        {filteredMaintenance.length === 0 ? (
          <div
            style={{
              padding: '20px 0 4px',
              fontSize: 13,
              color: t.textSecondary,
              textAlign: 'center',
              fontStyle: 'italic',
            }}
          >
            Nenhuma manutenção no período.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 12 }}>
            {filteredMaintenance.map((m) => (
              <div
                key={m.id}
                style={{
                  background: t.inputBg,
                  border: `1px solid ${t.borderInner}`,
                  borderRadius: 8,
                  padding: '10px 12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 4,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>
                    {m.title}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: t.gold }}>
                    R$ {fmtBRL(m.cost ?? 0)}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 11,
                    color: t.textSecondary,
                  }}
                >
                  <span>{m.apartment_code || '—'}</span>
                  <span>{m.last_done_at ? fmtDate(m.last_done_at) : '—'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ─── CUSTOS FIXOS E RECORRENTES ──────────────── */}
      <Section
        title="Custos Fixos e Recorrentes"
        icon={<Repeat size={16} color={t.gold} />}
        t={t}
        badge={`R$ ${fmtBRL(totals.fixos)}`}
      >
        {fixedLoading ? (
          <div style={{ padding: '20px 0', textAlign: 'center' }}>
            <Loader2 size={20} color={t.gold} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 12 }}>
            {fixedExpenses.length === 0 && !showNewFixed && (
              <div
                style={{
                  padding: '12px 0',
                  fontSize: 13,
                  color: t.textSecondary,
                  textAlign: 'center',
                  fontStyle: 'italic',
                }}
              >
                Nenhuma despesa fixa cadastrada para este período.
              </div>
            )}

            {fixedExpenses.map((exp) => {
              const paid = exp.payment?.paid ?? false
              const editable = canEditFixed(exp) && !ytd
              const isEditing = editingId === exp.id
              const isSaving = savingEdit === exp.id

              return (
                <div
                  key={exp.id}
                  style={{
                    background: paid ? t.greenBg : t.inputBg,
                    border: `1.5px solid ${paid ? t.greenBorder : t.borderInner}`,
                    borderRadius: 8,
                    padding: '10px 12px',
                    transition: 'all 0.15s',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: t.textPrimary,
                        flex: 1,
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {exp.label}
                    </span>

                    {isEditing ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, color: t.textSecondary }}>R$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditAmount(exp)
                            if (e.key === 'Escape') {
                              setEditingId(null)
                              setEditAmount('')
                            }
                          }}
                          autoFocus
                          style={{
                            ...inputS({ width: 90, padding: '6px 8px', fontSize: 13, textAlign: 'right' as const }),
                          }}
                        />
                        <button
                          onClick={() => handleEditAmount(exp)}
                          disabled={!!isSaving}
                          style={{
                            background: t.green,
                            color: '#fff',
                            border: 'none',
                            borderRadius: 6,
                            padding: '5px 6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          {isSaving ? (
                            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                          ) : (
                            <Check size={14} />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null)
                            setEditAmount('')
                          }}
                          style={{
                            background: 'transparent',
                            color: t.textSecondary,
                            border: 'none',
                            borderRadius: 6,
                            padding: '5px 6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: t.gold,
                            cursor: editable ? 'pointer' : 'default',
                          }}
                          onClick={() => {
                            if (editable) {
                              setEditingId(exp.id)
                              setEditAmount(
                                (exp.amount ?? 0).toFixed(2).replace('.', ',')
                              )
                            }
                          }}
                          title={editable ? 'Clique para editar valor' : undefined}
                        >
                          R$ {fmtBRL(exp.amount ?? 0)}
                        </span>

                        {/* Paid toggle */}
                        {!ytd && (
                          <button
                            onClick={() => toggleFixedPaid(exp.id, paid)}
                            disabled={!editable || !!isSaving}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 30,
                              height: 30,
                              borderRadius: 8,
                              border: `1.5px solid ${paid ? t.greenBorder : t.redBorder}`,
                              background: paid ? t.greenBg : t.redBg,
                              cursor: editable ? 'pointer' : 'default',
                              opacity: editable ? 1 : 0.5,
                              transition: 'all 0.15s',
                            }}
                            title={paid ? 'Pago' : 'Não pago'}
                          >
                            {isSaving ? (
                              <Loader2
                                size={14}
                                color={t.textSecondary}
                                style={{ animation: 'spin 1s linear infinite' }}
                              />
                            ) : paid ? (
                              <Check size={14} color={t.green} />
                            ) : (
                              <X size={14} color={t.red} />
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Status label */}
                  <div style={{ marginTop: 4 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: paid ? t.green : t.red,
                      }}
                    >
                      {paid ? 'Pago' : 'Pendente'}
                    </span>
                  </div>
                </div>
              )
            })}

            {/* New fixed expense form */}
            {showNewFixed && !ytd && (
              <div
                style={{
                  background: t.inputBg,
                  border: `1.5px dashed ${t.gold}50`,
                  borderRadius: 8,
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <input
                  type="text"
                  placeholder="Nome da despesa"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  style={inputS()}
                  autoFocus
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, color: t.textSecondary, whiteSpace: 'nowrap' }}>
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddFixed()
                    }}
                    style={inputS({ flex: 1 })}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleAddFixed}
                    disabled={savingNew || !newLabel.trim()}
                    style={{
                      flex: 1,
                      padding: '10px 0',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: savingNew || !newLabel.trim() ? 'default' : 'pointer',
                      background: t.gold,
                      color: '#fff',
                      border: 'none',
                      opacity: savingNew || !newLabel.trim() ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    {savingNew ? (
                      <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Check size={14} />
                    )}
                    Salvar
                  </button>
                  <button
                    onClick={() => {
                      setShowNewFixed(false)
                      setNewLabel('')
                      setNewAmount('')
                    }}
                    style={{
                      padding: '10px 16px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: t.btnBg,
                      color: t.btnText,
                      border: `1.5px solid ${t.btnBorder}`,
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Add button */}
            {!showNewFixed && !ytd && (
              <button
                onClick={() => setShowNewFixed(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '12px 0',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: 'transparent',
                  color: t.gold,
                  border: `1.5px dashed ${t.gold}50`,
                  transition: 'all 0.15s',
                }}
              >
                <Plus size={16} />
                Nova Despesa
              </button>
            )}
          </div>
        )}
      </Section>

      {/* ─── TOTAL BOX ───────────────────────────────── */}
      <div
        style={{
          background: t.cardBg,
          border: `2px solid ${t.gold}`,
          borderRadius: 12,
          padding: 16,
          position: 'sticky',
          bottom: 12,
          zIndex: 10,
          boxShadow: `0 -4px 20px ${t.overlay}`,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
              color: t.textSecondary,
            }}
          >
            <span>Total Limpezas</span>
            <span style={{ fontWeight: 600 }}>R$ {fmtBRL(totals.limpezas)}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
              color: t.textSecondary,
            }}
          >
            <span>Total Extras</span>
            <span style={{ fontWeight: 600 }}>R$ {fmtBRL(totals.extras)}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
              color: t.textSecondary,
            }}
          >
            <span>Total Manutenção</span>
            <span style={{ fontWeight: 600 }}>R$ {fmtBRL(totals.manutencao)}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
              color: t.textSecondary,
            }}
          >
            <span>Total Fixos</span>
            <span style={{ fontWeight: 600 }}>R$ {fmtBRL(totals.fixos)}</span>
          </div>

          <div
            style={{
              borderTop: `1.5px solid ${t.gold}40`,
              marginTop: 4,
              paddingTop: 10,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 800, color: t.textPrimary }}>
              TOTAL GERAL
            </span>
            <span style={{ fontSize: 18, fontWeight: 800, color: t.gold }}>
              R$ {fmtBRL(totals.total)}
            </span>
          </div>

          {ytd && (
            <div
              style={{
                fontSize: 10,
                color: t.textSecondary,
                textAlign: 'center',
                marginTop: 4,
                fontStyle: 'italic',
              }}
            >
              Acumulado: {periodLabel}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
