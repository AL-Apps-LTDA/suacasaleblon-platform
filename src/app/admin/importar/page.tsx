'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, CheckCircle2, AlertCircle, Download, Loader2 } from 'lucide-react'
import { fmtBRL } from '@/lib/types'

interface ParsedRow {
  date: string
  type: string
  confirmation: string
  guest: string
  listing: string
  amount: number
  currency: string
  raw: Record<string, string>
}

function parseAirbnbCSV(text: string): ParsedRow[] {
  const lines = text.split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())
  const rows: ParsedRow[] = []

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    const values = lines[i].match(/("([^"]*)"|[^,]*)/g)?.map(v => v.replace(/^"|"$/g, '').trim()) || []
    const raw: Record<string, string> = {}
    headers.forEach((h, j) => { raw[h] = values[j] || '' })

    // Airbnb CSV formats vary - try common column names
    const date = raw['Date'] || raw['Data'] || raw['Start Date'] || raw['Data de início'] || ''
    const type = raw['Type'] || raw['Tipo'] || ''
    const confirmation = raw['Confirmation Code'] || raw['Código de confirmação'] || ''
    const guest = raw['Guest'] || raw['Hóspede'] || ''
    const listing = raw['Listing'] || raw['Anúncio'] || ''
    const amountStr = raw['Amount'] || raw['Valor'] || raw['Paid Out'] || raw['Pago'] || '0'
    const amount = parseFloat(amountStr.replace(/[R$.\s]/g, '').replace(',', '.')) || 0
    const currency = raw['Currency'] || raw['Moeda'] || 'BRL'

    rows.push({ date, type, confirmation, guest, listing, amount, currency, raw })
  }

  return rows
}

