'use client'

import { useState, useEffect } from 'react'
import { createGiroBrowserClient } from '@/lib/supabase-auth'
import { Loader2 } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

// ─── THEME ────────────────────────────────────
const T = {
  bg: '#1a1a22',
  surface: '#222230',
  border: '#333340',
  text: '#e8e6e0',
  muted: '#a09a90',
  gold: '#c9a96e',
  goldHover: '#d4b87a',
  goldBg: 'rgba(201,169,110,0.08)',
  input: '#2a2a38',
  inputBorder: '#444455',
  inputFocus: '#c9a96e',
  error: '#ef4444',
  google: '#4285F4',
  googleHover: '#357abd',
}

const supabase = createGiroBrowserClient()

// ─── AUTH SCREEN ──────────────────────────────
function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      if (mode === 'signup') {
        if (!name.trim()) { setError('Preencha seu nome'); setLoading(false); return }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        })
        if (error) throw error
        setMessage('Verifique seu email para confirmar o cadastro.')
      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}`,
        })
        if (error) throw error
        setMessage('Email de recuperacao enviado. Verifique sua caixa de entrada.')
      }
    } catch (err: any) {
      const msg = err?.message || 'Erro inesperado'
      if (msg.includes('Invalid login')) setError('Email ou senha incorretos')
      else if (msg.includes('already registered')) setError('Este email ja esta cadastrado')
      else if (msg.includes('least 6')) setError('A senha precisa ter pelo menos 6 caracteres')
      else setError(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin.replace('giro.', '')}/api/giro/auth/callback`,
      },
    })
    if (error) setError(error.message)
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: T.goldBg, border: `1px solid rgba(201,169,110,0.2)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={T.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: 0 }}>Giro Temporada</h1>
          <p style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>Gestao inteligente de temporada</p>
        </div>

        {/* Card */}
        <div style={{
          background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 28,
        }}>
          {/* Google Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            style={{
              width: '100%', padding: '12px 16px', borderRadius: 12,
              background: 'white', border: '1px solid #ddd',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#333',
              transition: 'all 0.15s',
            }}
            onMouseOver={e => (e.currentTarget.style.background = '#f5f5f5')}
            onMouseOut={e => (e.currentTarget.style.background = 'white')}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continuar com Google
          </button>

          {/* Divider */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0',
          }}>
            <div style={{ flex: 1, height: 1, background: T.border }} />
            <span style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: 1 }}>ou</span>
            <div style={{ flex: 1, height: 1, background: T.border }} />
          </div>

          {/* Email Form */}
          <form onSubmit={handleEmailAuth}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {mode === 'signup' && (
                <div>
                  <label style={{ fontSize: 10, color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Nome</label>
                  <input
                    type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder="Seu nome completo"
                    style={inputStyle()}
                  />
                </div>
              )}
              {mode !== 'forgot' ? (
                <>
                  <div>
                    <label style={{ fontSize: 10, color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Email</label>
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="seu@email.com" autoFocus
                      style={inputStyle()}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Senha</label>
                    <input
                      type="password" value={password} onChange={e => setPassword(e.target.value)}
                      placeholder={mode === 'signup' ? 'Minimo 6 caracteres' : 'Sua senha'}
                      style={inputStyle()}
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label style={{ fontSize: 10, color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Email</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="seu@email.com" autoFocus
                    style={inputStyle()}
                  />
                </div>
              )}

              {error && <p style={{ fontSize: 12, color: T.error, margin: 0 }}>{error}</p>}
              {message && <p style={{ fontSize: 12, color: '#22c55e', margin: 0 }}>{message}</p>}

              <button
                type="submit" disabled={loading}
                style={{
                  width: '100%', padding: 12, borderRadius: 12, border: 'none',
                  background: T.gold, color: '#1a1a22', fontSize: 14, fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                  transition: 'all 0.15s',
                }}
                onMouseOver={e => !loading && (e.currentTarget.style.background = T.goldHover)}
                onMouseOut={e => (e.currentTarget.style.background = T.gold)}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Aguarde...
                  </span>
                ) : (
                  mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Criar conta' : 'Enviar link'
                )}
              </button>
            </div>
          </form>

          {/* Links */}
          <div style={{ marginTop: 16, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {mode === 'login' && (
              <>
                <button onClick={() => { setMode('forgot'); setError(''); setMessage('') }}
                  style={linkStyle()}>Esqueci minha senha</button>
                <button onClick={() => { setMode('signup'); setError(''); setMessage('') }}
                  style={linkStyle()}>Criar conta</button>
              </>
            )}
            {mode === 'signup' && (
              <button onClick={() => { setMode('login'); setError(''); setMessage('') }}
                style={linkStyle()}>Ja tenho conta</button>
            )}
            {mode === 'forgot' && (
              <button onClick={() => { setMode('login'); setError(''); setMessage('') }}
                style={linkStyle()}>Voltar ao login</button>
            )}
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: T.muted, marginTop: 24 }}>
          Giro Temporada &copy; 2026
        </p>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

// ─── TENANT STATE ─────────────────────────────
interface Tenant {
  id: string
  name: string
  subscription_status: string
  trial_ends_at: string | null
}

// ─── PAYWALL ──────────────────────────────────
function Paywall({ user, onSuccess }: { user: User; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [showCoupon, setShowCoupon] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [couponMsg, setCouponMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || ''

  async function handleCheckout() {
    setLoading(true)
    try {
      const body: any = {}
      if (couponCode.trim()) body.coupon = couponCode.trim().toUpperCase()
      const res = await fetch('/api/giro/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Erro ao criar checkout')
      }
    } catch {
      alert('Erro de conexao')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: 0 }}>Giro Temporada</h1>
          <p style={{ fontSize: 13, color: T.muted, marginTop: 6 }}>Ola, {displayName}!</p>
        </div>

        <div style={{
          background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 32,
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, margin: '0 0 8px', textAlign: 'center' }}>
            Experimente gratis por 3 dias
          </h2>
          <p style={{ fontSize: 13, color: T.muted, textAlign: 'center', margin: '0 0 24px', lineHeight: 1.5 }}>
            Teste tudo sem compromisso. So sera cobrado apos o periodo de teste. Cancele a qualquer momento.
          </p>

          {/* Price card */}
          <div style={{
            background: T.goldBg, border: `1px solid rgba(201,169,110,0.25)`, borderRadius: 12,
            padding: 20, textAlign: 'center', marginBottom: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
              <span style={{ fontSize: 13, color: T.muted }}>R$</span>
              <span style={{ fontSize: 36, fontWeight: 800, color: T.gold }}>27</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: T.gold }}>,90</span>
              <span style={{ fontSize: 13, color: T.muted }}>/mes</span>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '16px 0 0', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['Agenda de limpezas', 'Equipe e comunicacao', 'Controle financeiro', 'Apartamentos ilimitados'].map(item => (
                <li key={item} style={{ fontSize: 13, color: T.text, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#22c55e', fontSize: 16 }}>✓</span> {item}
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={handleCheckout}
            disabled={loading}
            style={{
              width: '100%', padding: 14, borderRadius: 12, border: 'none',
              background: T.gold, color: '#1a1a22', fontSize: 15, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Redirecionando...' : 'Comecar teste gratis'}
          </button>
          <p style={{ fontSize: 11, color: T.muted, textAlign: 'center', marginTop: 12 }}>
            Cadastre seu cartao agora, cobranca so apos 3 dias. Cancele quando quiser.
          </p>

          {/* Coupon — discreto */}
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            {!showCoupon ? (
              <button
                onClick={() => setShowCoupon(true)}
                style={{ background: 'none', border: 'none', color: T.muted, fontSize: 11, cursor: 'pointer', opacity: 0.6 }}
              >
                Possui um cupom?
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
                <input
                  type="text" value={couponCode}
                  onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponMsg(null) }}
                  placeholder="CODIGO"
                  style={{
                    width: 140, padding: '6px 10px', borderRadius: 8, fontSize: 12, fontFamily: 'monospace',
                    background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text, outline: 'none',
                    textAlign: 'center', letterSpacing: 1,
                  }}
                />
                {couponMsg && (
                  <span style={{ fontSize: 11, color: couponMsg.ok ? '#22c55e' : T.error }}>{couponMsg.text}</span>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button onClick={handleLogout} style={linkStyle()}>Sair da conta</button>
        </div>
      </div>
    </div>
  )
}

// ─── DASHBOARD PLACEHOLDER ────────────────────
function GiroDashboard({ user, tenant }: { user: User; tenant: Tenant }) {
  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Gestor'

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, padding: 24 }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 0', borderBottom: `1px solid ${T.border}`, marginBottom: 32,
        }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: T.gold }}>Giro Temporada</h1>
            <p style={{ fontSize: 12, color: T.muted, margin: '4px 0 0' }}>Ola, {displayName}</p>
          </div>
          <button onClick={handleLogout} style={{
            padding: '8px 16px', borderRadius: 8, border: `1px solid ${T.border}`,
            background: 'transparent', color: T.muted, fontSize: 12, cursor: 'pointer',
          }}>Sair</button>
        </div>

        <div style={{
          background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16,
          padding: 40, textAlign: 'center',
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 8px' }}>Bem-vindo ao Giro!</h2>
          <p style={{ fontSize: 14, color: T.muted, margin: 0 }}>
            Em breve voce podera configurar seus apartamentos, equipe e calendario aqui.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── MAIN ─────────────────────────────────────
export default function GiroPage() {
  const [user, setUser] = useState<User | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchTenant() {
    try {
      const res = await fetch('/api/giro/tenant')
      const data = await res.json()
      setTenant(data.tenant || null)
    } catch {
      setTenant(null)
    }
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) fetchTenant().then(() => setLoading(false))
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) fetchTenant().then(() => setLoading(false))
      else { setTenant(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} color={T.gold} style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  // Not logged in → auth screen
  if (!user) return <AuthScreen />

  // Logged in but no active subscription → paywall
  const isActive = tenant?.subscription_status === 'active' || tenant?.subscription_status === 'trialing'
  if (!isActive) return <Paywall user={user} onSuccess={fetchTenant} />

  // Active subscription → dashboard
  return <GiroDashboard user={user} tenant={tenant!} />
}

// ─── HELPERS ──────────────────────────────────
function inputStyle(): React.CSSProperties {
  return {
    width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14,
    background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text,
    outline: 'none', boxSizing: 'border-box',
  }
}

function linkStyle(): React.CSSProperties {
  return {
    background: 'none', border: 'none', color: T.gold, fontSize: 12,
    cursor: 'pointer', padding: 0, textDecoration: 'underline',
    textUnderlineOffset: 2,
  }
}
