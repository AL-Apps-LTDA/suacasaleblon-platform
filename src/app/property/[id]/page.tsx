'use client'

import { use, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Users, MessageCircle, Loader2, Tag, ChevronLeft, ChevronRight, CreditCard, QrCode } from 'lucide-react'
import { siteConfig } from '@/lib/config'
import { fmtBRL, WHATSAPP_NUMBER } from '@/lib/types'

function ImageCarousel({ images, title }: { images: string[]; title: string }) {
  const [idx, setIdx] = useState(0)
  const [touchStart, setTouchStart] = useState(0)
  const imgs = images.length > 0 ? images : []
  if (imgs.length === 0) return <div className="aspect-[16/10] rounded-2xl bg-brand-100 flex items-center justify-center"><span className="text-brand-400 text-sm">Fotos do imóvel</span></div>

  return (
    <div className="relative aspect-[16/10] rounded-2xl overflow-hidden group"
      onTouchStart={e => setTouchStart(e.touches[0].clientX)}
      onTouchEnd={e => { const diff = touchStart - e.changedTouches[0].clientX; if (Math.abs(diff) > 50) { if (diff > 0) setIdx(i => (i + 1) % imgs.length); else setIdx(i => (i - 1 + imgs.length) % imgs.length) } }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imgs[idx]} alt={`${title} - foto ${idx + 1}`} className="w-full h-full object-cover transition-opacity duration-300" loading={idx === 0 ? 'eager' : 'lazy'} />
      {imgs.length > 1 && (<>
        <button onClick={() => setIdx(i => (i - 1 + imgs.length) % imgs.length)}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity hover:bg-black/60">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button onClick={() => setIdx(i => (i + 1) % imgs.length)}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity hover:bg-black/60">
          <ChevronRight className="h-5 w-5" />
        </button>
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {imgs.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className={`w-2 h-2 rounded-full transition-all ${i === idx ? 'bg-white w-5' : 'bg-white/50 hover:bg-white/70'}`} />
          ))}
        </div>
        <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-1 rounded-full">
          {idx + 1}/{imgs.length}
        </div>
      </>)}
    </div>
  )
}

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
  const [couponCode, setCouponCode] = useState('')
  const [couponResult, setCouponResult] = useState<any>(null)
  const [couponError, setCouponError] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [checkoutLoading, setCheckoutLoading] = useState<'pix' | 'card' | null>(null)
  const [showGuestForm, setShowGuestForm] = useState(false)

  useEffect(() => {
    const ci = searchParams.get('checkin')
    const co = searchParams.get('checkout')
    const g = searchParams.get('guests')
    if (ci) setCheckin(ci)
    if (co) setCheckout(co)
    if (g) setGuests(Number(g))
    if (ci && co) setTimeout(() => fetchQuote(ci, co, g ? Number(g) : 1), 300)
  }, [searchParams])

  async function fetchQuote(ci?: string, co?: string, g?: number) {
    const useCheckin = ci || checkin, useCheckout = co || checkout, useGuests = g || guests
    if (!useCheckin || !useCheckout) return
    setLoading(true); setError(''); setQuote(null)
    try {
      const res = await fetch('/api/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ propertyCode: id, checkin: useCheckin, checkout: useCheckout, guests: useGuests }) })
      const data = await res.json()
      if (!data.ok && data.message) setError(data.message)
      else setQuote(data)
    } catch { setError('Erro ao calcular cotação.') }
    finally { setLoading(false) }
  }

  if (!property) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center"><p className="text-lg font-display">Imóvel não encontrado</p><Link href="/" className="text-gold text-sm mt-2 inline-block">Voltar</Link></div>
    </div>
  )

  const discountPct = Math.round(siteConfig.pricing.discount_pct * 100)

  async function validateCoupon() {
    if (!couponCode.trim() || !quote) return
    setCouponLoading(true); setCouponError(''); setCouponResult(null)
    try {
      const res = await fetch('/api/coupon/validate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: couponCode.trim(), grandTotal: quote.grandTotal }) })
      const data = await res.json()
      if (!data.ok) setCouponError(data.message)
      else setCouponResult(data)
    } catch { setCouponError('Erro ao validar cupom.') }
    finally { setCouponLoading(false) }
  }

  async function startCheckout(method: 'pix' | 'card') {
    if (!guestName.trim() || !guestEmail.trim()) return
    setCheckoutLoading(method)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyCode: id,
          checkin, checkout, guests,
          guestName: guestName.trim(),
          guestEmail: guestEmail.trim(),
          guestPhone: guestPhone.trim(),
          grandTotal: quote.grandTotal,
          couponCode: couponResult?.coupon?.code || null,
          couponDiscount: couponResult?.coupon?.discount_amount || 0,
          paymentMethod: method,
        }),
      })
      const data = await res.json()
      if (data.ok && data.url) {
        window.location.href = data.url
      } else {
        alert(data.message || 'Erro ao iniciar pagamento.')
      }
    } catch { alert('Erro de conexão. Tente novamente.') }
    finally { setCheckoutLoading(null) }
  }

  const guestFormValid = guestName.trim().length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)

  const finalTotal = couponResult ? couponResult.newTotal : quote?.grandTotal
  const couponDiscount = couponResult?.coupon?.discount_amount || 0

  const whatsappMsg = quote
    ? `Olá! Quero reservar o ${property.title} de ${checkin} a ${checkout} para ${guests} hóspede(s). Total: ${fmtBRL(finalTotal)}${couponResult ? ` (cupom ${couponResult.coupon.code} aplicado: -${fmtBRL(couponDiscount)})` : ''}`
    : `Olá! Tenho interesse no ${property.title}.`

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="sticky top-0 z-50 bg-[var(--color-bg)]/90 backdrop-blur-md border-b border-[var(--color-border)]">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/" className="text-[var(--color-text-secondary)] hover:text-gold transition-colors"><ArrowLeft className="h-5 w-5" /></Link>
          <span className="font-display text-lg text-[var(--color-text)]">{property.title}</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Property info */}
          <div className="md:col-span-3 space-y-6">
            <ImageCarousel images={property.images} title={property.title} />

            <div>
              <h1 className="font-display text-2xl text-[var(--color-text)]">{property.title}</h1>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">{property.subtitle}</p>
              <div className="flex items-center gap-3 mt-3">
                <div className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]"><MapPin className="h-3.5 w-3.5" />Leblon, Rio de Janeiro</div>
                <div className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]"><Users className="h-3.5 w-3.5" />Até {property.max_guests} hóspedes</div>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/20 rounded-full px-4 py-2">
              <span className="text-xs font-semibold text-gold">{discountPct}% mais barato que Airbnb — reserva direta</span>
            </div>
          </div>

          {/* Booking widget */}
          <div className="md:col-span-2">
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 sticky top-24">
              <h3 className="font-display text-lg text-[var(--color-text)] mb-4">Reserve direto</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-[var(--color-text-secondary)] block mb-1">Check-in</label>
                  <input type="date" value={checkin} onChange={e => setCheckin(e.target.value)} min={new Date().toISOString().slice(0, 10)}
                    className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-sm bg-[var(--color-bg)] text-[var(--color-text)]" />
                </div>
                <div>
                  <label className="text-xs text-[var(--color-text-secondary)] block mb-1">Check-out</label>
                  <input type="date" value={checkout} onChange={e => setCheckout(e.target.value)} min={checkin || new Date().toISOString().slice(0, 10)}
                    className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-sm bg-[var(--color-bg)] text-[var(--color-text)]" />
                </div>
                <div>
                  <label className="text-xs text-[var(--color-text-secondary)] block mb-1">Hóspedes</label>
                  <select value={guests} onChange={e => setGuests(Number(e.target.value))}
                    className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-sm bg-[var(--color-bg)] text-[var(--color-text)]">
                    {Array.from({ length: property.max_guests }, (_, i) => i + 1).map(n => (
                      <option key={n} value={n}>{n} hóspede{n > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>

                <button onClick={() => fetchQuote()} disabled={!checkin || !checkout || loading}
                  className="w-full bg-gold text-gold-foreground py-3 rounded-xl font-semibold text-sm hover:bg-gold-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {loading ? 'Calculando...' : 'Ver preço'}
                </button>

                {error && <p className="text-xs text-red-500 text-center">{error}</p>}

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
                    {couponDiscount > 0 && (
                      <div className="flex justify-between text-xs text-green-600">
                        <span>Desconto cupom</span>
                        <span className="font-mono font-semibold">-{fmtBRL(couponDiscount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold text-[var(--color-text)] pt-2 border-t border-[var(--color-border)]">
                      <span>Valor Final</span>
                      <span className="font-mono text-gold text-base">{fmtBRL(finalTotal)}</span>
                    </div>

                    {/* Coupon field */}
                    <div className="pt-2">
                      <label className="text-xs text-[var(--color-text-secondary)] block mb-1">Tem cupom de desconto?</label>
                      <div className="flex gap-1.5">
                        <div className="relative flex-1">
                          <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-text-secondary)]" />
                          <input type="text" value={couponCode}
                            onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); setCouponResult(null) }}
                            placeholder="Código do cupom"
                            className="w-full border border-[var(--color-border)] rounded-lg pl-8 pr-3 py-2 text-sm bg-[var(--color-bg)] text-[var(--color-text)] font-mono" />
                        </div>
                        <button onClick={validateCoupon} disabled={!couponCode.trim() || couponLoading}
                          className="bg-[var(--color-text)] text-[var(--color-bg)] px-3 py-2 rounded-lg text-xs font-semibold hover:opacity-90 disabled:opacity-40 shrink-0">
                          {couponLoading ? '...' : 'Aplicar'}
                        </button>
                      </div>
                      {couponError && <p className="text-[10px] text-red-500 mt-1">{couponError}</p>}
                      {couponResult && (
                        <div className="flex justify-between items-center text-xs text-green-600 mt-1.5 bg-green-50 dark:bg-green-900/10 px-2 py-1.5 rounded-lg">
                          <span>Cupom {couponResult.coupon.code} aplicado!</span>
                          <span className="font-mono font-semibold">-{fmtBRL(couponDiscount)}</span>
                        </div>
                      )}
                    </div>

                    {/* Guest info + Payment */}
                    {!showGuestForm ? (
                      <button onClick={() => setShowGuestForm(true)}
                        className="w-full bg-gold text-gold-foreground py-3 rounded-xl font-semibold text-sm hover:bg-gold-dark transition-colors mt-2">
                        Reservar agora
                      </button>
                    ) : (
                      <div className="space-y-2 mt-3 pt-3 border-t border-[var(--color-border)]">
                        <p className="text-xs font-semibold text-[var(--color-text)]">Seus dados</p>
                        <input type="text" value={guestName} onChange={e => setGuestName(e.target.value)}
                          placeholder="Nome completo *"
                          className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm bg-[var(--color-bg)] text-[var(--color-text)]" />
                        <input type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)}
                          placeholder="Email *"
                          className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm bg-[var(--color-bg)] text-[var(--color-text)]" />
                        <input type="tel" value={guestPhone} onChange={e => setGuestPhone(e.target.value)}
                          placeholder="WhatsApp (opcional)"
                          className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm bg-[var(--color-bg)] text-[var(--color-text)]" />

                        {/* PIX Button */}
                        <button onClick={() => startCheckout('pix')} disabled={!guestFormValid || !!checkoutLoading}
                          className="flex items-center justify-center gap-2 w-full bg-[#00A868] text-white py-3 rounded-xl font-semibold text-sm hover:bg-[#008F58] transition-colors disabled:opacity-50">
                          {checkoutLoading === 'pix' ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                          Pagar com PIX
                        </button>

                        {/* Card Button */}
                        <button onClick={() => startCheckout('card')} disabled={!guestFormValid || !!checkoutLoading}
                          className="flex items-center justify-center gap-2 w-full bg-[var(--color-text)] text-[var(--color-bg)] py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
                          {checkoutLoading === 'card' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                          Pagar com Cartão
                        </button>

                        <div className="flex items-center gap-2 my-1">
                          <div className="flex-1 h-px bg-[var(--color-border)]" />
                          <span className="text-[10px] text-[var(--color-text-secondary)]">ou</span>
                          <div className="flex-1 h-px bg-[var(--color-border)]" />
                        </div>

                        {/* WhatsApp fallback */}
                        <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMsg)}`} target="_blank" rel="noopener"
                          className="flex items-center justify-center gap-2 w-full border border-green-600 text-green-700 py-2.5 rounded-xl font-semibold text-xs hover:bg-green-50 transition-colors">
                          <MessageCircle className="h-3.5 w-3.5" /> Reservar via WhatsApp
                        </a>

                        <p className="text-[10px] text-[var(--color-text-secondary)] text-center">
                          🔒 Pagamento seguro via Stripe
                        </p>
                      </div>
                    )}
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
