'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Loader2,
  KeyRound,
  RefreshCw,
  CheckCircle2,
  Sun,
  Moon,
  Eye,
  EyeOff,
} from 'lucide-react'

const APARTMENTS_ORDER = ['103', '102', '403', '334A', '303']
const DAYS_LABEL = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']
const CHECKIN_HOUR = 15

const LIGHT = {
  bg: '#faf8f5', cardBg: '#f3efe8', border: '#c9b99a', borderInner: '#ddd4c4',
  textPrimary: '#2e221c', textSecondary: '#5e5040', labelColor: '#4a3e30',
  gold: '#b08a40', goldBg: '#b08a4018',
  green: '#16a34a', greenBg: '#16a34a22', greenBorder: '#16a34a55',
  yellow: '#a8864a', yellowBg: '#a8864a12', yellowBorder: '#a8864a50',
  red: '#dc2626', redBg: '#dc262612', redBorder: '#dc262650', warnIcon: '#eab308',
  hachStroke: '#a09890', hachText: '#706860', dot: '#beb5a5', hachId: 'hL',
  shadow: '0 0 4px rgba(250,248,245,0.95), 0 0 2px rgba(250,248,245,0.95)',
  btnBg: '#ebe5d8', btnBorder: '#c9b99a', btnText: '#5e5040',
  inputBg: '#f3efe8', inputBorder: '#ddd4c4', inputFocus: '#c9a96e',
}

const DARK = {
  bg: '#1a1a22', cardBg: '#222230', border: '#444455', borderInner: '#333340',
  textPrimary: '#e8e6e0', textSecondary: '#a09a90', labelColor: '#c0b8a8',
  gold: '#c9a96e', goldBg: '#c9a96e14',
  green: '#22c55e', greenBg: '#22c55e22', greenBorder: '#22c55e55',
  yellow: '#eab308', yellowBg: '#eab30812', yellowBorder: '#eab30850',
  red: '#ef4444', redBg: '#ef444412', redBorder: '#ef444450', warnIcon: '#eab308',
  hachStroke: '#55556a', hachText: '#8888a0', dot: '#44445a', hachId: 'hD',
  shadow: '0 0 4px rgba(26,26,34,0.95), 0 0 2px rgba(26,26,34,0.95)',
  btnBg: '#2a2a38', btnBorder: '#444455', btnText: '#a09a90',
  inputBg: '#222230', inputBorder: '#333340', inputFocus: '#c9a96e',
}

type Theme = typeof LIGHT

interface Reservation { apartment_code: string; guest_name: string; checkin: string; checkout: string }
interface Cleaning { id?: string; apartment_code: string; scheduled_date: string; cleaning_date?: string; status?: string; completed?: boolean; manually_edited?: boolean; cleaner_name?: string; cleaning_cost?: number; photos?: string[] }
interface DayCell { type: 'empty' | 'pending' | 'done' | 'late' | 'occupied'; apt: string; cleaning?: Cleaning }

