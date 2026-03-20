// Migrated directly from Giro-Gestao-Total/server/routes.ts
// Parses Google Sheets data into structured types

import type { MonthData, Reservation, Expense, DirectReservation, BizExpense } from './types'
import { parseBRL, fmtBRL, MONTHS_SHORT, MONTHS_FULL } from './types'

function detectMonthColumns(headerRow: any[]): { col: number; month: string }[] {
  const months: { col: number; month: string }[] = []
  for (let c = 0; c < headerRow.length; c++) {
    const val = (headerRow[c] || '').toString().trim().toUpperCase()
    if (val && val.includes('/') && MONTHS_SHORT.some(m => val.startsWith(m))) {
      months.push({ col: c, month: val })
    }
  }
  return months
}

function detectColWidth(colHeaders: any[], startCol: number): { width: number; hasGuest: boolean } {
  const h3 = (colHeaders[startCol + 2] || '').toString().trim().toLowerCase()
  if (h3 === 'hóspede' || h3 === 'hospede') {
    return { width: 5, hasGuest: true }
  }
  return { width: 4, hasGuest: false }
}

export function parseReservationTab(data: any[][]): MonthData[] {
  const allMonths: MonthData[] = []
  let rowIdx = 0

  while (rowIdx < data.length) {
    const row = data[rowIdx] || []
    const monthPositions = detectMonthColumns(row)
    if (monthPositions.length === 0) { rowIdx++; continue }

    const colHeaderRow = data[rowIdx + 2] || []
    const colConfigs = monthPositions.map(mp => ({
      ...mp,
      ...detectColWidth(colHeaderRow, mp.col)
    }))

    for (const config of colConfigs) {
      const md: MonthData = {
        month: config.month,
        reservations: [],
        receitaTotal: 'R$ 0,00',
        expenses: [],
        despesaTotal: 'R$ 0,00',
        resultado: 'R$ 0,00',
        managerCommission: 'R$ 0,00',
        managerName: '',
        repassar: 'R$ 0,00',
      }

      const revenueOffset = config.hasGuest ? 3 : 2
      const guestOffset = config.hasGuest ? 2 : -1
      let inExpenses = false

      for (let r = rowIdx + 3; r < Math.min(rowIdx + 50, data.length); r++) {
        const dr = data[r] || []
        const cell1 = (dr[config.col] || '').toString().trim()

        if (cell1 === 'RECEITA TOTAL') {
          md.receitaTotal = (dr[config.col + revenueOffset] || 'R$ 0,00').toString().trim()
          continue
        }
        if (cell1 === 'DESPESAS') { inExpenses = true; continue }
        if (cell1 === 'Data') continue
        if (cell1 === 'DESPESA TOTAL') {
          md.despesaTotal = (dr[config.col + revenueOffset] || 'R$ 0,00').toString().trim()
          continue
        }
        if (cell1.startsWith('RESULTADO')) {
          md.resultado = (dr[config.col + revenueOffset] || 'R$ 0,00').toString().trim()
          continue
        }
        if (cell1.startsWith('REPASSAR')) {
          md.repassar = (dr[config.col + revenueOffset] || 'R$ 0,00').toString().trim()
          break
        }

        if (!inExpenses) {
          const checkout = (dr[config.col + 1] || '').toString().trim()
          const revenue = (dr[config.col + revenueOffset] || '').toString().trim()
          const guest = guestOffset >= 0 ? (dr[config.col + guestOffset] || '').toString().trim() : ''

          if (cell1 && checkout && revenue && revenue.startsWith('R$') &&
              !cell1.includes('RECEITA') && !cell1.includes('DESPESA')) {
            md.reservations.push({
              checkin: cell1,
              checkout,
              guest: guest || (cell1 === '-' && checkout === 'CANCEL.' ? 'CANCELAMENTO' : ''),
              revenue,
              source: 'spreadsheet',
            })
          }
        } else {
          const label = (dr[config.col + 1] || '').toString().trim()
          const val = (dr[config.col + revenueOffset] || '').toString().trim()

          if (label) {
            const isManager = label.toLowerCase().includes('diego') ||
                              label.toLowerCase().includes('comissão') ||
                              label.toLowerCase().includes('comissao')
            if (isManager && !md.managerName) {
              md.managerName = label
              md.managerCommission = val || 'R$ 0,00'
            }
            if (val && (val.startsWith('R$') || val.startsWith('-R$'))) {
              md.expenses.push({ date: cell1 || '-', label, obs: '', value: val })
            }
          }
        }
      }

      allMonths.push(md)
    }

    let nextBlock = rowIdx + 1
    while (nextBlock < data.length) {
      const nr = data[nextBlock] || []
      const mp = detectMonthColumns(nr)
      if (mp.length > 0 && nextBlock > rowIdx + 2) break
      nextBlock++
    }
    rowIdx = nextBlock
  }

  return allMonths
}

export function parseDirectReservations(data: any[][]): DirectReservation[] {
  const reservations: DirectReservation[] = []
  let inSection = false

  for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
    const row = data[rowIdx]
    const cell1 = (row[1] || '').toString().trim()
    if (cell1 === 'CONTROLE RESERVAS FORA AIRBNB / CANCELAMENTOS') {
      inSection = true
      continue
    }
    if (cell1 === 'Apto') continue
    if (inSection && cell1) {
      const checkin = (row[2] || '').toString().trim()
      const checkout = (row[3] || '').toString().trim()
      const guest = (row[4] || '').toString().trim()
      const totalValue = (row[5] || '').toString().trim()
      const paid = (row[6] || '').toString().trim()
      const obs = (row[7] || '').toString().trim()
      if (checkin && checkout && guest) {
        reservations.push({ apartment: cell1, checkin, checkout, guest, totalValue, paid, obs })
      }
    }
  }
  return reservations
}

export function parseOperacaoExpenses(data: any[][]): {
  expenses: BizExpense[]
  totalRow: BizExpense | null
  resultadoRow: Record<string, string>
} {
  const expenses: BizExpense[] = []
  let totalRow: BizExpense | null = null
  const resultadoRow: Record<string, string> = {}
  let inDespesas = false
  let inResultado = false

  for (const row of data) {
    const label = (row[1] || '').toString().trim()
    if (label === 'DESPESAS') { inDespesas = true; inResultado = false; continue }
    if (label === 'RESULTADO') { inResultado = true; inDespesas = false; continue }
    if (label === 'Mês' || label === 'CONTROLE RESERVAS FORA AIRBNB / CANCELAMENTOS') continue

    if (inDespesas && label) {
      const values: Record<string, string> = {}
      for (let i = 0; i < 12; i++) {
        const val = (row[i + 2] || '').toString().trim()
        if (val) values[MONTHS_FULL[i]] = val
      }
      const total = (row[14] || '').toString().trim()
      const average = (row[15] || '').toString().trim()
      const entry = { label, values, total, average }
      if (label === 'Total Despesas') {
        totalRow = entry
      } else {
        expenses.push(entry)
      }
    }

    if (inResultado && label === 'Resultado') {
      for (let i = 0; i < 12; i++) {
        const val = (row[i + 2] || '').toString().trim()
        if (val) resultadoRow[MONTHS_FULL[i]] = val
      }
      resultadoRow.Total = (row[14] || '').toString().trim()
    }
  }

  return { expenses, totalRow, resultadoRow }
}
