'use client'

import { useState, useEffect, useMemo } from 'react'
import { Calculator, Download, ChevronLeft, ChevronRight, Loader2, Building2, DollarSign, FileText, TrendingUp, TrendingDown } from 'lucide-react'
import { fmtBRL, parseBRL, MONTHS_FULL, APARTMENTS } from '@/lib/types'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')

interface Transaction {
  id: number
  apartment_code: string
  type: string
  date: string
  description: string
  amount: number
  category: string
  source: string
}

export default function ContadorPage() {
  const [loading, setLoading] = useState(true)
  const [airbnbTx, setAirbnbTx] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [directRes, setDirectRes] = useState<any[]>([])
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [view, setView] = useState<'resumo' | 'detalhado'>('resumo')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const monthNum = selectedMonth + 1
      const [txRes, expRes, drRes] = await Promise.allSettled([
        supabase.from('airbnb_transactions').select('*').eq('month', monthNum).order('date'),
        supabase.from('expenses').select('*').eq('month', monthNum).eq('year', 2026).order('created_at'),
        supabase.from('direct_reservations').select('*').order('checkin'),
      ])
      if (txRes.status === 'fulfilled' && txRes.value.data) setAirbnbTx(txRes.value.data)
      if (expRes.status === 'fulfilled' && expRes.value.data) setExpenses(expRes.value.data)
      if (drRes.status === 'fulfilled' && drRes.value.data) setDirectRes(drRes.value.data)
      setLoading(false)
    }
    load()
  }, [selectedMonth])

  // Group by apartment
  const byApt = useMemo(() => {
    const result: Record<string, { receita: number; despesa: number; airbnbFees: number; adjustments: number; directRevenue: number }> = {}
    APARTMENTS.forEach(a => { result[a] = { receita: 0, despesa: 0, airbnbFees: 0, adjustments: 0, directRevenue: 0 } })

    for (const tx of airbnbTx) {
      const apt = tx.apartment_code || tx.listing_code
      if (!apt || !result[apt]) continue
      const amount = Number(tx.amount || tx.paid_out || 0)
      if (tx.type === 'payout' || tx.type === 'reservation') {
        result[apt].receita += Math.abs(amount)
      } else if (tx.type === 'adjustment' || tx.type?.includes('adjust')) {
        result[apt].adjustments += amount
      } else if (tx.type?.includes('fee')) {
        result[apt].airbnbFees += Math.abs(amount)
      }
    }

    for (const exp of expenses) {
      const apt = exp.apartment_code
      if (apt && result[apt]) result[apt].despesa += Number(exp.amount || 0)
    }

    // Direct reservations for this month
    const monthStr = `2026-${String(selectedMonth + 1).padStart(2, '0')}`
    for (const dr of directRes) {
      if (dr.checkin?.startsWith(monthStr) && dr.payment_status === 'pago') {
        const apt = dr.apartment_code
        if (apt && result[apt]) result[apt].directRevenue += Number(dr.total_value || 0)
      }
    }

    return result
  }, [airbnbTx, expenses, directRes, selectedMonth])

  const totals = useMemo(() => {
    let receita = 0, despesa = 0, fees = 0, adj = 0, direct = 0
    Object.values(byApt).forEach(v => {
      receita += v.receita; despesa += v.despesa; fees += v.airbnbFees; adj += v.adjustments; direct += v.directRevenue
    })
    return { receita, despesa, fees, adj, direct, liquido: receita + adj + direct - despesa }
  }, [byApt])

  async function exportCSV() {
    const rows = [['Apartamento', 'Receita Airbnb', 'Ajustes', 'Reservas Diretas', 'Despesas', 'Resultado'].join(',')]
    APARTMENTS.forEach(apt => {
      const d = byApt[apt]
      const resultado = d.receita + d.adjustments + d.directRevenue - d.despesa
      rows.push([apt, d.receita.toFixed(2), d.adjustments.toFixed(2), d.directRevenue.toFixed(2), d.despesa.toFixed(2), resultado.toFixed(2)].join(','))
    })
    rows.push(['TOTAL', totals.receita.toFixed(2), totals.adj.toFixed(2), totals.direct.toFixed(2), totals.despesa.toFixed(2), totals.liquido.toFixed(2)].join(','))

    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Contador_${MONTHS_FULL[selectedMonth]}_2026.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#f0eee8]">Contador</h1>
          <p className="text-xs text-[#94918a] mt-0.5">Visão contábil — receitas, despesas e resultado por apartamento</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[#1e1e24] border border-[#2a2a30] text-[#94918a] hover:text-[#f0eee8] transition-colors">
            <Download className="h-3.5 w-3.5" /> Exportar CSV
          </button>
          <div className="flex items-center gap-1.5 bg-[#1e1e24] rounded-lg border border-[#2a2a30] px-1">
            <button onClick={() => setSelectedMonth(m => m > 0 ? m - 1 : 11)} className="p-1.5 text-[#94918a] hover:text-[#f0eee8]"><ChevronLeft className="h-4 w-4" /></button>
            <span className="text-sm font-medium text-[#f0eee8] min-w-[80px] text-center">{MONTHS_FULL[selectedMonth]}</span>
            <button onClick={() => setSelectedMonth(m => m < 11 ? m + 1 : 0)} className="p-1.5 text-[#94918a] hover:text-[#f0eee8]"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex rounded-lg border border-[#2a2a30] overflow-hidden text-xs w-fit">
        {(['resumo', 'detalhado'] as const).map(v => (
          <button key={v} onClick={() => setView(v)} className={`px-4 py-2 font-medium capitalize ${view === v ? 'bg-[#c9a96e] text-[#1a1207]' : 'bg-[#1e1e24] text-[#94918a] hover:text-[#f0eee8]'}`}>{v}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-[#c9a96e]" /></div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: 'Receita Airbnb', value: totals.receita, color: 'text-emerald-400', icon: TrendingUp },
              { label: 'Reservas Diretas', value: totals.direct, color: 'text-[#c9a96e]', icon: DollarSign },
              { label: 'Ajustes', value: totals.adj, color: totals.adj >= 0 ? 'text-emerald-400' : 'text-orange-400', icon: FileText },
              { label: 'Despesas', value: totals.despesa, color: 'text-red-400', icon: TrendingDown },
              { label: 'Resultado', value: totals.liquido, color: totals.liquido >= 0 ? 'text-emerald-400' : 'text-red-400', icon: Calculator },
            ].map(c => (
              <div key={c.label} className="bg-[#16161a] border border-[#2a2a30] rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] text-[#94918a] uppercase tracking-wider">{c.label}</p>
                  <c.icon className="h-3.5 w-3.5 text-[#c9a96e]" />
                </div>
                <p className={`text-lg font-bold font-mono ${c.color}`}>{fmtBRL(c.value)}</p>
              </div>
            ))}
          </div>

          {/* Table by apartment */}
          <div className="bg-[#16161a] border border-[#2a2a30] rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#2a2a30]">
                  {['Apartamento', 'Receita Airbnb', 'Ajustes', 'Reservas Diretas', 'Despesas', 'Resultado'].map(h => (
                    <th key={h} className={`py-3 px-4 text-[#94918a] font-medium ${h === 'Apartamento' ? 'text-left' : 'text-right'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {APARTMENTS.map(apt => {
                  const d = byApt[apt]
                  const resultado = d.receita + d.adjustments + d.directRevenue - d.despesa
                  return (
                    <tr key={apt} className="border-b border-[#2a2a30]/30 hover:bg-[#1e1e24]/50">
                      <td className="py-3 px-4 font-medium text-[#f0eee8]">
                        <div className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5 text-[#c9a96e]" /> Apt {apt}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-400">{fmtBRL(d.receita)}</td>
                      <td className={`py-3 px-4 text-right font-mono ${d.adjustments >= 0 ? 'text-emerald-400' : 'text-orange-400'}`}>{fmtBRL(d.adjustments)}</td>
                      <td className="py-3 px-4 text-right font-mono text-[#c9a96e]">{fmtBRL(d.directRevenue)}</td>
                      <td className="py-3 px-4 text-right font-mono text-red-400">{fmtBRL(d.despesa)}</td>
                      <td className={`py-3 px-4 text-right font-mono font-bold ${resultado >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtBRL(resultado)}</td>
                    </tr>
                  )
                })}
                <tr className="border-t-2 border-[#c9a96e]/30 font-bold">
                  <td className="py-3 px-4 text-[#c9a96e]">TOTAL</td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-400">{fmtBRL(totals.receita)}</td>
                  <td className={`py-3 px-4 text-right font-mono ${totals.adj >= 0 ? 'text-emerald-400' : 'text-orange-400'}`}>{fmtBRL(totals.adj)}</td>
                  <td className="py-3 px-4 text-right font-mono text-[#c9a96e]">{fmtBRL(totals.direct)}</td>
                  <td className="py-3 px-4 text-right font-mono text-red-400">{fmtBRL(totals.despesa)}</td>
                  <td className={`py-3 px-4 text-right font-mono ${totals.liquido >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtBRL(totals.liquido)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Detailed view: individual transactions */}
          {view === 'detalhado' && (
            <div className="space-y-4">
              {airbnbTx.length > 0 && (
                <div className="bg-[#16161a] border border-[#2a2a30] rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-[#f0eee8] mb-3">Transações Airbnb ({airbnbTx.length})</h3>
                  <div className="space-y-1 max-h-[400px] overflow-y-auto">
                    {airbnbTx.map((tx: any) => (
                      <div key={tx.id} className="flex items-center justify-between text-[11px] py-1.5 border-b border-[#2a2a30]/30">
                        <div className="flex items-center gap-2">
                          <span className="text-[#94918a] font-mono w-12">{tx.apartment_code}</span>
                          <span className="text-[#94918a] font-mono w-20">{tx.date}</span>
                          <span className="text-[#f0eee8] truncate max-w-[200px]">{tx.description || tx.guest_name || tx.type}</span>
                          <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${tx.type === 'adjustment' ? 'bg-orange-500/15 text-orange-400' : 'bg-emerald-500/15 text-emerald-400'}`}>{tx.type}</span>
                        </div>
                        <span className={`font-mono font-medium ${Number(tx.amount) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtBRL(Number(tx.amount || tx.paid_out || 0))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {expenses.length > 0 && (
                <div className="bg-[#16161a] border border-[#2a2a30] rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-[#f0eee8] mb-3">Despesas ({expenses.length})</h3>
                  <div className="space-y-1">
                    {expenses.map((e: any) => (
                      <div key={e.id} className="flex items-center justify-between text-[11px] py-1.5 border-b border-[#2a2a30]/30">
                        <div className="flex items-center gap-2">
                          <span className="text-[#94918a] font-mono w-12">{e.apartment_code}</span>
                          <span className="text-[#f0eee8]">{e.label}</span>
                          <span className="text-[10px] text-[#94918a]">{e.category}</span>
                        </div>
                        <span className="font-mono font-medium text-red-400">{fmtBRL(Number(e.amount))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Helper text */}
          <p className="text-[10px] text-[#94918a] text-center">
            Dados combinados de CSVs importados do Airbnb, despesas cadastradas e reservas diretas. Exporte o CSV para enviar ao contador.
          </p>
        </>
      )}
    </div>
  )
}