function getWeekDates(offset: number): Date[] {
  const now = new Date(); const day = now.getDay()
  const monday = new Date(now); monday.setDate(now.getDate() - ((day + 6) % 7) + offset * 7); monday.setHours(0,0,0,0)
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d })
}
function ds(d: Date): string { return d.toISOString().slice(0, 10) }
function isToday(d: Date): boolean { return ds(d) === ds(new Date()) }
function fmt(d: Date): string { return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}` }
function isLate(scheduledDate: string): boolean {
  const now = new Date(); const brNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const today = ds(brNow); if (scheduledDate > today) return false; if (scheduledDate < today) return true; return brNow.getHours() >= CHECKIN_HOUR
}

function HachPatterns() {
  return (<svg width="0" height="0" style={{ position: 'absolute' }}><defs>
    <pattern id="hL" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="#a09890" strokeWidth="0.9" /></pattern>
    <pattern id="hD" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="#55556a" strokeWidth="0.9" /></pattern>
  </defs></svg>)
}

function StatusCell({ cell, t }: { cell: DayCell; t: Theme }) {
  if (cell.type === 'empty') return <div style={{ width: 3.5, height: 3.5, borderRadius: '50%', background: t.dot }} />
  if (cell.type === 'occupied') return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}><rect width="100%" height="100%" fill={`url(#${t.hachId})`} /></svg>
      <span style={{ fontSize: 9, fontWeight: 700, color: t.hachText, position: 'relative', zIndex: 1, textShadow: t.shadow }}>{cell.apt}</span>
    </div>
  )
  const isDone = cell.type === 'done'; const isLateSt = cell.type === 'late'
  const color = isDone ? t.green : isLateSt ? t.red : t.yellow
  const bg = isDone ? t.greenBg : isLateSt ? t.redBg : t.yellowBg
  const border = isDone ? t.greenBorder : isLateSt ? t.redBorder : t.yellowBorder
  return (
    <div style={{ width: 38, height: 28, borderRadius: 6, display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'space-between', padding: '3px 5px', cursor: 'pointer', background: isDone ? bg : 'transparent', border: `1.5px solid ${border}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start' }}>
        {isDone && <span style={{ fontSize: 11, color, lineHeight: '1' }}>✓</span>}
        {isLateSt && <span style={{ fontSize: 9, lineHeight: '1', color: t.warnIcon }}>⚠</span>}
        {!isDone && !isLateSt && <span style={{ fontSize: 8, lineHeight: '1', color, opacity: 0.8 }}>◷</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
        <span style={{ fontSize: cell.apt.length > 3 ? 7 : 8, fontWeight: 700, color, lineHeight: '1' }}>{cell.apt}</span>
      </div>
    </div>
  )
}

function WeekGrid({ dates, label, reservations, cleanings, t }: { dates: Date[]; label: string; reservations: Reservation[]; cleanings: Cleaning[]; t: Theme }) {
  const grid = useMemo(() => {
    return APARTMENTS_ORDER.map((apt) => dates.map((day): DayCell => {
      const d = ds(day)
      const cleaning = cleanings.find(c => c.apartment_code === apt && (c.scheduled_date === d || c.cleaning_date === d))
      if (cleaning) {
        if (cleaning.completed || cleaning.status === 'concluida') return { type: 'done', apt, cleaning }
        if (isLate(d)) return { type: 'late', apt, cleaning }
        return { type: 'pending', apt, cleaning }
      }
      const occupied = reservations.some(r => r.apartment_code === apt && d >= r.checkin && d < r.checkout)
      if (occupied) return { type: 'occupied', apt }
      return { type: 'empty', apt }
    }))
  }, [dates, reservations, cleanings])
  return (
    <div style={{ background: t.cardBg, borderRadius: 12, border: `2px solid ${t.border}`, overflow: 'hidden', marginBottom: 14 }}>
      <div style={{ padding: '8px 12px', borderBottom: `1.5px solid ${t.border}` }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: t.labelColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: `1.5px solid ${t.border}` }}>
        {dates.map((day, i) => { const today = isToday(day); return (
          <div key={i} style={{ textAlign: 'center', padding: '6px 2px', background: today ? t.goldBg : 'transparent', borderRight: i < 6 ? `1px solid ${t.borderInner}` : 'none' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: today ? t.gold : t.textSecondary }}>{DAYS_LABEL[day.getDay()]}</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: today ? t.gold : t.textPrimary }}>{fmt(day)}</div>
          </div>
        )})}
      </div>
      {grid.map((row, rowIdx) => (
        <div key={rowIdx} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: rowIdx < grid.length - 1 ? `1.5px solid ${t.borderInner}` : 'none', minHeight: 44 }}>
          {row.map((cell, colIdx) => (
            <div key={colIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 44, borderRight: colIdx < 6 ? `1px solid ${t.borderInner}40` : 'none', position: 'relative', overflow: 'hidden' }}>
              <StatusCell cell={cell} t={t} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function Legend({ t }: { t: Theme }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: '6px 2px' }}>
      {[
        { label: 'Pendente', border: t.yellowBorder, color: t.yellow, icon: '◷', bg: 'transparent' },
        { label: 'Concluída', border: t.greenBorder, color: t.green, icon: '✓', bg: t.greenBg },
        { label: 'Atrasada', border: t.redBorder, color: t.warnIcon, icon: '⚠', bg: 'transparent' },
      ].map(item => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: t.textSecondary }}>
          <div style={{ width: 22, height: 15, borderRadius: 4, background: item.bg, border: `1.5px solid ${item.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: item.color }}>{item.icon}</div>
          {item.label}
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: t.textSecondary }}>
        <div style={{ width: 22, height: 15, borderRadius: 4, overflow: 'hidden', border: `1.5px solid ${t.borderInner}` }}>
          <svg width="22" height="15" style={{ display: 'block' }}><rect width="22" height="15" fill={`url(#${t.hachId})`} /></svg>
        </div>
        Ocupado
      </div>
    </div>
  )
}

