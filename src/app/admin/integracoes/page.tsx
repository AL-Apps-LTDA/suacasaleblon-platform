'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, Loader2, RefreshCw, ExternalLink } from 'lucide-react'

export default function IntegracoesPage() {
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState('')

  useEffect(() => {
    fetch('/api/sync').then(r => r.json()).then(setStatus).finally(() => setLoading(false))
  }, [])

  async function testHospitable() {
    setTesting('hospitable')
    try {
      const r = await fetch('/api/hospitable/test')
      const d = await r.json()
      alert(d.ok ? `Hospitable OK — ${d.propertyCount || 0} propriedades` : `Erro: ${d.error}`)
    } catch (e: any) { alert(e.message) }
    finally { setTesting('') }
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <h1 className="text-xl font-bold text-[rgb(var(--adm-text))]">Integrações</h1>
      <p className="text-xs text-[rgb(var(--adm-muted))]">Status das conexões com serviços externos</p>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-[rgb(var(--adm-accent))]" /></div>
      ) : (
        <div className="space-y-3">
          {/* Hospitable */}
          <div className="bg-[rgb(var(--adm-surface))] border border-[rgb(var(--adm-border))] rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {status?.hospitable?.connected ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <XCircle className="h-5 w-5 text-red-400" />}
                <div>
                  <h3 className="text-sm font-semibold text-[rgb(var(--adm-text))]">Hospitable</h3>
                  <p className="text-[11px] text-[rgb(var(--adm-muted))]">
                    {status?.hospitable?.connected ? `Auto-sync a cada ${status.hospitable.autoSyncInterval} min` : 'HOSPITABLE_API_KEY não configurada'}
                  </p>
                </div>
              </div>
              <button onClick={testHospitable} disabled={testing === 'hospitable'} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-[rgb(var(--adm-border))] text-[rgb(var(--adm-muted))] hover:text-[rgb(var(--adm-text))] disabled:opacity-50">
                {testing === 'hospitable' ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Testar
              </button>
            </div>
          </div>

          {/* Google Sheets */}
          <div className="bg-[rgb(var(--adm-surface))] border border-[rgb(var(--adm-border))] rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {status?.googleSheets?.connected ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <XCircle className="h-5 w-5 text-red-400" />}
                <div>
                  <h3 className="text-sm font-semibold text-[rgb(var(--adm-text))]">Google Sheets</h3>
                  <p className="text-[11px] text-[rgb(var(--adm-muted))]">
                    {status?.googleSheets?.connected ? 'Conectado via Service Account' : 'GOOGLE_SERVICE_ACCOUNT_KEY não configurada'}
                  </p>
                </div>
              </div>
              <a href={`https://docs.google.com/spreadsheets/d/${status?.googleSheets?.spreadsheetId}/edit`} target="_blank" rel="noopener" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-[rgb(var(--adm-border))] text-[rgb(var(--adm-muted))] hover:text-[rgb(var(--adm-text))]">
                <ExternalLink className="h-3 w-3" /> Abrir
              </a>
            </div>
          </div>

          {/* Supabase */}
          <div className="bg-[rgb(var(--adm-surface))] border border-[rgb(var(--adm-border))] rounded-xl p-4">
            <div className="flex items-center gap-3">
              {process.env.NEXT_PUBLIC_SUPABASE_URL ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <XCircle className="h-5 w-5 text-red-400" />}
              <div>
                <h3 className="text-sm font-semibold text-[rgb(var(--adm-text))]">Supabase</h3>
                <p className="text-[11px] text-[rgb(var(--adm-muted))]">Database para reservas diretas, sync logs, limpezas</p>
              </div>
            </div>
          </div>

          {/* Beyond Pricing */}
          <div className="bg-[rgb(var(--adm-surface))] border border-[rgb(var(--adm-border))] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <div>
                <h3 className="text-sm font-semibold text-[rgb(var(--adm-text))]">Beyond Pricing</h3>
                <p className="text-[11px] text-[rgb(var(--adm-muted))]">Preços dinâmicos — gerenciado via Hospitable</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Env vars guide */}
      <div className="bg-[rgb(var(--adm-surface))] border border-[rgb(var(--adm-accent)/0.20)] rounded-xl p-4">
        <h3 className="text-sm font-semibold text-[rgb(var(--adm-accent))] mb-2">Variáveis de ambiente necessárias (Vercel)</h3>
        <div className="space-y-1 text-[11px] font-mono text-[rgb(var(--adm-muted))]">
          <p>HOSPITABLE_API_KEY — chave da API Hospitable</p>
          <p>GOOGLE_SERVICE_ACCOUNT_KEY — JSON da service account Google</p>
          <p>NEXT_PUBLIC_SUPABASE_URL — URL do projeto Supabase</p>
          <p>NEXT_PUBLIC_SUPABASE_ANON_KEY — chave anon do Supabase</p>
          <p>SUPABASE_SERVICE_ROLE_KEY — chave service role do Supabase</p>
        </div>
      </div>
    </div>
  )
}
