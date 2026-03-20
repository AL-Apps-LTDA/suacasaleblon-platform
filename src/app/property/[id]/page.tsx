'use client'

import { use, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Users, MessageCircle, Loader2, ChevronRight } from 'lucide-react'
import { siteConfig } from '@/lib/config'
import { fmtBRL, WHATSAPP_NUMBER } from '@/lib/types'

export default function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const searchParams = useSearchParams()
  const property = siteConfig.properties.find(p => p.code === id)

  const [checkin, setCheckin] = useState('')
  const [checkout, setCheckout] = useState('')
  const [guests, setGuests] = useState(1)
  const [quote, setQuote] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Pre-fill from search params (coming from home page search)
  useEffect(() => {
    const ci = searchParams.get('checkin')
    const co = searchParams.get('checkout')
    const g = searchParams.get('guests')
    if (ci) setCheckin(ci)
    if (co) setCheckout(co)
    if (g) setGuests(Number(g))
    // Auto-fetch quote if dates are pre-filled
    if (ci && co) {
      setTimeout(() => {
        fetchQuote(ci, co, g ? Number(g) : 1)
      }, 300)
    }
  }, [searchParams])

  async function fetchQuote(ci?: string, co?: string, g?: number) {
    const useCheckin = ci || checkin
    const useCheckout = co || checkout
    const useGuests = g || guests
    if (!useCheckin || !useCheckout) return

    setLoading(true)
    setError('')
    setQuote(null)
    try {
      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyCode: id, checkin: useCheckin, checkout: useCheckout, guests: useGuests }),
      })
      const data = await res.json()
      if (!data.ok && data.message) {
        setError(data.message)
      } else {
        setQuote(data)
      }
    } catch {
      setError('Erro ao calcular cotação.')
    } finally {
      setLoading(false)
    }
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-display">Imóvel não encontrado</p>
          <Link href="/" className="text-gold text-sm mt-2 inline-block">Voltar</Link>
        </div>
      </div>
    )
  }

  const discountPct = Math.round(siteConfig.pricing.discount_pct * 100)

  const whatsappMsg = quote
    ? `Olá! Quero reservar o ${property.title} de ${checkin} a ${checkout} para ${guests} hóspede(s). Total: ${fmtBRL(quote.grandTotal)}`
    : `Olá! Tenho interesse no ${property.title}.`

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="sticky top-0 z-50 bg-[var(--color-bg)]/90 backdrop-blur-md border-b border-[var(--color-border)]">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/" className="text-[var(--color-text-secondary)] hover:text-gold transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="font-display text-lg text-[var(--color-text)]">{property.title}</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Property info - left */}
          <div className="md:col-span-3 space-y-6">
            {/* Image placeholder */}
            <div className="aspect-[16/10] rounded-2xl bg-brand-100 relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-brand-400 text-sm">Fotos do imóvel</span>
              </div>
            </div>

            <div>
              <h1 className="font-display text-2xl text-[var(--color-text)]">{property.title}</h1>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">{property.subtitle}</p>
              <div className="flex items-center gap-3 mt-3">
                <div className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
                  <MapPin className="h-3.5 w-3.5" />
                  Leblon, Rio de Janeiro
                </div>
                <div className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
                  <Users className="h-3.5 w-3.5" />
                  Até {property.max_guests} hóspedes
                </div>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/20 rounded-full px-4 py-2">
              <span className="text-xs font-semibold text-gold">{discountPct}% mais barato que Airbnb — reserva direta</span>
            </div>
          </div>

          {/* Booking widget - right */}
          <div className="md:col-span-2">
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 sticky top-24">
              <h3 className="font-display text-lg text-[var(--color-text)] mb-4">Reserve direto</h3>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-[var(--color-text-secondary)] block mb-1">Check-in</label>
                  <input
                    type="date"
                    value={checkin}
                    onChange={e => setCheckin(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                    className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-sm bg-[var(--color-bg)] text-[var(--color-text)]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--color-text-secondary)] block mb-1">Check-out</label>
                  <input
                    type="date"
                    value={checkout}
                    onChange={e => setCheckout(e.target.value)}
                    min={checkin || new Date().toISOString().slice(0, 10)}
                    className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-sm bg-[var(--color-bg)] text-[var(--color-text)]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--color-text-secondary)] block mb-1">Hóspedes</label>
                  <select
                    value={guests}
                    onChange={e => setGuests(Number(e.target.value))}
                    className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-sm bg-[var(--color-bg)] text-[var(--color-text)]"
                  >
                    {Array.from({ length: property.max_guests }, (_, i) => i + 1).map(n => (
                      <option key={n} value={n}>{n} hóspede{n > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => fetchQuote()}
                  disabled={!checkin || !checkout || loading}
                  className="w-full bg-gold text-gold-foreground py-3 rounded-xl font-semibold text-sm hover:bg-gold-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {loading ? 'Calculando...' : 'Ver preço'}
                </button>

                {error && (
                  <p className="text-xs text-red-500 text-center">{error}</p>
                )}

                {quote && (
                  <div className="mt-3 space-y-2 pt-3 border-t border-[var(--color-border)]">
                    <div className="flex justify-between text-xs text-[var(--color-text-secondary)]">
                      <span>{quote.nights} noites</span>
                      <span className="font-mono">{fmtBRL(quote.dailyTotal)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-[var(--color-text-secondary)]">
                      <span>Taxa de limpeza</span>
                      <span className="font-mono">{fmtBRL(quote.cleaningFee)}</span>
                    </div>
                    {quote.extrasTotal > 0 && (
                      <div className="flex justify-between text-xs text-[var(--color-text-secondary)]">
                        <span>Hóspedes extras</span>
                        <span className="font-mono">{fmtBRL(quote.extrasTotal)}</span>
                      </div>
                    )}
                    {quote.savings > 0 && (
                      <div className="flex justify-between text-xs text-green-600">
                        <span>Economia vs Airbnb</span>
                        <span className="font-mono font-semibold">-{fmtBRL(quote.savings)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold text-[var(--color-text)] pt-2 border-t border-[var(--color-border)]">
                      <span>Total</span>
                      <span className="font-mono text-gold">{fmtBRL(quote.grandTotal)}</span>
                    </div>

                    <a
                      href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMsg)}`}
                      target="_blank"
                      rel="noopener"
                      className="flex items-center justify-center gap-2 w-full bg-green-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors mt-2"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Reservar via WhatsApp
                    </a>

                    <p className="text-[10px] text-[var(--color-text-secondary)] text-center mt-1">
                      Pagamento via Pix com {discountPct}% de desconto
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