function parseBankCSV(text: string): ParsedRow[] {
  const lines = text.split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(';').length > 2
    ? lines[0].split(';').map(h => h.replace(/"/g, '').trim())
    : lines[0].split(',').map(h => h.replace(/"/g, '').trim())

  const sep = lines[0].split(';').length > 2 ? ';' : ','
  const rows: ParsedRow[] = []

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    const values = lines[i].split(sep).map(v => v.replace(/"/g, '').trim())
    const raw: Record<string, string> = {}
    headers.forEach((h, j) => { raw[h] = values[j] || '' })

    const date = raw['Data'] || raw['Date'] || raw['Data Lançamento'] || ''
    const type = raw['Descrição'] || raw['Description'] || raw['Histórico'] || ''
    const amountStr = raw['Valor'] || raw['Amount'] || raw['Quantia'] || '0'
    const amount = parseFloat(amountStr.replace(/[R$.\s]/g, '').replace(',', '.')) || 0

    rows.push({ date, type, confirmation: '', guest: '', listing: '', amount, currency: 'BRL', raw })
  }

  return rows
}

export default function ImportarPage() {
  const [file, setFile] = useState<File | null>(null)
  const [fileType, setFileType] = useState<'airbnb' | 'bank'>('airbnb')
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(f: File) {
    setFile(f)
    setError('')
    setParsed(null)
    setLoading(true)

    try {
      const text = await f.text()
      const rows = fileType === 'airbnb' ? parseAirbnbCSV(text) : parseBankCSV(text)
      if (rows.length === 0) {
        setError('Nenhum dado encontrado no arquivo. Verifique o formato.')
      } else {
        setParsed(rows)
      }
    } catch {
      setError('Erro ao ler o arquivo.')
    } finally {
      setLoading(false)
    }
  }

  const totalAmount = parsed?.reduce((s, r) => s + r.amount, 0) || 0
  const positiveTotal = parsed?.filter(r => r.amount > 0).reduce((s, r) => s + r.amount, 0) || 0
  const negativeTotal = parsed?.filter(r => r.amount < 0).reduce((s, r) => s + r.amount, 0) || 0

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[#f0eee8]">Importar Dados</h1>
        <p className="text-xs text-[#94918a] mt-0.5">Importe CSVs do Airbnb ou extratos bancários</p>
      </div>

      {/* File type selector */}
      <div className="flex gap-2">
        {[
          { k: 'airbnb' as const, l: 'CSV do Airbnb', desc: 'Exportado de Airbnb → Performance → Earnings' },
          { k: 'bank' as const, l: 'Extrato Bancário', desc: 'CSV/OFX do Itaú, Nubank, etc.' },
        ].map(t => (
          <button
            key={t.k}
            onClick={() => { setFileType(t.k); setParsed(null); setFile(null) }}
            className={`flex-1 p-4 rounded-xl border text-left transition-all ${
              fileType === t.k
                ? 'bg-[#c9a96e]/10 border-[#c9a96e]/30 text-[#f0eee8]'
                : 'bg-[#16161a] border-[#2a2a30] text-[#94918a] hover:border-[#c9a96e]/20'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="text-sm font-semibold">{t.l}</span>
            </div>
            <p className="text-[10px] text-[#94918a] mt-1">{t.desc}</p>
          </button>
        ))}
      </div>

      {/* Upload area */}
      <div
        onClick={() => inputRef.current?.click()}
        className="bg-[#16161a] border-2 border-dashed border-[#2a2a30] hover:border-[#c9a96e]/30 rounded-xl p-8 text-center cursor-pointer transition-all"
      >
        <Upload className="h-8 w-8 text-[#94918a] mx-auto mb-3" />
        <p className="text-sm text-[#f0eee8]">
          {file ? file.name : 'Clique ou arraste um arquivo CSV'}
        </p>
        <p className="text-xs text-[#94918a] mt-1">
          {fileType === 'airbnb' ? 'Formato CSV exportado do Airbnb' : 'Formato CSV ou OFX do banco'}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.ofx,.txt"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-[#c9a96e]" />
          <span className="ml-2 text-sm text-[#94918a]">Processando arquivo...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          <span className="text-sm text-red-400">{error}</span>
        </div>
      )}

      {/* Results */}
      {parsed && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#16161a] border border-[#2a2a30] rounded-xl p-4">
              <p className="text-[10px] text-[#94918a] uppercase tracking-wider">Linhas</p>
              <p className="text-lg font-bold text-[#f0eee8] font-mono mt-1">{parsed.length}</p>
            </div>
            <div className="bg-[#16161a] border border-[#2a2a30] rounded-xl p-4">
              <p className="text-[10px] text-[#94918a] uppercase tracking-wider">Entradas</p>
              <p className="text-lg font-bold text-emerald-400 font-mono mt-1">{fmtBRL(positiveTotal)}</p>
            </div>
            <div className="bg-[#16161a] border border-[#2a2a30] rounded-xl p-4">
              <p className="text-[10px] text-[#94918a] uppercase tracking-wider">Saídas</p>
              <p className="text-lg font-bold text-red-400 font-mono mt-1">{fmtBRL(negativeTotal)}</p>
            </div>
          </div>

          <div className="bg-[#16161a] border border-[#2a2a30] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#2a2a30]">
                    <th className="text-left py-2 px-3 text-[#94918a] font-medium">Data</th>
                    {fileType === 'airbnb' && <th className="text-left py-2 px-3 text-[#94918a] font-medium">Hóspede</th>}
                    <th className="text-left py-2 px-3 text-[#94918a] font-medium">Tipo</th>
                    {fileType === 'airbnb' && <th className="text-left py-2 px-3 text-[#94918a] font-medium">Imóvel</th>}
                    <th className="text-right py-2 px-3 text-[#94918a] font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.slice(0, 50).map((r, i) => (
                    <tr key={i} className="border-b border-[#2a2a30]/30 hover:bg-[#1e1e24]">
                      <td className="py-2 px-3 text-[#f0eee8] font-mono">{r.date}</td>
                      {fileType === 'airbnb' && <td className="py-2 px-3 text-[#f0eee8]">{r.guest}</td>}
                      <td className="py-2 px-3 text-[#94918a]">{r.type}</td>
                      {fileType === 'airbnb' && <td className="py-2 px-3 text-[#94918a]">{r.listing}</td>}
                      <td className={`py-2 px-3 text-right font-mono font-medium ${r.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {fmtBRL(r.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsed.length > 50 && (
              <div className="text-center py-2 text-xs text-[#94918a] border-t border-[#2a2a30]">
                Mostrando 50 de {parsed.length} linhas
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 bg-[#c9a96e] text-[#1a1207] px-4 py-2 rounded-lg text-xs font-semibold hover:bg-[#dbc192] transition-colors">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Importar para o Sistema
            </button>
            <button
              onClick={() => { setParsed(null); setFile(null) }}
              className="px-4 py-2 rounded-lg text-xs text-[#94918a] border border-[#2a2a30] hover:text-[#f0eee8]"
            >
              Limpar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
