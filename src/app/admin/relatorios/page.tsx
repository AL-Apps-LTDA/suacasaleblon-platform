'use client'

import { useState, useEffect } from 'react'
import { FileText, Download, Loader2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { APARTMENTS, MONTHS_FULL, fmtBRL, parseBRL } from '@/lib/types'
import type { ApartmentSummary, MonthData } from '@/lib/types'

function getMonthIdx(monthStr: string): number {
  const upper = monthStr.toUpperCase()
  const shorts = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ']
  return shorts.findIndex(m => upper.startsWith(m))
}

function ownerPart(m: MonthData) { return parseBRL(m.resultado) - parseBRL(m.repassar) }

export default function RelatoriosPage() {
  const [apartments, setApartments] = useState<ApartmentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() - 1 >= 0 ? new Date().getMonth() - 1 : 0)
  const [generating, setGenerating] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/apartments').then(r => r.json()).then(d => { if (Array.isArray(d)) setApartments(d) }).finally(() => setLoading(false))
  }, [])

  async function generatePDF(aptName: string) {
    setGenerating(aptName)
    try {
      const jsPDF = (await import('jspdf')).jsPDF
      const autoTable = (await import('jspdf-autotable')).default

      const apt = apartments.find(a => a.name === aptName)
      if (!apt) return

      const md = apt.months?.find(m => getMonthIdx(m.month) === selectedMonth)
      if (!md) { alert('Sem dados para este mês'); return }

      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()

      // Header
      doc.setFillColor(51, 65, 85)
      doc.rect(0, 0, pageWidth, 45, 'F')
      doc.setFillColor(201, 169, 110) // gold
      doc.rect(0, 45, pageWidth, 3, 'F')
      doc.setFontSize(8)
      doc.setTextColor(255, 255, 255)
      doc.text('SUA CASA LEBLON — GESTÃO COMPLETA', 15, 12)
      doc.setFontSize(20)
      doc.text(`Relatório Mensal — Apt ${aptName}`, pageWidth / 2, 28, { align: 'center' })
      doc.setFontSize(11)
      doc.setTextColor(200, 200, 200)
      doc.text(`${MONTHS_FULL[selectedMonth]} / 2026`, pageWidth / 2, 38, { align: 'center' })

      let y = 55

      // Summary box
      const receita = parseBRL(md.receitaTotal)
      const despesa = parseBRL(md.despesaTotal)
      const resultado = parseBRL(md.resultado)
      const commission = parseBRL(md.managerCommission)
      const repassar = parseBRL(md.repassar)
      const owner = ownerPart(md)

      doc.setFillColor(248, 250, 252)
      doc.roundedRect(15, y, pageWidth - 30, 30, 3, 3, 'F')
      doc.setFontSize(9)
      doc.setTextColor(100, 116, 139)

      const cols = [
        { label: 'Receita', value: fmtBRL(receita), color: [22, 163, 74] },
        { label: 'Despesas', value: fmtBRL(despesa), color: [220, 38, 38] },
        { label: 'Comissão', value: fmtBRL(commission), color: [201, 169, 110] },
        { label: 'Proprietário', value: fmtBRL(owner), color: [22, 163, 74] },
      ]

      const colWidth = (pageWidth - 40) / cols.length
      cols.forEach((col, i) => {
        const x = 20 + i * colWidth
        doc.setTextColor(100, 116, 139)
        doc.setFontSize(8)
        doc.text(col.label, x, y + 10)
        doc.setTextColor(col.color[0], col.color[1], col.color[2])
        doc.setFontSize(12)
        doc.text(col.value, x, y + 20)
      })

      y += 40

      // Reservations table
      if (md.reservations.length > 0) {
        doc.setFontSize(11)
        doc.setTextColor(30, 41, 59)
        doc.text('Reservas', 15, y)
        y += 5

        autoTable(doc, {
          startY: y,
          head: [['Check-in', 'Check-out', 'Hóspede', 'Origem', 'Valor']],
          body: md.reservations.filter(r => r.source !== 'adjustment').map(r => [
            r.checkin, r.checkout, r.guest || '—', r.guestOrigin || '—', r.revenue
          ]),
          styles: { fontSize: 8, cellPadding: 3 },
          headStyles: { fillColor: [51, 65, 85], textColor: 255 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          margin: { left: 15, right: 15 },
        })

        y = (doc as any).lastAutoTable.finalY + 10
      }

      // Expenses table
      if (md.expenses.length > 0) {
        doc.setFontSize(11)
        doc.setTextColor(30, 41, 59)
        doc.text('Despesas', 15, y)
        y += 5

        autoTable(doc, {
          startY: y,
          head: [['Data', 'Descrição', 'Valor']],
          body: md.expenses.map(e => [e.date, e.label, e.value]),
          styles: { fontSize: 8, cellPadding: 3 },
          headStyles: { fillColor: [220, 38, 38], textColor: 255 },
          alternateRowStyles: { fillColor: [254, 242, 242] },
          margin: { left: 15, right: 15 },
        })

        y = (doc as any).lastAutoTable.finalY + 10
      }

      // Footer
      const pageHeight = doc.internal.pageSize.getHeight()
      doc.setDrawColor(226, 232, 240)
      doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15)
      doc.setFontSize(7)
      doc.setTextColor(100, 116, 139)
      doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, 15, pageHeight - 8)
      doc.text('Sua Casa Leblon — AL Gestão Completa', pageWidth - 15, pageHeight - 8, { align: 'right' })

      doc.save(`Relatorio_Apt${aptName}_${MONTHS_FULL[selectedMonth]}_2026.pdf`)
    } catch (e: any) {
      alert(`Erro ao gerar PDF: ${e.message}`)
    } finally {
      setGenerating(null)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#f0eee8]">Relatórios</h1>
          <p className="text-xs text-[#94918a] mt-0.5">Gerar relatórios mensais em PDF para enviar aos proprietários</p>
        </div>
        <div className="flex items-center gap-1.5 bg-[#1e1e24] rounded-lg border border-[#2a2a30] px-1">
          <button onClick={() => setSelectedMonth(s => s > 0 ? s - 1 : 11)} className="p-1.5 text-[#94918a] hover:text-[#f0eee8]"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-sm font-medium text-[#f0eee8] min-w-[80px] text-center">{MONTHS_FULL[selectedMonth]}</span>
          <button onClick={() => setSelectedMonth(s => s < 11 ? s + 1 : 0)} className="p-1.5 text-[#94918a] hover:text-[#f0eee8]"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-[#c9a96e]" /></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {apartments.filter(a => !a.error).map(apt => {
            const md = apt.months?.find(m => getMonthIdx(m.month) === selectedMonth)
            const hasData = md && (parseBRL(md.receitaTotal) > 0 || md.reservations.length > 0)

            return (
              <div key={apt.name} className="bg-[#16161a] border border-[#2a2a30] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#c9a96e]" />
                    <span className="text-sm font-medium text-[#f0eee8]">Apt {apt.name}</span>
                  </div>
                  {hasData && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-400/15 text-emerald-400">Dados disponíveis</span>
                  )}
                </div>
                {hasData && md ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="bg-[#1e1e24] rounded-lg p-1.5">
                        <p className="text-[8px] text-[#94918a] uppercase">Receita</p>
                        <p className="text-[10px] font-bold text-emerald-400 font-mono">{md.receitaTotal}</p>
                      </div>
                      <div className="bg-[#1e1e24] rounded-lg p-1.5">
                        <p className="text-[8px] text-[#94918a] uppercase">Reservas</p>
                        <p className="text-[10px] font-bold text-[#f0eee8] font-mono">{md.reservations.filter(r => r.source !== 'adjustment').length}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => generatePDF(apt.name)}
                      disabled={generating === apt.name}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-[#c9a96e] text-[#1a1207] font-semibold hover:bg-[#c9a96e]/90 disabled:opacity-50"
                    >
                      {generating === apt.name ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      Gerar PDF
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-[#94918a]">Sem dados para {MONTHS_FULL[selectedMonth]}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
