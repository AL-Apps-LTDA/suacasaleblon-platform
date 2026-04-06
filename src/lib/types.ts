// ============================================
// UNIFIED TYPES — Sua Casa Leblon Platform
// Consolidated from: Giro, Diego, Leblon, Limpezas
// ============================================

// --- PROPERTIES ---
export interface Property {
  code: string
  title: string
  subtitle: string
  max_guests: number
  base_guests: number
  extra_per_guest_per_night: number
  cleaning_fee?: number // per-apartment cleaning fee; falls back to DEFAULTS.cleaning_fee
  docs_required: boolean
  demo_beyond_nightly: number
  images: string[]
  hospitable_id?: string
}

export const PROPERTY_HOSPITABLE_MAP: Record<string, string> = {
  '103': '2bf9fa5a-0c40-4d79-9905-99d83b6ba5c2',
  '403': 'e438f8b5-095a-45b8-b2b7-adf9c21bceb7',
  '102': '23e27636-efcf-4a02-84c2-90a26f03c723',
  '303': '7eba4fb5-0a14-40b9-b510-0588fe5a9247',
  'BZ02': '51948efe-5925-4e6a-ac2c-f4079986b0c4',
  '334A': 'b389a395-63ce-453f-8b24-f35654262d45',
}

export const APARTMENTS = ['103', '102', '403', '303', '334A', 'BZ02'] as const
export const LEBLON_APARTMENTS = ['103', '102', '403', '303', '334A'] as const
export type ApartmentCode = typeof APARTMENTS[number]

export const DEFAULTS = { cleaning_fee: 150, commission_pct: 0.15 } as const

// --- RESERVATIONS (from Giro + Leblon) ---
export interface Reservation {
  checkin: string
  checkout: string
  guest: string
  revenue: string
  source?: string
  guestOrigin?: string
}

export interface DirectReservation {
  id?: string
  apartment: string
  guest: string
  checkin: string
  checkout: string
  totalValue: string
  paid: string
  obs: string
  syncedToSheet?: boolean
}

// --- MONTHLY FINANCIALS (from Giro) ---
export interface Expense {
  date: string
  label: string
  obs: string
  value: string
}

export interface MonthData {
  month: string
  reservations: Reservation[]
  receitaTotal: string
  expenses: Expense[]
  despesaTotal: string
  resultado: string
  managerCommission: string
  managerName: string
  repassar: string
}

export interface ApartmentSummary {
  name: string
  hospitableId?: string
  months: MonthData[]
  directReservations: DirectReservation[]
  error?: string
}

// --- BUSINESS EXPENSES (from Giro) ---
export interface BizExpense {
  label: string
  values: Record<string, string>
  total: string
  average: string
}

// --- CLEANINGS (from Limpezas) ---
export interface Cleaning {
  id: string
  apartmentCode: string
  cleaningDate: string
  arrivalDate?: string
  guestCount?: number
  observations?: string
  sortOrder: number
  completed: boolean
  photos: string[]
  cleanerId?: string
  cleaningCost?: string
  source: string
  manuallyEdited: boolean
}

// --- CONTACTS (from Limpezas) ---
export interface Contact {
  id: string
  name: string
  phone?: string
  role: string
  category: string
  notes?: string
}

// --- MAINTENANCE (from Limpezas) ---
export interface MaintenanceItem {
  id: string
  title: string
  description?: string
  frequencyDays: number
  apartmentCode?: string
  urgency: string
  photos: string[]
  lastDoneAt?: string
}

// --- REPORTS / ISSUES (from Limpezas) ---
export interface Report {
  id: string
  apartmentCode: string
  title: string
  description: string
  urgency: string
  status: string
  reportedBy: string
  mediaUrls: string[]
}

// --- HOSPITABLE (from Giro) ---
export interface HospitableReservation {
  id: string
  platform: string
  status: string
  arrivalDate: string
  departureDate: string
  guestName: string
  guestPhone: string
  guestCountry: string
  nights: number
  guests: number
  propertyUuid: string
  apartmentName: string
  payout: number
  hostServiceFee: number
  cleaningFee: number
  totalPrice: number
  currency: string
  adjustments: { amount: number; label: string }[]
}

export interface ProRataEntry {
  monthIdx: number
  checkinDay: number
  checkoutDay: number
  nights: number
  revenue: number
  guestName: string
  guestCountry: string
  isPartial: boolean
  adjustments: { amount: number; label: string }[]
}

// --- QUOTE / BOOKING (from Leblon) ---
export interface QuoteRequest {
  propertyCode: string
  checkin: string
  checkout: string
  guests: number
}

export interface QuoteResponse {
  propertyCode: string
  nights: number
  dailyTotal: number
  cleaningFee: number
  extrasTotal: number
  grandTotal: number
  savings: number
  note: string
  mode: 'live' | 'demo'
}

// --- CONFIG ---
export interface AppConfig {
  brand: { name: string; whatsapp: string }
  pricing: { discount_pct: number; cleaning_fee: number }
  rules: {
    min_nights_default: number
    min_nights_fri_sat: number
    max_checkout_date?: string
    overrides: { start: string; end: string; min_nights: number }[]
  }
  properties: Property[]
}

// --- PDF REPORT (from Diego) ---
export interface PropertyReport {
  property: Property
  month: string
  year: number
  bookings: { checkIn: string; checkOut: string; guestName: string; origin: string; value: number }[]
  expenses: { date: string; description: string; obs: string; value: number }[]
  totalRevenue: number
  totalExpenses: number
  commission: number
  netResult: number
}

// --- DASHBOARD METRICS ---
export interface DashboardMetrics {
  monthlyRevenue: number
  monthlyExpenses: number
  monthlyCommission: number
  monthlyResult: number
  ytdRevenue: number
  ytdExpenses: number
  occupancyRate: number
  adr: number
  revPar: number
}

// --- CONSTANTS ---
export const MONTHS_SHORT = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']
export const MONTHS_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export const WHATSAPP_NUMBER = '5521995360322'
export const PIX_KEY = '10007700792'

// --- HELPERS ---
export function parseBRL(val: string): number {
  if (!val || val === '#DIV/0!' || val === '-') return 0
  return parseFloat(val.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0
}

export function fmtBRL(val: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

export function getMonthIndex(monthStr: string): number {
  const upper = monthStr.toUpperCase()
  return MONTHS_SHORT.findIndex(m => upper.startsWith(m))
}
