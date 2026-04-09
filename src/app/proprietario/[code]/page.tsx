'use client'

import { useState, useMemo, useEffect, use } from 'react'
import {
  Loader2, Lock, LogOut, Eye, EyeOff, ChevronLeft, ChevronRight,
  ChevronDown, ChevronUp, DollarSign, TrendingUp, Percent, BedDouble,
  Hotel, UserCheck, BarChart3, Sun, Moon
} from 'lucide-react'
import type { ApartmentSummary, MonthData } from '@/lib/types'
import { parseBRL, fmtBRL, getMonthIndex, MONTHS_SHORT, MONTHS_FULL } from '@/lib/types'

// ─── CONFIG ────────────────────────────────────────────
const OWNER_CONFIG: Record<string, { password: string; label: string }> = {
  '102': { password: 'prop102', label: 'Apartamento 102 — Leblon' },
  '303': { password: 'prop303', label: 'Apartamento 303 — Leblon' },
}

// ─── HELPERS ───────────────────────────────────────────
function filterMonths(months: MonthData[], filter: string, sel: number): MonthData[] {
  if (filter === 'all') return months
  if (filter === 'ytd') return months.filter(m => getMonthIndex(m.month) <= new Date().getMonth())
  if (filter === 'month') return months.filter(m => getMonthIndex(m.month) === sel)
  return months
}
function sumF(months: MonthData[], f: 'receitaTotal' | 'despesaTotal' | 'resultado' | 'managerCommission' | 'repassar') {
  return months.reduce((s, m) => s + parseBRL(m[f]), 0)
}
function ownerPart(m: MonthData) { return parseBRL(m.resultado) - parseBRL(m.repassar) }
function countNights(months: MonthData[]): number {
  let nights = 0  for (const m of months) {
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
        setLoading(false)      }
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
              {show ? <EyeOff size={16} color={LIGHT.muted} /> : <Eye size={16} color={LIGHT.muted} />}            </button>
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
function KPI({ label, value, icon: Icon, color, t }: { label: string; value: string; icon: any; color?: string; t: typeof LIGHT }) {
  return (
    <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: '14px 16px', flex: '1 1 140px', minWidth: 140 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Icon size={14} color={color || t.accent} />
        <span style={{ fontSize: 10, fontWeight: 600, color: t.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      </div>      <div style={{ fontSize: 18, fontWeight: 700, color: color || t.text, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  )
}

// ─── MONTH ROW ─────────────────────────────────────────
function MonthRow({ m, idx, t }: { m: MonthData; idx: number; t: typeof LIGHT }) {
  const [open, setOpen] = useState(false)
  const rec = parseBRL(m.receitaTotal)
  const desp = parseBRL(m.despesaTotal)
  const res = parseBRL(m.resultado)
  const com = parseBRL(m.managerCommission)
  const repasse = ownerPart(m)

  return (
    <div style={{ borderBottom: `1px solid ${t.border}` }}>
      <div
        onClick={() => setOpen(!open)}
        style={{ display: 'grid', gridTemplateColumns: '1fr repeat(5, 1fr) 28px', gap: 8, padding: '12px 16px', cursor: 'pointer', alignItems: 'center', transition: 'background 0.15s' }}
        onMouseEnter={e => (e.currentTarget.style.background = t.elevated)}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{m.month}</span>
        <span style={{ fontSize: 12, fontWeight: 500, color: t.green, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(rec)}</span>
        <span style={{ fontSize: 12, fontWeight: 500, color: t.red, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(desp)}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: res >= 0 ? t.green : t.red, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(res)}</span>
        <span style={{ fontSize: 12, fontWeight: 500, color: t.accent, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(com)}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: t.text, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(repasse)}</span>
        {open ? <ChevronUp size={14} color={t.muted} /> : <ChevronDown size={14} color={t.muted} />}
      </div>
      {open && (
        <div style={{ padding: '0 16px 16px', background: t.elevated }}>
          {/* Reservations */}
          {m.reservations.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: t.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Reservas</p>
              <div style={{ background: t.surface, borderRadius: 8, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: t.elevated }}>
                      <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: t.muted }}>Hóspede</th>
                      <th style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 600, color: t.muted }}>Check-in</th>
                      <th style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 600, color: t.muted }}>Check-out</th>
                      <th style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 600, color: t.muted }}>Fonte</th>
                      <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600, color: t.muted }}>Receita</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.reservations.map((r, i) => (
                      <tr key={i} style={{ borderTop: `1px solid ${t.border}` }}>
                        <td style={{ padding: '6px 10px', color: t.text, fontWeight: 500 }}>{r.guest}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'center', color: t.muted }}>{fmtDate(r.checkin, getMonthIndex(m.month))}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'center', color: t.muted }}>{fmtDate(r.checkout, getMonthIndex(m.month))}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'center', color: t.accent, fontSize: 10 }}>{r.source || '—'}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'right', color: t.green, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{r.revenue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>              </div>
            </div>
          )}

          {/* Expenses */}
          {m.expenses.length > 0 && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: t.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Despesas</p>
              <div style={{ background: t.surface, borderRadius: 8, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: t.elevated }}>
                      <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: t.muted }}>Descrição</th>
                      <th style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 600, color: t.muted }}>Data</th>
                      <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600, color: t.muted }}>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.expenses.map((e, i) => (
                      <tr key={i} style={{ borderTop: `1px solid ${t.border}` }}>
                        <td style={{ padding: '6px 10px', color: t.text }}>{e.label}{e.obs ? ` — ${e.obs}` : ''}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'center', color: t.muted }}>{fmtDate(e.date, getMonthIndex(m.month))}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'right', color: t.red, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{e.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}        </div>
      )}
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
  const [filter, setFilter] = useState<'all' | 'ytd' | 'month'>('ytd')
  const [sel, setSel] = useState(new Date().getMonth() > 0 ? new Date().getMonth() - 1 : 0)
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

  // Not a valid apartment
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
  // Filtered data
  const months = apt ? filterMonths(apt.months || [], filter, sel) : []
  const totals = useMemo(() => {
    if (!months.length) return { rec: 0, desp: 0, res: 0, com: 0, repasse: 0, nights: 0 }
    const rec = sumF(months, 'receitaTotal')
    const desp = sumF(months, 'despesaTotal')
    const res = sumF(months, 'resultado')
    const com = sumF(months, 'managerCommission')
    const repasse = months.reduce((s, m) => s + ownerPart(m), 0)
    const nights = countNights(months)
    return { rec, desp, res, com, repasse, nights }
  }, [months])

  const avail = availableNights(filter, sel, year)
  const occupancy = avail > 0 ? (totals.nights / avail) * 100 : 0
  const adr = totals.nights > 0 ? totals.rec / totals.nights : 0

  const filterLabel = filter === 'all' ? `${year}` : filter === 'ytd' ? `YTD ${year}` : MONTHS_FULL[sel]

  function handleLogout() {
    sessionStorage.removeItem(`prop_auth_${code}`)
    setAuthed(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: t.bg, fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif", transition: 'background 0.3s' }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20, background: t.surface + 'f2', backdropFilter: 'blur(12px)',        borderBottom: `1.5px solid ${t.border}`, padding: '12px 16px',
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
      ) : apt && (        <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 16px 60px' }}>
          {/* Filters */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20, alignItems: 'center' }}>
            {/* Year */}
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

            {/* Period buttons */}
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
                {f === 'all' ? 'Ano' : f === 'ytd' ? 'YTD' : 'Mês'}              </button>
            ))}

            {/* Month picker — always visible */}
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

          {/* KPIs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
            <KPI label="Receita" value={fmtBRL(totals.rec)} icon={TrendingUp} color={t.green} t={t} />
            <KPI label="Despesas" value={fmtBRL(totals.desp)} icon={DollarSign} color={t.red} t={t} />
            <KPI label="Resultado" value={fmtBRL(totals.res)} icon={BarChart3} color={totals.res >= 0 ? t.green : t.red} t={t} />
            <KPI label="Comissão Admin" value={fmtBRL(totals.com)} icon={UserCheck} color={t.accent} t={t} />
            <KPI label="Repasse Proprietário" value={fmtBRL(totals.repasse)} icon={DollarSign} t={t} />
            <KPI label="Noites Ocupadas" value={`${totals.nights} / ${avail}`} icon={BedDouble} t={t} />
            <KPI label="Ocupação" value={`${occupancy.toFixed(1)}%`} icon={Percent} color={occupancy > 70 ? t.green : occupancy > 40 ? t.accent : t.red} t={t} />
            <KPI label="Diária Média" value={fmtBRL(adr)} icon={Hotel} t={t} />          </div>

          {/* Monthly breakdown */}
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, overflow: 'hidden' }}>
            {/* Table header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr repeat(5, 1fr) 28px', gap: 8,
              padding: '10px 16px', background: t.elevated, borderBottom: `1px solid ${t.border}`,
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: t.muted, textTransform: 'uppercase' }}>Mês</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: t.muted, textTransform: 'uppercase', textAlign: 'right' }}>Receita</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: t.muted, textTransform: 'uppercase', textAlign: 'right' }}>Despesas</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: t.muted, textTransform: 'uppercase', textAlign: 'right' }}>Resultado</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: t.muted, textTransform: 'uppercase', textAlign: 'right' }}>Comissão</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: t.muted, textTransform: 'uppercase', textAlign: 'right' }}>Repasse</span>
              <span />
            </div>

            {months.length > 0 ? (
              months.map((m, i) => <MonthRow key={m.month} m={m} idx={i} t={t} />)
            ) : (
              <div style={{ padding: '40px 16px', textAlign: 'center', color: t.muted, fontSize: 13 }}>
                Nenhum dado para o período selecionado
              </div>
            )}

            {/* Totals row */}
            {months.length > 0 && (
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr repeat(5, 1fr) 28px', gap: 8,                padding: '14px 16px', background: t.accentBg, borderTop: `2px solid ${t.accent}`,
              }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: t.accent }}>TOTAL</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: t.green, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(totals.rec)}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: t.red, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(totals.desp)}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: totals.res >= 0 ? t.green : t.red, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(totals.res)}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: t.accent, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(totals.com)}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: t.text, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(totals.repasse)}</span>
                <span />
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: 40, paddingBottom: 20 }}>
            <p style={{ fontSize: 10, color: t.muted, opacity: 0.5 }}>Sua Casa Leblon · Hospedagem Premium em Leblon, Rio de Janeiro</p>
            <p style={{ fontSize: 9, color: t.muted, opacity: 0.35, marginTop: 4 }}>Relatório gerado automaticamente · Dados atualizados periodicamente</p>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}