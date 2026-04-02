'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Database, RefreshCw } from 'lucide-react'
import { fmtBRL, APARTMENTS } from '@/lib/types'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const LISTING_MAP: Record<string, string> = {
  '103': '103', 'leblon 103': '103', 'studio 103': '103',
  '102': '102', 'leblon 102': '102', 'studio 102': '102', 's-102': '102',
  '403': '403', 'leblon 403': '403', 'loft 403': '403',
  '303': '303', 'leblon 303': '303',
  '334a': '334A', 'leblon 334a': '334A', 'studio 334': '334A', '334': '334A',
  'bz02': 'BZ02', 'búzios': 'BZ02', 'buzios': 'BZ02',
}

function matchApartment(listing: string): string {
  if (!listing) return ''
  const lower = listing.toLowerCase().trim()
  for (const [key, code] of Object.entries(LISTING_MAP)) {
    if (lower.includes(key)) return code
  }
  const numMatch = lower.match(/(\d{3}[a-z]?)/i)
  if (numMatch) {
    const num = numMatch[1].toUpperCase()
    if (['103', '102', '403', '303', '334A', '334'].includes(num)) {
      return num === '334' ? '334A' : num
    }
  }
  return ''
}

interface ParsedRow {
  date: string; type: string; confirmation: string; guest: string
  listing: string; apartmentCode: string; amount: number
  currency: string; isAdjustment: boolean; details: string
  raw: Record<string, string>
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = '', inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') inQuotes = !inQuotes
    else if (c === ',' && !inQuotes) { result.push(current.trim()); current = '' }
    else current += c
  }
  result.push(current.trim())
  return result
}

function parseAirbnbCSV(text: string): ParsedRow[] {
  const lines = text.split('\n')
  if (lines.length < 2) return []
  const headers = parseCSVLine(lines[0])
  const rows: ParsedRow[] = []
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    const values = parseCSVLine(lines[i])
    const raw: Record<string, string> = {}
    headers.forEach((h, j) => { raw[h] = values[j] || '' })
    const date = raw['Date'] || raw['Data'] || raw['Start Date'] || raw['Data de início'] || ''
    const type = raw['Type'] || raw['Tipo'] || ''
    const confirmation = raw['Confirmation Code'] || raw['Código de confirmação'] || raw['Confirmation code'] || ''
    const guest = raw['Guest'] || raw['Hóspede'] || ''
    const listing = raw['Listing'] || raw['Anúncio'] || ''
    const amountStr = raw['Amount'] || raw['Valor'] || raw['Paid Out'] || raw['Pago'] || raw['Gross Earnings'] || '0'
    const amount = parseFloat(amountStr.replace(/[R$.\s]/g, '').replace(',', '.')) || 0
    const currency = raw['Currency'] || raw['Moeda'] || 'BRL'
    const details = raw['Details'] || raw['Detalhes'] || raw['Description'] || raw['Descrição'] || ''
    const tl = type.toLowerCase()
    const isAdjustment = tl.includes('adjust') || tl.includes('ajust') || tl.includes('resolution') || tl.includes('resolução') || tl.includes('host fee') || tl.includes('taxa') || (amount < 0 && !tl.includes('payout') && !tl.includes('repasse'))
    rows.push({ date, type, confirmation, guest, listing, apartmentCode: matchApartment(listing), amount, currency, isAdjustment, details, raw })
  }
  return rows
}

