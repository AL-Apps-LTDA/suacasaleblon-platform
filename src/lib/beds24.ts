// ============================================
// BEDS24 API V2 — Channel Manager Integration
// Master Account model: 1 refresh token controls all sub-accounts
// Docs: https://api.beds24.com/v2/
// ============================================

const BEDS24_BASE = 'https://api.beds24.com/v2'

// --- Token Management ---
// Refresh token is permanent (if used within 30 days).
// Access token expires in 24h — we cache it in memory.
let cachedAccessToken: string | null = null
let tokenExpiresAt = 0

function getRefreshToken(): string {
  const token = process.env.BEDS24_REFRESH_TOKEN
  if (!token) throw new Error('BEDS24_REFRESH_TOKEN not configured')
  return token
}

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 5min buffer)
  if (cachedAccessToken && Date.now() < tokenExpiresAt - 5 * 60 * 1000) {
    return cachedAccessToken
  }

  const res = await fetch(`${BEDS24_BASE}/authentication/token`, {
    headers: { 'refreshToken': getRefreshToken() },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Beds24 token refresh failed (${res.status}): ${body}`)
  }

  const data = await res.json()
  cachedAccessToken = data.token
  tokenExpiresAt = Date.now() + (data.expiresIn || 86400) * 1000
  return cachedAccessToken!
}

// --- Core Fetch ---
async function beds24Fetch(path: string, options: {
  method?: string
  params?: Record<string, string>
  body?: any
} = {}) {
  const token = await getAccessToken()
  const url = new URL(`${BEDS24_BASE}${path}`)

  if (options.params) {
    Object.entries(options.params).forEach(([k, v]) => url.searchParams.set(k, v))
  }

  const res = await fetch(url.toString(), {
    method: options.method || 'GET',
    headers: {
      'token': token,
      'Content-Type': 'application/json',
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Beds24 API error ${res.status} on ${path}: ${body}`)
  }

  return res.json()
}

// --- Properties ---
export async function getProperties(filters?: { id?: string }) {
  const params: Record<string, string> = {}
  if (filters?.id) params.id = filters.id
  return beds24Fetch('/properties', { params })
}

export async function getRooms(propertyId?: string) {
  const params: Record<string, string> = {}
  if (propertyId) params.propertyId = propertyId
  return beds24Fetch('/properties/rooms', { params })
}

// --- Bookings ---
export async function getBookings(filters?: {
  arrivalFrom?: string
  arrivalTo?: string
  departureFrom?: string
  departureTo?: string
  propertyId?: string
  status?: string
}) {
  const params: Record<string, string> = {}
  if (filters) {
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params[k] = v
    })
  }
  return beds24Fetch('/bookings', { params })
}

export async function createBooking(booking: {
  propertyId: number
  roomId: number
  arrival: string
  departure: string
  guestFirstName?: string
  guestLastName?: string
  status?: string
}) {
  return beds24Fetch('/bookings', { method: 'POST', body: [booking] })
}

// --- Inventory / Availability ---
export async function getAvailability(roomId: string, from: string, to: string) {
  return beds24Fetch('/inventory/rooms/availability', {
    params: { roomId, from, to },
  })
}

export async function getCalendar(roomId: string, from: string, to: string) {
  return beds24Fetch('/inventory/rooms/calendar', {
    params: { roomId, from, to },
  })
}

// --- Accounts (for multi-tenant sub-account management) ---
export async function getAccounts() {
  return beds24Fetch('/accounts')
}

export async function createSubAccount(account: {
  name: string
  email?: string
}) {
  return beds24Fetch('/accounts', { method: 'POST', body: [account] })
}

// --- Health Check ---
export async function testConnection(): Promise<{ ok: boolean; propertyCount?: number; error?: string }> {
  try {
    const props = await getProperties()
    const count = Array.isArray(props) ? props.length : 0
    return { ok: true, propertyCount: count }
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
}
