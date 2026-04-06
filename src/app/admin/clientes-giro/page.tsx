'use client'

import { useState, useEffect } from 'react'
import { Users, CreditCard, Loader2, RefreshCw, ChevronDown, ChevronRight, DollarSign } from 'lucide-react'

interface Payment {
  amount: number
  date: string
  status: string
}

interface GiroTenant {
  id: string
  name: string
  owner_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_status: string
  trial_ends_at: string | null
  created_at: string
  owner_email?: string
  apartment_count?: number
  member_count?: number
  total_paid?: number
  last_payment?: string | null
  payments?: Payment[]
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  active:   { label: 'Ativo',     color: 'rgb(var(--adm-accent))', bg: 'rgb(var(--adm-accent)/0.10)' },
  trialing: { label: 'Trial',     color: '#eab308',                bg: 'rgba(234,179,8,0.10)' },
  past_due: { label: 'Atrasado',  color: '#ef4444',                bg: 'rgba(239,68,68,0.10)' },
  canceled: { label: 'Cancelado', color: 'rgb(var(--adm-muted))',  bg: 'rgb(var(--adm-muted)/0.10)' },
  unpaid:   { label: 'Inadimplente', color: '#ef4444',             bg: 'rgba(239,68,68,0.10)' },
}

function fmt(v: number) { return `R$ ${v.toFixed(2).replace('.', ',')}` }

export default function ClientesGiroPage() {
  const [tenants, setTenants] = useState<GiroTenant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  async function fetchTenants() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/giro/admin/tenants', {
        headers: { 'x-admin-auth': sessionStorage.getItem('admin_auth') === 'true' ? 'suacasa2026' : '' },
      })
      if (!res.ok) throw new Error('Erro ao carregar clientes')
      const data = await res.json()
      setTenants(data.tenants || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTenants() }, [])

  const activeCount = tenants.filter(t => t.subscription_status === 'active').length
  const trialCount = tenants.filter(t => t.subscription_status === 'trialing').length
  const mrr = activeCount * 27.90
  const totalReceived = tenants.reduce((sum, t) => sum + (t.total_paid || 0), 0)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[rgb(var(--adm-text))]">Clientes Giro Temporada</h1>
          <p className="text-xs text-[rgb(var(--adm-muted))] mt-1">Clientes pagantes do produto SaaS + pagamentos via Stripe</p>
        </div>
        <button onClick={fetchTenants} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[rgb(var(--adm-border))] text-xs text-[rgb(var(--adm-muted))] hover:text-[rgb(var(--adm-text))] transition-colors">
          <RefreshCw className="h-3 w-3" /> Atualizar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total clientes', value: String(tenants.length), icon: Users },
          { label: 'Ativos', value: String(activeCount), icon: CreditCard },
          { label: 'Em trial', value: String(trialCount), icon: Users },
          { label: 'MRR estimado', value: fmt(mrr), icon: DollarSign },
          { label: 'Total recebido', value: fmt(totalReceived), icon: DollarSign },
        ].map(kpi => (
          <div key={kpi.label} className="bg-[rgb(var(--adm-surface))] border border-[rgb(var(--adm-border))] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon className="h-4 w-4 text-[rgb(var(--adm-muted))]" />
              <span className="text-[10px] text-[rgb(var(--adm-muted))] uppercase tracking-wider font-medium">{kpi.label}</span>
            </div>
            <p className="text-lg font-bold text-[rgb(var(--adm-text))]">{kpi.value}</p>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[rgb(var(--adm-accent))]" />
        </div>
      ) : tenants.length === 0 ? (
        <div className="bg-[rgb(var(--adm-surface))] border border-[rgb(var(--adm-border))] rounded-xl p-12 text-center">
          <Users className="h-10 w-10 text-[rgb(var(--adm-muted))] mx-auto mb-3" />
          <p className="text-sm text-[rgb(var(--adm-muted))]">Nenhum cliente cadastrado ainda</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tenants.map(t => {
            const status = STATUS_LABELS[t.subscription_status] || STATUS_LABELS.canceled
            const isOpen = expanded === t.id
            const paidPayments = (t.payments || []).filter(p => p.status === 'paid')

            return (
              <div key={t.id} className="bg-[rgb(var(--adm-surface))] border border-[rgb(var(--adm-border))] rounded-xl overflow-hidden">
                {/* Row */}
                <button
                  onClick={() => setExpanded(isOpen ? null : t.id)}
                  className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-[rgb(var(--adm-elevated)/0.3)] transition-colors"
                >
                  {isOpen ? <ChevronDown className="h-4 w-4 text-[rgb(var(--adm-muted))] shrink-0" /> : <ChevronRight className="h-4 w-4 text-[rgb(var(--adm-muted))] shrink-0" />}

                  {/* Name + email */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-[rgb(var(--adm-text))] truncate">{t.name}</p>
                    {t.owner_email && <p className="text-[11px] text-[rgb(var(--adm-muted))] truncate">{t.owner_email}</p>}
                  </div>

                  {/* Status */}
                  <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0" style={{ color: status.color, background: status.bg }}>
                    {status.label}
                  </span>

                  {/* Stats */}
                  <div className="hidden md:flex items-center gap-6 text-xs text-[rgb(var(--adm-muted))] shrink-0">
                    <span>{t.apartment_count ?? 0} aptos</span>
                    <span>{t.member_count ?? 0} equipe</span>
                  </div>

                  {/* Total paid */}
                  <div className="text-right shrink-0 min-w-[90px]">
                    <p className="text-sm font-semibold text-[rgb(var(--adm-text))]">{fmt(t.total_paid || 0)}</p>
                    <p className="text-[10px] text-[rgb(var(--adm-muted))]">total pago</p>
                  </div>
                </button>

                {/* Expanded: payment history */}
                {isOpen && (
                  <div className="border-t border-[rgb(var(--adm-border))] px-4 py-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div>
                        <p className="text-[10px] text-[rgb(var(--adm-muted))] uppercase tracking-wider mb-1">Desde</p>
                        <p className="text-sm text-[rgb(var(--adm-text))]">{new Date(t.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[rgb(var(--adm-muted))] uppercase tracking-wider mb-1">Ultimo pgto</p>
                        <p className="text-sm text-[rgb(var(--adm-text))]">{t.last_payment ? new Date(t.last_payment).toLocaleDateString('pt-BR') : '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[rgb(var(--adm-muted))] uppercase tracking-wider mb-1">Apartamentos</p>
                        <p className="text-sm text-[rgb(var(--adm-text))]">{t.apartment_count ?? 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[rgb(var(--adm-muted))] uppercase tracking-wider mb-1">Equipe</p>
                        <p className="text-sm text-[rgb(var(--adm-text))]">{t.member_count ?? 0}</p>
                      </div>
                    </div>

                    {/* Payment list */}
                    {paidPayments.length > 0 ? (
                      <div>
                        <p className="text-[10px] text-[rgb(var(--adm-muted))] uppercase tracking-wider mb-2 font-medium">Historico de pagamentos</p>
                        <div className="space-y-1">
                          {paidPayments.map((p, i) => (
                            <div key={i} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-[rgb(var(--adm-elevated)/0.3)]">
                              <span className="text-xs text-[rgb(var(--adm-muted))]">{new Date(p.date).toLocaleDateString('pt-BR')}</span>
                              <span className="text-xs font-medium text-[rgb(var(--adm-accent))]">{fmt(p.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-[rgb(var(--adm-muted))] italic">Nenhum pagamento registrado</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