function parseBankCSV(text: string): ParsedRow[] {
  const lines = text.split('\n')
  if (lines.length < 2) return []
  const sep = lines[0].includes(';') ? ';' : ','
  const headers = lines[0].split(sep).map(h => h.replace(/"/g, '').trim())
  const rows: ParsedRow[] = []
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    const values = lines[i].split(sep).map(v => v.replace(/"/g, '').trim())
    const raw: Record<string, string> = {}
    headers.forEach((h, j) => { raw[h] = values[j] || '' })
    const date = raw['Data'] || raw['Date'] || raw['Data Lançamento'] || raw['Data Movimentação'] || ''
    const type = raw['Descrição'] || raw['Description'] || raw['Histórico'] || raw['Lançamento'] || ''
    const amountStr = raw['Valor'] || raw['Amount'] || raw['Quantia'] || '0'
    const amount = parseFloat(amountStr.replace(/[R$.\s]/g, '').replace(',', '.')) || 0
    rows.push({ date, type, confirmation: '', guest: '', listing: '', apartmentCode: '', amount, currency: 'BRL', isAdjustment: false, details: type, raw })
  }
  return rows
}

function parseDate(ds: string): string | null {
  if (!ds) return null
  const parts = ds.split(/[/\-.]/)
  if (parts.length !== 3) return null
  let y: number, m: number, d: number
  if (parts[0].length === 4) { y = +parts[0]; m = +parts[1]; d = +parts[2] }
  else { d = +parts[0]; m = +parts[1]; y = +parts[2] }
  if (y < 100) y += 2000
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

const APT_OPTIONS = [...APARTMENTS]

export default function ImportarPage() {
  const [file, setFile] = useState<File | null>(null)
  const [fileType, setFileType] = useState<'airbnb' | 'bank'>('airbnb')
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [editCodes, setEditCodes] = useState<Record<number, string>>({})
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(f: File) {
    setFile(f); setError(''); setParsed(null); setSaved(false); setLoading(true)
    try {
      const text = await f.text()
      const rows = fileType === 'airbnb' ? parseAirbnbCSV(text) : parseBankCSV(text)
      if (rows.length === 0) { setError('Nenhum dado encontrado no arquivo.') }
      else {
        setParsed(rows)
        const codes: Record<number, string> = {}
        rows.forEach((r, i) => { if (r.apartmentCode) codes[i] = r.apartmentCode })
        setEditCodes(codes)
      }
    } catch { setError('Erro ao ler o arquivo.') }
    finally { setLoading(false) }
  }

  async function handleImport() {
    if (!parsed || !file) return
    setSaving(true); setError('')
    try {
      const totalAmount = parsed.reduce((s, r) => s + r.amount, 0)
      const { data: importLog, error: ie } = await supabase.from('csv_imports').insert({
        source: fileType, filename: file.name, rows_imported: parsed.length,
        total_amount: totalAmount, data: { headers: Object.keys(parsed[0]?.raw || {}), sample: parsed.slice(0, 3).map(r => r.raw) }
      }).select('id').single()
      if (ie) throw ie
      const importId = importLog.id

      if (fileType === 'airbnb') {
        // First, get all confirmation codes that are manually edited (protected)
        const confirmationCodes = parsed.map(r => r.confirmation).filter(Boolean)
        let protectedCodes = new Set<string>()
        if (confirmationCodes.length > 0) {
          const { data: protected_ } = await supabase
            .from('airbnb_transactions')
            .select('confirmation_code, type')
            .eq('manually_edited', true)
            .in('confirmation_code', [...new Set(confirmationCodes)])
          if (protected_) {
            protectedCodes = new Set(protected_.map(p => `${p.confirmation_code}|${p.type}`))
          }
        }

        let skipped = 0
        const txRows = parsed.map((r, i) => {
          // Skip rows that are manually edited in the DB
          const key = `${r.confirmation}|${r.type}`
          if (r.confirmation && protectedCodes.has(key)) { skipped++; return null }

          const ds = parseDate(r.date); const dt = ds ? new Date(ds + 'T12:00:00') : null
          return {
            import_id: importId, transaction_date: ds || '1970-01-01', type: r.type,
            confirmation_code: r.confirmation || null, guest_name: r.guest || null,
            listing_name: r.listing || null, apartment_code: editCodes[i] || r.apartmentCode || null,
            amount: r.amount, currency: r.currency, details: r.details || null,
            month: dt ? dt.getMonth() + 1 : null, year: dt ? dt.getFullYear() : null,
            is_adjustment: r.isAdjustment, manually_edited: false,
          }
        }).filter(Boolean)

        for (let i = 0; i < txRows.length; i += 50) {
          const { error: te } = await supabase.from('airbnb_transactions').insert(txRows.slice(i, i + 50))
          if (te) throw te
        }

        if (skipped > 0) {
          setError(`Importado! ${skipped} linha(s) protegida(s) por edição manual foram preservadas.`)
        }
      } else {
        const txRows = parsed.map((r, i) => ({
          import_id: importId, transaction_date: parseDate(r.date) || '1970-01-01',
          description: r.type || r.details || '', amount: r.amount,
          apartment_code: editCodes[i] || null,
        }))
        for (let i = 0; i < txRows.length; i += 50) {
          const { error: te } = await supabase.from('bank_transactions').insert(txRows.slice(i, i + 50))
          if (te) throw te
        }
      }
      setSaved(true)
    } catch (err: any) { setError(`Erro ao salvar: ${err.message || 'Desconhecido'}`) }
    finally { setSaving(false) }
  }

  const totalAmount = parsed?.reduce((s, r) => s + r.amount, 0) || 0
  const positiveTotal = parsed?.filter(r => r.amount > 0).reduce((s, r) => s + r.amount, 0) || 0
  const negativeTotal = parsed?.filter(r => r.amount < 0).reduce((s, r) => s + r.amount, 0) || 0
  const adjustments = parsed?.filter(r => r.isAdjustment) || []
  const unmapped = parsed?.filter((_, i) => !editCodes[i]) || []

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[rgb(var(--adm-text))]">Importar Dados</h1>
        <p className="text-xs text-[rgb(var(--adm-muted))] mt-0.5">Importe CSVs do Airbnb ou extratos bancários para o Supabase</p>
      </div>

      <div className="flex gap-2">
        {([
          { k: 'airbnb' as const, l: 'CSV do Airbnb', desc: 'Exportado de Airbnb → Performance → Earnings' },
          { k: 'bank' as const, l: 'Extrato Bancário', desc: 'CSV do Itaú, Nubank, Inter, etc.' },
        ]).map(t => (
          <button key={t.k} onClick={() => { setFileType(t.k); setParsed(null); setFile(null); setSaved(false) }}
            className={`flex-1 p-4 rounded-xl border text-left transition-all ${fileType === t.k ? 'bg-[rgb(var(--adm-accent)/0.10)] border-[rgb(var(--adm-accent)/0.30)] text-[rgb(var(--adm-text))]' : 'bg-[rgb(var(--adm-surface))] border-[rgb(var(--adm-border))] text-[rgb(var(--adm-muted))] hover:border-[rgb(var(--adm-accent)/0.20)]'}`}>
            <div className="flex items-center gap-2"><FileText className="h-4 w-4" /><span className="text-sm font-semibold">{t.l}</span></div>
            <p className="text-[10px] text-[rgb(var(--adm-muted))] mt-1">{t.desc}</p>
          </button>
        ))}
      </div>

      <div onClick={() => inputRef.current?.click()} onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f) }}
        className="bg-[rgb(var(--adm-surface))] border-2 border-dashed border-[rgb(var(--adm-border))] hover:border-[rgb(var(--adm-accent)/0.30)] rounded-xl p-8 text-center cursor-pointer transition-all">
        <Upload className="h-8 w-8 text-[rgb(var(--adm-muted))] mx-auto mb-3" />
        <p className="text-sm text-[rgb(var(--adm-text))]">{file ? file.name : 'Clique ou arraste um arquivo CSV'}</p>
        <p className="text-xs text-[rgb(var(--adm-muted))] mt-1">{fileType === 'airbnb' ? 'Formato CSV exportado do Airbnb' : 'Formato CSV ou OFX do banco'}</p>
        <input ref={inputRef} type="file" accept=".csv,.ofx,.txt" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      </div>

      {loading && <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-[rgb(var(--adm-accent))]" /><span className="ml-2 text-sm text-[rgb(var(--adm-muted))]">Processando...</span></div>}
      {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-2"><AlertCircle className="h-4 w-4 text-red-400 shrink-0" /><span className="text-sm text-red-400">{error}</span></div>}
      {saved && <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" /><span className="text-sm text-emerald-400">{parsed?.length} transações importadas com sucesso!</span></div>}

      {parsed && !saved && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { l: 'Linhas', v: String(parsed.length), c: 'text-[rgb(var(--adm-text))]' },
              { l: 'Entradas', v: fmtBRL(positiveTotal), c: 'text-emerald-400' },
              { l: 'Saídas / Ajustes', v: fmtBRL(negativeTotal), c: 'text-red-400' },
              { l: 'Líquido', v: fmtBRL(totalAmount), c: totalAmount >= 0 ? 'text-emerald-400' : 'text-red-400' },
            ].map(card => (
              <div key={card.l} className="bg-[rgb(var(--adm-surface))] border border-[rgb(var(--adm-border))] rounded-xl p-4">
                <p className="text-[10px] text-[rgb(var(--adm-muted))] uppercase tracking-wider">{card.l}</p>
                <p className={`text-lg font-bold font-mono mt-1 ${card.c}`}>{card.v}</p>
              </div>
            ))}
          </div>

          {fileType === 'airbnb' && adjustments.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div><p className="text-xs text-amber-400 font-semibold">{adjustments.length} ajuste(s) encontrado(s)</p>
                <p className="text-[10px] text-amber-400/70 mt-0.5">Ajustes +/− do Airbnb serão importados e marcados.</p></div>
            </div>
          )}

          {fileType === 'airbnb' && unmapped.length > 0 && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
              <div><p className="text-xs text-blue-400 font-semibold">{unmapped.length} sem imóvel associado</p>
                <p className="text-[10px] text-blue-400/70 mt-0.5">Selecione o imóvel na tabela.</p></div>
            </div>
          )}

          <div className="bg-[rgb(var(--adm-surface))] border border-[rgb(var(--adm-border))] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-[rgb(var(--adm-border))]">
                  <th className="text-left py-2 px-3 text-[rgb(var(--adm-muted))] font-medium">Data</th>
                  {fileType === 'airbnb' && <th className="text-left py-2 px-3 text-[rgb(var(--adm-muted))] font-medium">Hóspede</th>}
                  <th className="text-left py-2 px-3 text-[rgb(var(--adm-muted))] font-medium">Tipo</th>
                  <th className="text-left py-2 px-3 text-[rgb(var(--adm-muted))] font-medium">Imóvel</th>
                  <th className="text-right py-2 px-3 text-[rgb(var(--adm-muted))] font-medium">Valor</th>
                </tr></thead>
                <tbody>
                  {parsed.slice(0, 100).map((r, i) => (
                    <tr key={i} className={`border-b border-[rgb(var(--adm-border)/0.30)] hover:bg-[rgb(var(--adm-elevated))] ${r.isAdjustment ? 'bg-amber-500/5' : ''}`}>
                      <td className="py-2 px-3 text-[rgb(var(--adm-text))] font-mono whitespace-nowrap">{r.date}</td>
                      {fileType === 'airbnb' && <td className="py-2 px-3 text-[rgb(var(--adm-text))]">{r.guest || '—'}</td>}
                      <td className="py-2 px-3 text-[rgb(var(--adm-muted))]">{r.type}{r.isAdjustment && <span className="ml-1 text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">AJUSTE</span>}</td>
                      <td className="py-2 px-3">
                        <select value={editCodes[i] || r.apartmentCode || ''} onChange={e => setEditCodes(p => ({ ...p, [i]: e.target.value }))}
                          className={`bg-[rgb(var(--adm-elevated))] border rounded px-2 py-1 text-xs ${editCodes[i] || r.apartmentCode ? 'border-emerald-500/30 text-emerald-400' : 'border-[rgb(var(--adm-border))] text-[rgb(var(--adm-muted))]'}`}>
                          <option value="">—</option>
                          {APT_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                      <td className={`py-2 px-3 text-right font-mono font-medium ${r.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtBRL(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsed.length > 100 && <div className="text-center py-2 text-xs text-[rgb(var(--adm-muted))] border-t border-[rgb(var(--adm-border))]">Mostrando 100 de {parsed.length} linhas</div>}
          </div>

          <div className="flex gap-2">
            <button onClick={handleImport} disabled={saving}
              className="flex items-center gap-1.5 bg-[rgb(var(--adm-accent))] text-[rgb(var(--adm-accent-fg))] px-5 py-2.5 rounded-lg text-xs font-semibold hover:bg-[rgb(var(--adm-accent-hover))] transition-colors disabled:opacity-50">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
              {saving ? 'Salvando...' : `Importar ${parsed.length} linhas para o Supabase`}
            </button>
            <button onClick={() => { setParsed(null); setFile(null); setSaved(false); setEditCodes({}) }}
              className="px-4 py-2 rounded-lg text-xs text-[rgb(var(--adm-muted))] border border-[rgb(var(--adm-border))] hover:text-[rgb(var(--adm-text))]">Limpar</button>
          </div>
        </div>
      )}

      {saved && (
        <button onClick={() => { setParsed(null); setFile(null); setSaved(false); setEditCodes({}) }}
          className="flex items-center gap-1.5 bg-[rgb(var(--adm-accent))] text-[rgb(var(--adm-accent-fg))] px-4 py-2 rounded-lg text-xs font-semibold hover:bg-[rgb(var(--adm-accent-hover))]">
          <RefreshCw className="h-3.5 w-3.5" /> Importar outro arquivo
        </button>
      )}
    </div>
  )
}
