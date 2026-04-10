'use client'

import { useState, useMemo, useEffect, use } from 'react'
import {
  Loader2, Lock, LogOut, Eye, EyeOff, ChevronLeft, ChevronRight,
  DollarSign, TrendingUp, Percent, BedDouble,
  Hotel, BarChart3, Building2, Sun, Moon
} from 'lucide-react'
import type { ApartmentSummary, MonthData } from '@/lib/types'
import { parseBRL, fmtBRL, getMonthIndex, MONTHS_SHORT, MONTHS_FULL } from '@/lib/types'

// ─── CONFIG ────────────────────────────────────────────
const MANAGER_PIX = { name: 'AL Apps LTDA', key: 'financeiro@suacasaleblon.com' }

const OWNER_CONFIG: Record<string, { password: string; label: string }> = {
  '103': { password: 'prop103', label: 'Apartamento 103 — Leblon' },
  '102': { password: 'prop102', label: 'Apartamento 102 — Leblon' },
  '403': { password: 'prop403', label: 'Apartamento 403 — Leblon' },
  '303': { password: 'prop303', label: 'Apartamento 303 — Leblon' },
  '334A': { password: 'prop334A', label: 'Apartamento 334A — Leblon' },
  'BZ01': { password: 'propBZ01', label: 'Casa BZ01 — Búzios' },
  'BZ02': { password: 'propBZ02', label: 'Casa BZ02 — Búzios' },
}

// ─── HELPERS ───────────────────────────────────────────
function filterMonths(months: MonthData[], filter: string, sel: number): MonthData[] {
  if (filter === 'all') return months
  if (filter === 'ytd') return months.filter(m => getMonthIndex(m.month) <= new Date().getMonth())
  if (filter === 'month') return months.filter(m => getMonthIndex(m.month) === sel)
  return months
}
function sumF(months: MonthData[], f: 'receitaTotal' | 'despesaTotal' | 'resultado') {
  return months.reduce((s, m) => s + parseBRL(m[f]), 0)
}
function countNights(months: MonthData[]): number {
  let nights = 0
  for (const m of months) {
    for (const r of m.reservations) {
      if (r.source === 'adjustment') continue
      const n = (r as any).nights
      if (n && n > 0) { nights += n; continue }
      const ci = parseInt(r.checkin), co = parseInt(r.checkout)
      if (!isNaN(ci) && !isNaN(co) && co > ci) nights += (co - ci)
    }
  }
  return nights
}
function availableNights(filter: string, sel: number, year: number): number {
  if (filter === 'month') {
    return new Date(year, sel + 1, 0).getDate()
  }
  if (filter === 'ytd') {
    let total = 0
    for (let i = 0; i <= new Date().getMonth(); i++) total += new Date(year, i + 1, 0).getDate()
    return total
  }
  let total = 0
  for (let i = 0; i < 12; i++) total += new Date(year, i + 1, 0).getDate()
  return total
}
function fmtDate(val: string, monthIdx?: number, year = 2026): string {
  if (val.includes('-')) { const [y, m, d] = val.split('-'); return `${d}/${m}/${y}` }
  const day = parseInt(val)
  if (!isNaN(day) && monthIdx !== undefined) return `${String(day).padStart(2, '0')}/${String(monthIdx + 1).padStart(2, '0')}/${year}`
  return val
}

// ─── THEME ─────────────────────────────────────────────
const LIGHT = {
  bg: '#faf8f5', surface: '#ffffff', elevated: '#f3efe8', border: '#e0d8cc',
  muted: '#7d604b', text: '#2e221c', accent: '#b08a40', accentBg: 'rgba(176,138,64,0.08)',
  green: '#16a34a', red: '#dc2626',
}
const DARK = {
  bg: '#1a1815', surface: '#24221e', elevated: '#302e28', border: '#3a3630',
  muted: '#a09080', text: '#f0eee8', accent: '#c9a96e', accentBg: 'rgba(201,169,110,0.10)',
  green: '#22c55e', red: '#ef4444',
}

