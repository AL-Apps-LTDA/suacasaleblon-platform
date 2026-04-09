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
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
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
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 15
      const contentWidth = pageWidth - margin * 2

      // ─── HEADER ───
      // Dark bar
      doc.setFillColor(26, 18, 7) // brand-dark
      doc.rect(0, 0, pageWidth, 50, 'F')
      // Gold accent line
      doc.setFillColor(201, 169, 110) // gold
      doc.rect(0, 50, pageWidth, 2, 'F')

      // Logo text
      doc.setFontSize(9)
      doc.setTextColor(201, 169, 110)
      doc.text('SUA CASA LEBLON', margin, 14)
      doc.setFontSize(7)
      doc.setTextColor(160, 155, 145)
      doc.text('Gestão Completa de Temporada', margin, 20)

      // Title
      doc.setFontSize(22)
      doc.setTextColor(255, 255, 255)
      doc.text(`Relatório Mensal`, margin, 35)
      doc.setFontSize(13)
      doc.setTextColor(201, 169, 110)
      doc.text(`Apartamento ${aptName}  •  ${MONTHS_FULL[selectedMonth]} 2026`, margin, 44)

      let y = 62

      // ─── CURRENT MONTH DATA ───
      const receita = parseBRL(md.receitaTotal)
      const despesa = parseBRL(md.despesaTotal)
      const resultado = parseBRL(md.resultado)
      const commission = parseBRL(md.managerCommission)
      const repassar = parseBRL(md.repassar)
      const owner = ownerPart(md)
      const nReservas = md.reservations.filter(r => r.source !== 'adjustment').length
      const adjustments = md.reservations.filter(r => r.source === 'adjustment')

      // ─── COLLECT ALL MONTHS DATA FOR CHARTS ───
      const monthShorts = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
      const allMonths = apt.months || []
      const monthlyData: { label: string; receita: number; despesa: number; resultado: number; idx: number }[] = []
      allMonths.forEach(m => {
        const idx = getMonthIdx(m.month)
        if (idx >= 0) {
          monthlyData.push({
            label: monthShorts[idx],
            receita: parseBRL(m.receitaTotal),
            despesa: parseBRL(m.despesaTotal),
            resultado: parseBRL(m.resultado),
            idx,
          })
        }
      })
      monthlyData.sort((a, b) => a.idx - b.idx)

      // ─── PAGE 1: PERFORMANCE OVERVIEW ───

      // Section title
      doc.setFontSize(11)
      doc.setTextColor(30, 41, 59)
      doc.text('Resumo de Performance', margin, y)
      y += 8

      // ─── KPI CARDS (5 metrics) ───
      const kpiCards = [
        { label: 'RECEITA TOTAL', value: fmtBRL(receita), color: [22, 163, 74] as [number, number, number], bg: [240, 253, 244] as [number, number, number] },
        { label: 'DESPESAS', value: fmtBRL(despesa), color: [220, 38, 38] as [number, number, number], bg: [254, 242, 242] as [number, number, number] },
        { label: 'RESULTADO', value: fmtBRL(resultado), color: resultado >= 0 ? [22, 163, 74] as [number, number, number] : [220, 38, 38] as [number, number, number], bg: resultado >= 0 ? [240, 253, 244] as [number, number, number] : [254, 242, 242] as [number, number, number] },
        { label: 'COMISSÃO GESTÃO', value: fmtBRL(commission), color: [161, 129, 70] as [number, number, number], bg: [253, 249, 237] as [number, number, number] },
        { label: 'REPASSE PROPRIETÁRIO', value: fmtBRL(owner), color: [22, 163, 74] as [number, number, number], bg: [240, 253, 244] as [number, number, number] },
      ]

      // Row 1: 3 cards
      const cardW3 = (contentWidth - 6) / 3
      kpiCards.slice(0, 3).forEach((card, i) => {
        const x = margin + i * (cardW3 + 3)
        doc.setFillColor(card.bg[0], card.bg[1], card.bg[2])
        doc.roundedRect(x, y, cardW3, 22, 2, 2, 'F')
        doc.setFontSize(6)
        doc.setTextColor(120, 120, 120)
        doc.text(card.label, x + 4, y + 7)
        doc.setFontSize(11)
        doc.setTextColor(card.color[0], card.color[1], card.color[2])
        doc.text(card.value, x + 4, y + 16)
      })
      y += 26

      // Row 2: 2 cards + reservas count
      const cardW2 = (contentWidth - 6) / 3
      kpiCards.slice(3, 5).forEach((card, i) => {
        const x = margin + i * (cardW2 + 3)
        doc.setFillColor(card.bg[0], card.bg[1], card.bg[2])
        doc.roundedRect(x, y, cardW2, 22, 2, 2, 'F')
        doc.setFontSize(6)
        doc.setTextColor(120, 120, 120)
        doc.text(card.label, x + 4, y + 7)
        doc.setFontSize(11)
        doc.setTextColor(card.color[0], card.color[1], card.color[2])
        doc.text(card.value, x + 4, y + 16)
      })
      // Reservas count card
      {
        const x = margin + 2 * (cardW2 + 3)
        doc.setFillColor(245, 245, 250)
        doc.roundedRect(x, y, cardW2, 22, 2, 2, 'F')
        doc.setFontSize(6)
        doc.setTextColor(120, 120, 120)
        doc.text('RESERVAS NO MÊS', x + 4, y + 7)
        doc.setFontSize(16)
        doc.setTextColor(30, 41, 59)
        doc.text(`${nReservas}`, x + 4, y + 17)
      }
      y += 30

      // ─── MONTHLY REVENUE BAR CHART ───
      if (monthlyData.length > 0) {
        doc.setFontSize(9)
        doc.setTextColor(30, 41, 59)
        doc.text('Receita x Despesa Mensal (2026)', margin, y)
        y += 5

        const chartX = margin
        const chartW = contentWidth
        const chartH = 70
        const chartBottom = y + chartH

        // Background
        doc.setFillColor(250, 250, 252)
        doc.roundedRect(chartX, y, chartW, chartH + 18, 3, 3, 'F')
        doc.setDrawColor(230, 230, 235)
        doc.setLineWidth(0.3)
        doc.roundedRect(chartX, y, chartW, chartH + 18, 3, 3, 'S')

        const innerPadX = 10
        const innerPadTop = 6
        const barAreaX = chartX + innerPadX
        const barAreaW = chartW - innerPadX * 2
        const barAreaTop = y + innerPadTop
        const barAreaH = chartH - innerPadTop

        // Find max value for scale
        const allValues = monthlyData.flatMap(d => [d.receita, d.despesa])
        const maxVal = Math.max(...allValues, 1)

        // Grid lines
        const gridLines = 4
        doc.setDrawColor(225, 225, 230)
        doc.setLineWidth(0.15)
        for (let g = 0; g <= gridLines; g++) {
          const gy = barAreaTop + (barAreaH * g / gridLines)
          doc.line(barAreaX, gy, barAreaX + barAreaW, gy)
          // Scale labels
          const gridVal = maxVal * (1 - g / gridLines)
          doc.setFontSize(5.5)
          doc.setTextColor(160, 160, 165)
          const gridLabel = gridVal >= 1000 ? `${(gridVal / 1000).toFixed(0)}k` : gridVal.toFixed(0)
          doc.text(gridLabel, barAreaX - 1, gy + 1.5, { align: 'right' })
        }

        // Bars
        const nMonths = monthlyData.length
        const groupWidth = barAreaW / nMonths
        const barWidth = Math.min(groupWidth * 0.32, 12)
        const gap = 2

        monthlyData.forEach((d, i) => {
          const groupCenter = barAreaX + groupWidth * i + groupWidth / 2
          const isSelected = d.idx === selectedMonth

          // Receita bar (green)
          const recH = maxVal > 0 ? (d.receita / maxVal) * barAreaH : 0
          doc.setFillColor(34, 197, 94) // green-500
          if (isSelected) doc.setFillColor(22, 163, 74) // green-600 for selected month
          doc.roundedRect(groupCenter - barWidth - gap / 2, chartBottom - innerPadTop - recH, barWidth, recH, 1, 1, 'F')

          // Despesa bar (red)
          const despH = maxVal > 0 ? (d.despesa / maxVal) * barAreaH : 0
          doc.setFillColor(248, 113, 113) // red-400
          if (isSelected) doc.setFillColor(220, 38, 38) // red-600 for selected month
          doc.roundedRect(groupCenter + gap / 2, chartBottom - innerPadTop - despH, barWidth, despH, 1, 1, 'F')

          // Month label
          doc.setFontSize(6)
          doc.setTextColor(isSelected ? 26 : 140, isSelected ? 18 : 140, isSelected ? 7 : 145)
          if (isSelected) doc.setFont('helvetica', 'bold')
          doc.text(d.label, groupCenter, chartBottom + 3, { align: 'center' })
          if (isSelected) doc.setFont('helvetica', 'normal')

          // Value on top of receita bar for selected month
          if (isSelected && d.receita > 0) {
            doc.setFontSize(5.5)
            doc.setTextColor(22, 163, 74)
            doc.text(fmtBRL(d.receita), groupCenter - barWidth / 2, chartBottom - innerPadTop - recH - 2, { align: 'center' })
          }
        })

        // Legend
        const legendY = chartBottom + 8
        doc.setFillColor(34, 197, 94)
        doc.rect(barAreaX, legendY, 6, 3, 'F')
        doc.setFontSize(5.5)
        doc.setTextColor(80, 80, 80)
        doc.text('Receita', barAreaX + 8, legendY + 2.5)

        doc.setFillColor(248, 113, 113)
        doc.rect(barAreaX + 30, legendY, 6, 3, 'F')
        doc.text('Despesa', barAreaX + 38, legendY + 2.5)

        y = chartBottom + 20
      }

      // ─── OCCUPANCY GAUGE ───
      // Calculate occupancy: count nights booked in selected month
      {
        const daysInMonth = new Date(2026, selectedMonth + 1, 0).getDate()
        let bookedNights = 0
        const realRes = md.reservations.filter(r => r.source !== 'adjustment')
        realRes.forEach(r => {
          if (!r.checkin || !r.checkout) return
          const parts1 = r.checkin.split('/')
          const parts2 = r.checkout.split('/')
          if (parts1.length < 3 || parts2.length < 3) return
          const cin = new Date(+parts1[2], +parts1[1] - 1, +parts1[0])
          const cout = new Date(+parts2[2], +parts2[1] - 1, +parts2[0])
          const monthStart = new Date(2026, selectedMonth, 1)
          const monthEnd = new Date(2026, selectedMonth + 1, 0)
          const start = cin < monthStart ? monthStart : cin
          const end = cout > monthEnd ? monthEnd : cout
          const nights = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / 86400000))
          bookedNights += nights
        })
        const occupancy = Math.min(100, Math.round((bookedNights / daysInMonth) * 100))

        doc.setFontSize(9)
        doc.setTextColor(30, 41, 59)
        doc.text('Taxa de Ocupação', margin, y)
        y += 5

        // Occupancy bar background
        const barH = 10
        doc.setFillColor(235, 235, 240)
        doc.roundedRect(margin, y, contentWidth, barH, 3, 3, 'F')

        // Filled portion
        const fillW = (contentWidth * occupancy) / 100
        if (occupancy > 0) {
          const r = occupancy >= 70 ? 22 : occupancy >= 40 ? 201 : 220
          const g = occupancy >= 70 ? 163 : occupancy >= 40 ? 169 : 38
          const b = occupancy >= 70 ? 74 : occupancy >= 40 ? 110 : 38
          doc.setFillColor(r, g, b)
          doc.roundedRect(margin, y, fillW, barH, 3, 3, 'F')
        }

        // Text on bar
        doc.setFontSize(7)
        doc.setTextColor(255, 255, 255)
        if (fillW > 30) {
          doc.text(`${occupancy}%  (${bookedNights}/${daysInMonth} noites)`, margin + 5, y + 7)
        } else {
          doc.setTextColor(80, 80, 80)
          doc.text(`${occupancy}%  (${bookedNights}/${daysInMonth} noites)`, margin + fillW + 4, y + 7)
        }

        y += barH + 8
      }

      // ─── FOOTER PAGE 1 ───
      doc.setDrawColor(201, 169, 110)
      doc.setLineWidth(0.5)
      doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18)
      doc.setFontSize(7)
      doc.setTextColor(140, 140, 140)
      doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, margin, pageHeight - 12)
      doc.text('Sua Casa Leblon — AL Gestão Completa de Temporada', pageWidth - margin, pageHeight - 12, { align: 'right' })
      doc.setFontSize(6)
      doc.setTextColor(180, 180, 180)
      doc.text('Pág. 1 — Visão Geral', margin, pageHeight - 7)

      // ═══════════════════════════════════════════
      // ─── PAGE 2+: DETAILED BREAKDOWN ───
      // ═══════════════════════════════════════════
      doc.addPage()

      // Page 2 Header (compact)
      doc.setFillColor(26, 18, 7)
      doc.rect(0, 0, pageWidth, 30, 'F')
      doc.setFillColor(201, 169, 110)
      doc.rect(0, 30, pageWidth, 1.5, 'F')
      doc.setFontSize(8)
      doc.setTextColor(201, 169, 110)
      doc.text('SUA CASA LEBLON', margin, 10)
      doc.setFontSize(14)
      doc.setTextColor(255, 255, 255)
      doc.text(`Detalhamento — ${MONTHS_FULL[selectedMonth]} 2026`, margin, 23)

      y = 40

      // ─── SUMMARY CARDS (repeated compact on page 2) ───
      const cards = [
        { label: 'RECEITA BRUTA', value: fmtBRL(receita), color: [22, 163, 74] as [number, number, number], bg: [240, 253, 244] as [number, number, number] },
        { label: 'DESPESAS', value: fmtBRL(despesa), color: [220, 38, 38] as [number, number, number], bg: [254, 242, 242] as [number, number, number] },
        { label: 'COMISSÃO GESTÃO', value: fmtBRL(commission), color: [161, 129, 70] as [number, number, number], bg: [253, 249, 237] as [number, number, number] },
        { label: 'REPASSE PROPRIETÁRIO', value: fmtBRL(owner), color: [22, 163, 74] as [number, number, number], bg: [240, 253, 244] as [number, number, number] },
      ]

      const cardWidth = (contentWidth - 9) / 4
      cards.forEach((card, i) => {
        const x = margin + i * (cardWidth + 3)
        doc.setFillColor(card.bg[0], card.bg[1], card.bg[2])
        doc.roundedRect(x, y, cardWidth, 24, 2, 2, 'F')
        doc.setFontSize(6.5)
        doc.setTextColor(120, 120, 120)
        doc.text(card.label, x + 4, y + 8)
        doc.setFontSize(12)
        doc.setTextColor(card.color[0], card.color[1], card.color[2])
        doc.text(card.value, x + 4, y + 18)
      })

      y += 32

      // Result highlight
      doc.setFillColor(resultado >= 0 ? 240 : 254, resultado >= 0 ? 253 : 242, resultado >= 0 ? 244 : 242)
      doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'F')
      doc.setDrawColor(resultado >= 0 ? 22 : 220, resultado >= 0 ? 163 : 38, resultado >= 0 ? 74 : 38)
      doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'S')
      doc.setFontSize(9)
      doc.setTextColor(80, 80, 80)
      doc.text('RESULTADO LÍQUIDO DO MÊS', margin + 6, y + 7)
      doc.setFontSize(14)
      doc.setTextColor(resultado >= 0 ? 22 : 220, resultado >= 0 ? 163 : 38, resultado >= 0 ? 74 : 38)
      doc.text(fmtBRL(resultado), pageWidth - margin - 6, y + 12, { align: 'right' })
      doc.setFontSize(8)
      doc.setTextColor(120, 120, 120)
      doc.text(`${nReservas} reserva${nReservas !== 1 ? 's' : ''}`, margin + 6, y + 13)

      y += 24

      // ─── RESERVATIONS TABLE ───
      const realReservations = md.reservations.filter(r => r.source !== 'adjustment')
      if (realReservations.length > 0) {
        doc.setFontSize(11)
        doc.setTextColor(30, 41, 59)
        doc.text('Reservas', margin, y)
        y += 2

        autoTable(doc, {
          startY: y,
          head: [['Check-in', 'Check-out', 'Hóspede', 'Origem', 'Valor']],
          body: realReservations.map(r => [
            r.checkin, r.checkout, r.guest || '—', r.guestOrigin || '—', r.revenue
          ]),
          styles: { fontSize: 8, cellPadding: 3.5, lineColor: [230, 230, 230], lineWidth: 0.2 },
          headStyles: { fillColor: [26, 18, 7], textColor: [201, 169, 110], fontStyle: 'bold', fontSize: 7.5 },
          alternateRowStyles: { fillColor: [250, 248, 243] },
          columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } },
          margin: { left: margin, right: margin },
        })
        y = (doc as any).lastAutoTable.finalY + 4

        // Adjustments sub-table
        if (adjustments.length > 0) {
          doc.setFontSize(8)
          doc.setTextColor(180, 120, 40)
          doc.text('Ajustes (débitos/créditos Airbnb)', margin + 2, y + 4)
          y += 5
          autoTable(doc, {
            startY: y,
            head: [['Descrição', 'Valor']],
            body: adjustments.map(a => [a.guest || 'Ajuste', a.revenue]),
            styles: { fontSize: 7.5, cellPadding: 2.5 },
            headStyles: { fillColor: [180, 120, 40], textColor: 255, fontSize: 7 },
            columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
            margin: { left: margin, right: margin },
          })
          y = (doc as any).lastAutoTable.finalY + 4
        }

        // Subtotal
        doc.setFillColor(240, 253, 244)
        doc.roundedRect(margin, y, contentWidth, 10, 1, 1, 'F')
        doc.setFontSize(8)
        doc.setTextColor(80, 80, 80)
        doc.text('Receita Total', margin + 4, y + 7)
        doc.setTextColor(22, 163, 74)
        doc.setFontSize(10)
        doc.text(md.receitaTotal, pageWidth - margin - 4, y + 7, { align: 'right' })
        y += 16
      }

      // ─── EXPENSES TABLE ───
      if (md.expenses.length > 0) {
        doc.setFontSize(11)
        doc.setTextColor(30, 41, 59)
        doc.text('Despesas', margin, y)
        y += 2

        autoTable(doc, {
          startY: y,
          head: [['Descrição', 'Obs.', 'Valor']],
          body: md.expenses.map(e => [e.label, e.obs || '', e.value]),
          styles: { fontSize: 8, cellPadding: 3.5, lineColor: [230, 230, 230], lineWidth: 0.2 },
          headStyles: { fillColor: [180, 40, 40], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
          alternateRowStyles: { fillColor: [255, 248, 248] },
          columnStyles: { 2: { halign: 'right', fontStyle: 'bold' } },
          margin: { left: margin, right: margin },
        })
        y = (doc as any).lastAutoTable.finalY + 4

        // Subtotal
        doc.setFillColor(254, 242, 242)
        doc.roundedRect(margin, y, contentWidth, 10, 1, 1, 'F')
        doc.setFontSize(8)
        doc.setTextColor(80, 80, 80)
        doc.text('Despesa Total', margin + 4, y + 7)
        doc.setTextColor(220, 38, 38)
        doc.setFontSize(10)
        doc.text(md.despesaTotal, pageWidth - margin - 4, y + 7, { align: 'right' })
        y += 16
      }

      // ─── FOOTER (detail pages) ───
      const totalPages = doc.getNumberOfPages()
      for (let p = 2; p <= totalPages; p++) {
        doc.setPage(p)
        doc.setDrawColor(201, 169, 110)
        doc.setLineWidth(0.5)
        doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18)
        doc.setFontSize(7)
        doc.setTextColor(140, 140, 140)
        doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, margin, pageHeight - 12)
        doc.text('Sua Casa Leblon — AL Gestão Completa de Temporada', pageWidth - margin, pageHeight - 12, { align: 'right' })
        doc.setFontSize(6)
        doc.setTextColor(180, 180, 180)
        doc.text(`Pág. ${p} — Detalhamento  |  Este relatório é gerado automaticamente.`, margin, pageHeight - 7)
      }

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
          <h1 className="text-xl font-bold text-[rgb(var(--adm-text))]">Relatórios</h1>
          <p className="text-xs text-[rgb(var(--adm-muted))] mt-0.5">Gerar relatórios mensais em PDF para enviar aos proprietários</p>
        </div>
        <div className="flex items-center gap-1.5 bg-[rgb(var(--adm-elevated))] rounded-lg border border-[rgb(var(--adm-border))] px-1">
          <button onClick={() => setSelectedMonth(s => s > 0 ? s - 1 : 11)} className="p-1.5 text-[rgb(var(--adm-muted))] hover:text-[rgb(var(--adm-text))]"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-sm font-medium text-[rgb(var(--adm-text))] min-w-[80px] text-center">{MONTHS_FULL[selectedMonth]}</span>
          <button onClick={() => setSelectedMonth(s => s < 11 ? s + 1 : 0)} className="p-1.5 text-[rgb(var(--adm-muted))] hover:text-[rgb(var(--adm-text))]"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-[rgb(var(--adm-accent))]" /></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {apartments.filter(a => !a.error).map(apt => {
            const md = apt.months?.find(m => getMonthIdx(m.month) === selectedMonth)
            const hasData = md && (parseBRL(md.receitaTotal) > 0 || md.reservations.length > 0)

            return (
              <div key={apt.name} className="bg-[rgb(var(--adm-surface))] border border-[rgb(var(--adm-border))] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[rgb(var(--adm-accent))]" />
                    <span className="text-sm font-medium text-[rgb(var(--adm-text))]">Apt {apt.name}</span>
                  </div>
                  {hasData && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-400/15 text-emerald-400">Dados disponíveis</span>
                  )}
                </div>
                {hasData && md ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="bg-[rgb(var(--adm-elevated))] rounded-lg p-1.5">
                        <p className="text-[8px] text-[rgb(var(--adm-muted))] uppercase">Receita</p>
                        <p className="text-[10px] font-bold text-emerald-400 font-mono">{md.receitaTotal}</p>
                      </div>
                      <div className="bg-[rgb(var(--adm-elevated))] rounded-lg p-1.5">
                        <p className="text-[8px] text-[rgb(var(--adm-muted))] uppercase">Reservas</p>
                        <p className="text-[10px] font-bold text-[rgb(var(--adm-text))] font-mono">{md.reservations.filter(r => r.source !== 'adjustment').length}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => generatePDF(apt.name)}
                      disabled={generating === apt.name}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-[rgb(var(--adm-accent))] text-[rgb(var(--adm-accent-fg))] font-semibold hover:bg-[rgb(var(--adm-accent)/0.90)] disabled:opacity-50"
                    >
                      {generating === apt.name ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      Gerar PDF
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-[rgb(var(--adm-muted))]">Sem dados para {MONTHS_FULL[selectedMonth]}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