function LoginScreen({ onLogin, t }: { onLogin: (u: string, p: string) => void; t: Theme }) {
  const [user, setUser] = useState(''); const [pass, setPass] = useState('')
  const [showPass, setShowPass] = useState(false); const [error, setError] = useState(''); const [loading, setLoading] = useState(false)
  const handleSubmit = async () => {
    if (!user || !pass) { setError('Preencha usuário e senha'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/limpezas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'login', username: user, password: pass }) })
      const data = await res.json()
      if (!res.ok || data.error) { setError(data.error || 'Credenciais inválidas'); setLoading(false); return }
      localStorage.setItem('equipe_auth', btoa(`${user}:${pass}`))
      localStorage.setItem('equipe_user', JSON.stringify(data))
      onLogin(user, pass)
    } catch { setError('Erro de conexão') }
    setLoading(false)
  }
  return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 320, textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px', background: t.goldBg, border: `1.5px solid ${t.gold}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <KeyRound size={28} style={{ color: t.gold }} />
        </div>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: t.textPrimary, marginBottom: 4 }}>Equipe Sua Casa</h1>
        <p style={{ fontSize: 12, color: t.textSecondary, marginBottom: 24 }}>Faça login para acessar</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input type="text" placeholder="Usuário" value={user} onChange={e => { setUser(e.target.value); setError('') }} onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            style={{ width: '100%', padding: '12px 16px', borderRadius: 10, fontSize: 14, background: t.inputBg, border: `1.5px solid ${t.inputBorder}`, color: t.textPrimary, outline: 'none', boxSizing: 'border-box' }} />
          <div style={{ position: 'relative' }}>
            <input type={showPass ? 'text' : 'password'} placeholder="Senha" value={pass} onChange={e => { setPass(e.target.value); setError('') }} onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              style={{ width: '100%', padding: '12px 44px 12px 16px', borderRadius: 10, fontSize: 14, background: t.inputBg, border: `1.5px solid ${t.inputBorder}`, color: t.textPrimary, outline: 'none', boxSizing: 'border-box' }} />
            <button onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              {showPass ? <EyeOff size={16} style={{ color: t.textSecondary }} /> : <Eye size={16} style={{ color: t.textSecondary }} />}
            </button>
          </div>
          {error && <p style={{ color: t.red, fontSize: 12, margin: 0 }}>{error}</p>}
          <button onClick={handleSubmit} disabled={loading} style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: t.gold, color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function EquipePage() {
  const [authenticated, setAuthenticated] = useState(false); const [authToken, setAuthToken] = useState('')
  const [isDark, setIsDark] = useState(false); const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false)
  const [reservations, setReservations] = useState<Reservation[]>([]); const [cleanings, setCleanings] = useState<Cleaning[]>([])
  const theme = isDark ? DARK : LIGHT

  useEffect(() => {
    const saved = localStorage.getItem('equipe_auth'); const themePref = localStorage.getItem('equipe_theme')
    if (themePref === 'dark') setIsDark(true)
    if (saved) { setAuthToken(saved); setAuthenticated(true) } else { setLoading(false) }
  }, [])

  useEffect(() => { localStorage.setItem('equipe_theme', isDark ? 'dark' : 'light') }, [isDark])

  const fetchData = useCallback(async (token: string) => {
    try {
      setRefreshing(true); const headers = { 'Authorization': `Basic ${token}` }
      const cleanRes = await fetch('/api/limpezas?action=cleanings', { headers })
      if (cleanRes.ok) { const data = await cleanRes.json(); setCleanings(data || []) }
      const resvRes = await fetch('/api/equipe?action=reservations')
      if (resvRes.ok) { const data = await resvRes.json(); setReservations(data || []) }
    } catch (e) { console.error('Fetch error:', e) }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { if (authenticated && authToken) fetchData(authToken) }, [authenticated, authToken, fetchData])

  const handleLogin = (user: string, pass: string) => { const token = btoa(`${user}:${pass}`); setAuthToken(token); setAuthenticated(true) }
  const handleRefresh = () => { if (authToken) fetchData(authToken) }

  if (!authenticated) return <LoginScreen onLogin={handleLogin} t={theme} />

  const week1 = getWeekDates(0); const week2 = getWeekDates(1)

  return (
    <div style={{ background: theme.bg, minHeight: '100vh', transition: 'background 0.3s ease', fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif" }}>
      <HachPatterns />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: theme.bg + 'f2', backdropFilter: 'blur(10px)', borderBottom: `2px solid ${theme.border}`, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: theme.textPrimary }}>Equipe · Limpezas</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setIsDark(!isDark)} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', background: isDark ? theme.gold + '30' : '#2e221c20', position: 'relative', cursor: 'pointer', transition: 'background 0.3s', padding: 0 }}>
            <div style={{ width: 20, height: 20, borderRadius: 10, background: isDark ? theme.gold : '#3a3028', position: 'absolute', top: 2, left: isDark ? 22 : 2, transition: 'left 0.3s, background 0.3s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 10, color: isDark ? '#1a1a22' : '#faf8f5' }}>{isDark ? '☀' : '☾'}</span>
            </div>
          </button>
          <button onClick={handleRefresh} disabled={refreshing} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', fontSize: 10, fontWeight: 700, borderRadius: 8, border: `1.5px solid ${theme.btnBorder}`, background: theme.btnBg, color: theme.btnText, cursor: refreshing ? 'wait' : 'pointer', opacity: refreshing ? 0.7 : 1 }}>
            <RefreshCw size={12} style={refreshing ? { animation: 'spin 1s linear infinite' } : {}} />Atualizar
          </button>
        </div>
      </div>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: theme.gold }} /></div>
      ) : (
        <div style={{ padding: '12px 10px', maxWidth: 420, margin: '0 auto' }}>
          <WeekGrid dates={week1} label="Semana Atual" reservations={reservations} cleanings={cleanings} t={theme} />
          <WeekGrid dates={week2} label="Próxima Semana" reservations={reservations} cleanings={cleanings} t={theme} />
          <Legend t={theme} />
        </div>
      )}
      <footer style={{ textAlign: 'center', padding: '16px 0', fontSize: 10, color: theme.textSecondary, opacity: 0.5 }}>Sua Casa Leblon · Equipe</footer>
    </div>
  )
}