// ─── LOGIN ─────────────────────────────────────────────
function LoginScreen({ config, code, onLogin }: { config: { label: string; password: string }; code: string; onLogin: () => void }) {
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  function handleSubmit() {
    if (!pw) { setError(true); return }
    setLoading(true)
    setTimeout(() => {
      if (pw === config.password) {
        sessionStorage.setItem(`prop_auth_${code}`, 'true')
        onLogin()
      } else {
        setError(true)
        setLoading(false)
      }
    }, 400)
  }

  return (
    <div style={{ minHeight: '100vh', background: LIGHT.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>
        <img src="/images/logo.png" alt="Sua Casa Leblon" style={{ width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} />
        <h1 style={{ fontSize: 20, fontWeight: 700, color: LIGHT.text, marginBottom: 4 }}>Área do Proprietário</h1>
        <p style={{ fontSize: 13, color: LIGHT.muted, marginBottom: 8 }}>{config.label}</p>
        <p style={{ fontSize: 11, color: LIGHT.muted, marginBottom: 28, opacity: 0.7 }}>Acesse seus relatórios financeiros</p>

        <div style={{ background: LIGHT.surface, border: `1.5px solid ${LIGHT.border}`, borderRadius: 16, padding: '24px 20px', textAlign: 'left' }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: LIGHT.muted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Senha de acesso</label>
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <input
              type={show ? 'text' : 'password'}
              value={pw}
              onChange={e => { setPw(e.target.value); setError(false) }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Digite sua senha"
              autoFocus
              style={{
                width: '100%', padding: '12px 44px 12px 16px', borderRadius: 12, fontSize: 14,
                background: LIGHT.elevated, border: `1.5px solid ${error ? '#dc2626' : LIGHT.border}`,
                color: LIGHT.text, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
              }}
            />
            <button onClick={() => setShow(!show)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              {show ? <EyeOff size={16} color={LIGHT.muted} /> : <Eye size={16} color={LIGHT.muted} />}
            </button>
          </div>
          {error && <p style={{ color: '#dc2626', fontSize: 12, marginBottom: 12 }}>Senha incorreta</p>}
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: '100%', padding: '13px 0', borderRadius: 12, border: 'none',
              background: LIGHT.accent, color: '#fff', fontSize: 14, fontWeight: 700,
              cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s',
            }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </div>

        <p style={{ fontSize: 10, color: LIGHT.muted, marginTop: 24, opacity: 0.5 }}>Sua Casa Leblon · Hospedagem Premium</p>
      </div>
    </div>
  )
}

// ─── KPI CARD ──────────────────────────────────────────
function KPI({ label, value, icon: Icon, color, sub, t }: { label: string; value: string; icon: any; color?: string; sub?: string; t: typeof LIGHT }) {
  return (
    <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: '14px 16px', flex: '1 1 140px', minWidth: 140 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Icon size={14} color={color || t.accent} />
        <span style={{ fontSize: 10, fontWeight: 600, color: t.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: color || t.text, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: t.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

// ─── MONTH ROW (shows commission as expense) ─────────
function MonthRow({ m, t, commPct }: { m: MonthData; t: typeof LIGHT; commPct: number }) {
  const rec = parseBRL(m.receitaTotal)
  const commission = rec * commPct
  const desp = parseBRL(m.despesaTotal) + commission
  const res = rec - desp

  return (
    <div style={{ borderBottom: `1px solid ${t.border}` }}>
      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 4, padding: '12px 12px', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{m.month}</span>
        <span style={{ fontSize: 11, fontWeight: 500, color: t.green, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(rec)}</span>
        <span style={{ fontSize: 11, fontWeight: 500, color: t.red, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(desp)}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: res >= 0 ? t.green : t.red, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(res)}</span>
      </div>

      {/* Always-open details */}
      <div style={{ padding: '0 12px 14px', background: t.elevated }}>
        {/* Reservations */}
        {m.reservations.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: t.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Reservas</p>
            <div style={{ background: t.surface, borderRadius: 8, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, tableLayout: 'fixed' }}>
                <thead>
                  <tr style={{ background: t.elevated }}>
                    <th style={{ padding: '5px 6px', textAlign: 'left', fontWeight: 600, color: t.muted, width: '28%' }}>Hóspede</th>
                    <th style={{ padding: '5px 6px', textAlign: 'center', fontWeight: 600, color: t.muted, width: '22%' }}>Check-in</th>
                    <th style={{ padding: '5px 6px', textAlign: 'center', fontWeight: 600, color: t.muted, width: '22%' }}>Check-out</th>
                    <th style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 600, color: t.muted, width: '28%' }}>Receita</th>
                  </tr>
                </thead>
                <tbody>
                  {m.reservations.map((r, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${t.border}` }}>
                      <td style={{ padding: '5px 6px', color: t.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.guest}</td>
                      <td style={{ padding: '5px 6px', textAlign: 'center', color: t.muted }}>{fmtDate(r.checkin, getMonthIndex(m.month))}</td>
                      <td style={{ padding: '5px 6px', textAlign: 'center', color: t.muted }}>{fmtDate(r.checkout, getMonthIndex(m.month))}</td>
                      <td style={{ padding: '5px 6px', textAlign: 'right', color: t.green, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{r.revenue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Expenses (always show — at minimum has commission) */}
        {(m.expenses.length > 0 || commission > 0) && (
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: t.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Despesas</p>
            <div style={{ background: t.surface, borderRadius: 8, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, tableLayout: 'fixed' }}>
                <thead>
                  <tr style={{ background: t.elevated }}>
                    <th style={{ padding: '5px 6px', textAlign: 'left', fontWeight: 600, color: t.muted, width: '50%' }}>Descrição</th>
                    <th style={{ padding: '5px 6px', textAlign: 'center', fontWeight: 600, color: t.muted, width: '25%' }}>Data</th>
                    <th style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 600, color: t.muted, width: '25%' }}>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {commission > 0 && (
                    <tr style={{ borderTop: `1px solid ${t.border}`, background: `${t.accent}08` }}>
                      <td style={{ padding: '5px 6px', color: t.accent, fontWeight: 600 }}>
                        Comissão Sua Casa
                        <span style={{ marginLeft: 4, fontSize: 8, fontWeight: 700, opacity: 0.7 }}>({(commPct * 100).toFixed(0)}%)</span>
                      </td>
                      <td style={{ padding: '5px 6px', textAlign: 'center', color: t.muted }}>—</td>
                      <td style={{ padding: '5px 6px', textAlign: 'right', color: t.red, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(commission)}</td>
                    </tr>
                  )}
                  {m.expenses.map((e, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${t.border}` }}>
                      <td style={{ padding: '5px 6px', color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.label}{e.obs ? ` \u2014 ${e.obs}` : ''}
                        {e.total_installments && e.total_installments > 1 && (
                          <span style={{ marginLeft: 4, display: 'inline-block', padding: '1px 4px', borderRadius: 3, fontSize: 8, fontWeight: 700, background: `${t.accent}20`, color: t.accent }}>
                            {e.installment_num}/{e.total_installments}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '5px 6px', textAlign: 'center', color: t.muted }}>{fmtDate(e.date, getMonthIndex(m.month))}</td>
                      <td style={{ padding: '5px 6px', textAlign: 'right', color: t.red, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }} title={e.original_amount ? `Total: ${e.original_amount}` : undefined}>{e.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── MAIN PAGE ─────────────────────────────────────────
export default function ProprietarioPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const config = OWNER_CONFIG[code]

  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)
  const [dark, setDark] = useState(false)
  const [loading, setLoading] = useState(true)
  const [apt, setApt] = useState<ApartmentSummary | null>(null)
  const [err, setErr] = useState('')
  const [filter, setFilter] = useState<'all' | 'ytd' | 'month'>('month')
  const [sel, setSel] = useState(() => { const m = new Date().getMonth(); return m > 0 ? m - 1 : 11 })
  const [year, setYear] = useState(2026)

  useEffect(() => {
    const stored = sessionStorage.getItem(`prop_auth_${code}`)
    if (stored === 'true') setAuthed(true)
    const savedTheme = localStorage.getItem('prop_theme')
    if (savedTheme === 'dark') setDark(true)
    setChecking(false)
  }, [code])

  useEffect(() => {
    if (!authed) return
    setLoading(true)
    fetch('/api/apartments')
      .then(r => r.json())
      .then((data: ApartmentSummary[]) => {
        const found = data.find(a => a.name === code)
        if (found) setApt(found)
        else setErr('Dados do apartamento não encontrados')
      })
      .catch(() => setErr('Erro ao carregar dados'))
      .finally(() => setLoading(false))
  }, [authed, code])

  const t = dark ? DARK : LIGHT

  // ─── ALL HOOKS MUST BE ABOVE ANY EARLY RETURN ───────
  const months = apt ? filterMonths(apt.months || [], filter, sel) : []
  const commPct = apt?.commissionPct || 0
  const totals = useMemo(() => {
    if (!months.length) return { rec: 0, desp: 0, com: 0, res: 0, nights: 0, blocked: 0 }
    const rec = sumF(months, 'receitaTotal')
    const rawDesp = sumF(months, 'despesaTotal')
    const com = rec * commPct
    const desp = rawDesp + com
    const res = rec - desp
    const nights = countNights(months)
    const blocked = months.reduce((s, m) => s + ((m as any).blockedNights || 0), 0)
    return { rec, desp, com, res, nights, blocked }
  }, [months, commPct])

  const avail = availableNights(filter, sel, year)
  const occupancy = avail > 0 ? (totals.nights / avail) * 100 : 0
  const adr = totals.nights > 0 ? totals.rec / totals.nights : 0
  const revpar = avail > 0 ? totals.rec / avail : 0
  const availForSale = avail - totals.blocked
  const revpan = availForSale > 0 ? totals.rec / availForSale : 0
  const filterLabel = filter === 'all' ? `${year}` : filter === 'ytd' ? `YTD ${year}` : MONTHS_FULL[sel]

  function handleLogout() {
    sessionStorage.removeItem(`prop_auth_${code}`)
    setAuthed(false)
  }

  // ─── EARLY RETURNS (after all hooks) ────────────────
  if (!config) {
    return (
      <div style={{ minHeight: '100vh', background: LIGHT.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <Lock size={32} color={LIGHT.muted} style={{ margin: '0 auto 12px' }} />
          <h1 style={{ fontSize: 18, fontWeight: 700, color: LIGHT.text }}>Apartamento não encontrado</h1>
          <p style={{ fontSize: 13, color: LIGHT.muted, marginTop: 8 }}>Verifique o link de acesso com a administração.</p>
        </div>
      </div>
    )
  }

  if (checking) return <div style={{ minHeight: '100vh', background: t.bg }} />
  if (!authed) return <LoginScreen config={config} code={code} onLogin={() => setAuthed(true)} />

  return (
    <div style={{ minHeight: '100vh', background: t.bg, fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif", transition: 'background 0.3s' }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20, background: t.surface + 'f2', backdropFilter: 'blur(12px)',
        borderBottom: `1.5px solid ${t.border}`, padding: '12px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/images/logo.png" alt="Sua Casa" style={{ width: 32, height: 32, borderRadius: 8 }} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>Apto {code}</div>
            <div style={{ fontSize: 10, color: t.muted }}>Sua Casa Leblon · Relatório Financeiro</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => { const next = !dark; setDark(next); localStorage.setItem('prop_theme', next ? 'dark' : 'light') }}
            style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${t.border}`, background: t.elevated, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {dark ? <Sun size={14} color={t.accent} /> : <Moon size={14} color={t.muted} />}
          </button>
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}>
            <LogOut size={12} /> Sair
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <Loader2 size={24} color={t.accent} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : err ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: t.red, fontSize: 14 }}>{err}</div>
      ) : apt && (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 12px 60px' }}>
          {/* Filters */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20, alignItems: 'center' }}>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              style={{
                padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: t.elevated, border: `1px solid ${t.border}`, color: t.text, cursor: 'pointer',
              }}
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
            </select>

            {(['all', 'ytd', 'month'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: filter === f ? `1.5px solid ${t.accent}` : `1px solid ${t.border}`,
                  background: filter === f ? t.accentBg : t.elevated,
                  color: filter === f ? t.accent : t.muted,
                  transition: 'all 0.15s',
                }}
              >
                {f === 'all' ? 'Ano' : f === 'ytd' ? 'YTD' : 'Mês'}
              </button>
            ))}

            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: t.elevated, borderRadius: 8, border: `1px solid ${t.border}`, padding: '4px 8px' }}>
              <button onClick={() => setSel(s => s > 0 ? s - 1 : 11)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}>
                <ChevronLeft size={14} color={t.muted} />
              </button>
              <span style={{ fontSize: 12, fontWeight: 600, color: t.text, minWidth: 80, textAlign: 'center' }}>{MONTHS_FULL[sel]}</span>
              <button onClick={() => setSel(s => s < 11 ? s + 1 : 0)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}>
                <ChevronRight size={14} color={t.muted} />
              </button>
            </div>
          </div>

          {/* Period label */}
          <h2 style={{ fontSize: 16, fontWeight: 700, color: t.text, marginBottom: 16 }}>
            {config.label} — {filterLabel}
          </h2>

          {/* KPIs — no commission */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
            <KPI label="Receita" value={fmtBRL(totals.rec)} icon={TrendingUp} color={t.green} t={t} />
            <KPI label="Despesas" value={fmtBRL(totals.desp)} icon={DollarSign} color={t.red} t={t} />
            <KPI label="Resultado" value={fmtBRL(totals.res)} icon={BarChart3} color={totals.res >= 0 ? t.green : t.red} t={t} />
            <KPI label="Noites Ocupadas" value={`${totals.nights} / ${avail}`} icon={BedDouble} t={t} />
            <KPI label="Ocupação" value={`${occupancy.toFixed(1)}%`} icon={Percent} color={occupancy > 70 ? t.green : occupancy > 40 ? t.accent : t.red} t={t} />
            <KPI label="Diária Média" value={fmtBRL(adr)} icon={Hotel} t={t} />
            <KPI label="RevPAR" value={fmtBRL(revpar)} icon={BarChart3} sub="Receita / noites totais" t={t} />
            <KPI label="RevPAN" value={fmtBRL(revpan)} icon={Building2} sub={totals.blocked > 0 ? `${availForSale} à venda (${totals.blocked} bloq.)` : 'Receita / noites à venda'} t={t} />
          </div>

          {/* Monthly breakdown — always open, 4 columns, no commission */}
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, overflow: 'hidden' }}>
            {/* Table header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 4,
              padding: '10px 12px', background: t.elevated, borderBottom: `1px solid ${t.border}`,
            }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: t.muted, textTransform: 'uppercase' }}>Mês</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: t.muted, textTransform: 'uppercase', textAlign: 'right' }}>Receita</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: t.muted, textTransform: 'uppercase', textAlign: 'right' }}>Despesas</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: t.muted, textTransform: 'uppercase', textAlign: 'right' }}>Resultado</span>
            </div>

            {months.length > 0 ? (
              months.map((m, i) => <MonthRow key={m.month} m={m} t={t} commPct={apt?.commissionPct || 0} />)
            ) : (
              <div style={{ padding: '40px 12px', textAlign: 'center', color: t.muted, fontSize: 13 }}>
                Nenhum dado para o período selecionado
              </div>
            )}

            {/* Totals row */}
            {months.length > 0 && (
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 4,
                padding: '14px 12px', background: t.accentBg, borderTop: `2px solid ${t.accent}`,
              }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: t.accent }}>TOTAL</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: t.green, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(totals.rec)}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: t.red, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(totals.desp)}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: totals.res >= 0 ? t.green : t.red, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(totals.res)}</span>
              </div>
            )}
          </div>

          {/* Conciliação */}
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: '14px 16px', marginTop: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: t.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Conciliação — {filterLabel}</p>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: t.muted }}>Receita bruta</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: t.green, fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(totals.rec)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: t.muted }}>Comissão Sua Casa ({(commPct * 100).toFixed(0)}%)</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: t.red, fontVariantNumeric: 'tabular-nums' }}>- {fmtBRL(totals.com)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: t.muted }}>Despesas do imóvel</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: t.red, fontVariantNumeric: 'tabular-nums' }}>- {fmtBRL(totals.desp - totals.com)}</span>
            </div>
            <div style={{ height: 1, background: t.border, margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Resultado proprietário</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: totals.res >= 0 ? t.green : t.red, fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(totals.res)}</span>
            </div>

            {/* Credor do período — PIX de quem deve receber */}
            {totals.res !== 0 && (() => {
              const ownerIsCreditor = totals.res > 0
              const creditorName = ownerIsCreditor ? (apt.pixName || apt.ownerName || 'Proprietário') : MANAGER_PIX.name
              const creditorPix = ownerIsCreditor ? apt.pixKey : MANAGER_PIX.key
              const debtorLabel = ownerIsCreditor ? 'Sua Casa → Proprietário' : 'Proprietário → Sua Casa'
              return (
                <>
                  <div style={{ height: 1, background: t.border, margin: '4px 0 10px' }} />
                  <p style={{ fontSize: 9, fontWeight: 700, color: t.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                    Credor: {creditorName}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: t.muted }}>Sentido</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{debtorLabel}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: t.muted }}>Valor</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: t.accent, fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(Math.abs(totals.res))}</span>
                  </div>
                  {creditorPix && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: t.muted }}>PIX do credor</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: t.accent, wordBreak: 'break-all' }}>{creditorPix}</span>
                    </div>
                  )}
                </>
              )
            })()}
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: 40, paddingBottom: 20 }}>
            <p style={{ fontSize: 10, color: t.muted, opacity: 0.5 }}>Sua Casa Leblon · Hospedagem Premium</p>
            <p style={{ fontSize: 9, color: t.muted, opacity: 0.35, marginTop: 4 }}>Relatório gerado automaticamente · Dados atualizados periodicamente</p>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
