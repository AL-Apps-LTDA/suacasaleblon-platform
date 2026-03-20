'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MapPin, Users, ChevronRight, MessageCircle, Shield, Star, Percent, Loader2, Search, Calendar } from 'lucide-react'
import { siteConfig } from '@/lib/config'
import { fmtBRL, WHATSAPP_NUMBER } from '@/lib/types'
import type { Property } from '@/lib/types'

interface AvailableResult {
  property: Property
  quote: {
    nights: number
    dailyTotal: number
    cleaningFee: number
    extrasTotal: number
    grandTotal: number
    savings: number
    mode: string
  }
}

export default function Home() {
  const { properties, brand, pricing } = siteConfig
  const discountPct = Math.round(pricing.discount_pct * 100)

  const [checkin, setCheckin] = useState('')
  const [checkout, setCheckout] = useState('')
  const [guests, setGuests] = useState(2)
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<AvailableResult[] | null>(null)
  const [searchError, setSearchError] = useState('')

  const today = new Date().toISOString().slice(0, 10)

  async function handleSearch() {
    if (!checkin || !checkout) return
    setSearching(true)
    setResults(null)
    setSearchError('')

    try {
      const eligible = properties.filter(p => p.max_guests >= guests)
      const available: AvailableResult[] = []

      for (const property of eligible) {
        try {
          const availRes = await fetch(`/api/availability/${property.code}`)
          const availData = await availRes.json()
          const blockedDates = new Set(availData.blockedDates || [])

          const start = new Date(`${checkin}T00:00:00`)
          const end = new Date(`${checkout}T00:00:00`)
          let isBlocked = false
          const cursor = new Date(start)
          while (cursor < end) {
            if (blockedDates.has(cursor.toISOString().slice(0, 10))) {
              isBlocked = true
              break
            }
            cursor.setDate(cursor.getDate() + 1)
          }
          if (isBlocked) continue

          const quoteRes = await fetch('/api/quote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ propertyCode: property.code, checkin, checkout, guests }),
          })
          const quoteData = await quoteRes.json()
          if (quoteData.ok !== false) {
            available.push({ property, quote: quoteData })
          }
        } catch { /* skip */ }
      }

      if (available.length === 0) {
        setSearchError('Nenhum imóvel disponível para essas datas. Tente outras datas ou entre em contato pelo WhatsApp.')
      }
      available.sort((a, b) => a.quote.grandTotal - b.quote.grandTotal)
      setResults(available)
    } catch {
      setSearchError('Erro ao buscar disponibilidade. Tente novamente.')
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--color-bg)]/90 backdrop-blur-md border-b border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gold flex items-center justify-center">
              <span className="text-white font-display text-sm font-bold">SC</span>
            </div>
            <span className="font-display text-lg text-[var(--color-text)]">{brand.name}</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-[var(--color-text-secondary)]">
            <Link href="/proprietarios" className="hover:text-gold transition-colors">Proprietários</Link>
            <a href={`https://wa.me/${brand.whatsapp}?text=Olá! Quero reservar no Leblon.`} target="_blank" rel="noopener" className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-full text-xs font-semibold hover:bg-green-700 transition-colors">
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </a>
          </nav>
        </div>
      </header>

      {/* Hero + Search */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-100/50 to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 pt-12 pb-8 md:pt-20 md:pb-12 relative">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/20 rounded-full px-4 py-1.5 mb-5 animate-fade-in">
              <Percent className="h-3.5 w-3.5 text-gold" />
              <span className="text-xs font-semibold text-gold">{discountPct}% mais barato que Airbnb — reserve direto</span>
            </div>
            <h1 className="font-display text-3xl md:text-5xl text-[var(--color-text)] leading-tight animate-fade-in animate-fade-in-delay-1">
              Sua casa no <span className="text-gold">Leblon</span>
            </h1>
            <p className="mt-4 text-base text-[var(--color-text-secondary)] max-w-lg mx-auto animate-fade-in animate-fade-in-delay-2">
              Escolha suas datas e veja quais apartamentos estão disponíveis. Pagamento direto via Pix.
            </p>
          </div>

          {/* Search box */}
          <div className="max-w-3xl mx-auto mt-8 animate-fade-in animate-fade-in-delay-3">
            <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-lg p-4 md:p-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wider font-semibold block mb-1.5">Check-in</label>
                  <input type="date" value={checkin} onChange={e => { setCheckin(e.target.value); setResults(null) }} min={today} className="w-full border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-sm bg-[var(--color-bg)] text-[var(--color-text)] focus:border-gold focus:ring-1 focus:ring-gold/30 transition-all" />
                </div>
                <div>
                  <label className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wider font-semibold block mb-1.5">Check-out</label>
                  <input type="date" value={checkout} onChange={e => { setCheckout(e.target.value); setResults(null) }} min={checkin || today} className="w-full border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-sm bg-[var(--color-bg)] text-[var(--color-text)] focus:border-gold focus:ring-1 focus:ring-gold/30 transition-all" />
                </div>
                <div>
                  <label className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wider font-semibold block mb-1.5">Hóspedes</label>
                  <select value={guests} onChange={e => { setGuests(Number(e.target.value)); setResults(null) }} className="w-full border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-sm bg-[var(--color-bg)] text-[var(--color-text)] focus:border-gold focus:ring-1 focus:ring-gold/30 transition-all">
                    {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} hóspede{n > 1 ? 's' : ''}</option>)}
                  </select>
                </div>
                <div className="flex items-end">
                  <button onClick={handleSearch} disabled={!checkin || !checkout || searching} className="w-full bg-gold text-gold-foreground py-2.5 rounded-xl font-semibold text-sm hover:bg-gold-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    {searching ? 'Buscando...' : 'Buscar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search results */}
      {results !== null && (
        <section className="max-w-6xl mx-auto px-4 pb-12">
          {searchError && (
            <div className="max-w-3xl mx-auto text-center py-8">
              <Calendar className="h-10 w-10 text-[var(--color-border)] mx-auto mb-3" />
              <p className="text-sm text-[var(--color-text-secondary)]">{searchError}</p>
              <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=Olá! Quero reservar de ${checkin} a ${checkout} para ${guests} hóspede(s). Tem disponibilidade?`} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 mt-4 text-green-600 text-sm font-semibold hover:text-green-700">
                <MessageCircle className="h-4 w-4" /> Consultar via WhatsApp
              </a>
            </div>
          )}
          {results.length > 0 && (
            <div>
              <h2 className="font-display text-xl text-[var(--color-text)] mb-1 text-center">{results.length} {results.length === 1 ? 'imóvel disponível' : 'imóveis disponíveis'}</h2>
              <p className="text-xs text-[var(--color-text-secondary)] text-center mb-6">{checkin} → {checkout} • {guests} hóspede{guests > 1 ? 's' : ''}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl mx-auto">
                {results.map(({ property, quote }) => (
                  <Link key={property.code} href={`/property/${property.code}?checkin=${checkin}&checkout=${checkout}&guests=${guests}`} className="group bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)]/60 overflow-hidden hover:border-gold/30 hover:shadow-lg hover:shadow-gold/5 transition-all duration-300">
                    <div className="aspect-[4/3] bg-brand-100 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                      <div className="absolute bottom-3 left-3 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-white/90" /><span className="text-xs text-white/90 font-medium">Leblon</span></div>
                      <div className="absolute top-3 right-3 bg-gold text-gold-foreground text-xs font-bold px-3 py-1.5 rounded-lg">{fmtBRL(quote.grandTotal)}</div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-display text-lg text-[var(--color-text)] group-hover:text-gold transition-colors">{property.title}</h3>
                        <ChevronRight className="h-4 w-4 text-[var(--color-text-secondary)] group-hover:text-gold transition-colors" />
                      </div>
                      <p className="text-xs text-[var(--color-text-secondary)] mt-1">{property.subtitle}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]"><Users className="h-3.5 w-3.5" /> Até {property.max_guests}</div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-gold font-mono">{fmtBRL(quote.grandTotal)}</span>
                          <span className="text-[10px] text-[var(--color-text-secondary)] block">{quote.nights} noite{quote.nights > 1 ? 's' : ''} total</span>
                        </div>
                      </div>
                      {quote.savings > 0 && (
                        <div className="mt-2 bg-green-50 rounded-lg px-3 py-1.5 text-center">
                          <span className="text-[10px] text-green-700 font-semibold">Economia de {fmtBRL(quote.savings)} vs Airbnb</span>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Trust + all properties when no search */}
      {results === null && (
        <section className="max-w-6xl mx-auto px-4 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Shield, title: 'Gestão Completa', desc: 'Check-in, limpeza e manutenção profissional' },
              { icon: Star, title: 'Superhost Airbnb', desc: 'Avaliação média acima de 4.8 estrelas' },
              { icon: Percent, title: 'Melhor Preço Direto', desc: `${discountPct}% menor que Airbnb e Booking` },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3 p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]/60">
                <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center shrink-0"><Icon className="h-5 w-5 text-gold" /></div>
                <div><h3 className="text-sm font-semibold text-[var(--color-text)]">{title}</h3><p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{desc}</p></div>
              </div>
            ))}
          </div>
          <div className="mt-12">
            <h2 className="font-display text-2xl text-[var(--color-text)] mb-2">Nossos imóveis</h2>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">Escolha suas datas acima para ver preços e disponibilidade</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {properties.map(property => (
                <Link key={property.code} href={`/property/${property.code}`} className="group bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)]/60 overflow-hidden hover:border-gold/30 hover:shadow-lg hover:shadow-gold/5 transition-all duration-300">
                  <div className="aspect-[4/3] bg-brand-100 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    <div className="absolute bottom-3 left-3 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-white/90" /><span className="text-xs text-white/90 font-medium">Leblon, Rio de Janeiro</span></div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-display text-lg text-[var(--color-text)] group-hover:text-gold transition-colors">{property.title}</h3>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">{property.subtitle}</p>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]"><Users className="h-3.5 w-3.5" /> Até {property.max_guests}</div>
                      <span className="text-xs text-gold font-semibold">{discountPct}% OFF direto</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA proprietários */}
      <section className="bg-[var(--color-text)] text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-20">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl md:text-4xl">Tem um imóvel no <span className="text-gold">Leblon</span>?</h2>
            <p className="mt-4 text-brand-300 leading-relaxed">Gestão completa — do anúncio ao check-out. Seu imóvel rende mais mesmo pagando nossa comissão.</p>
            <Link href="/proprietarios" className="inline-flex items-center gap-2 mt-6 bg-gold text-gold-foreground px-6 py-3 rounded-xl font-semibold text-sm hover:bg-gold-dark transition-colors">Simule sua receita <ChevronRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--color-surface)] border-t border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2"><div className="w-6 h-6 rounded bg-gold flex items-center justify-center"><span className="text-white text-[10px] font-bold">SC</span></div><span className="font-display text-sm text-[var(--color-text)]">{brand.name}</span></div>
            <p className="text-xs text-[var(--color-text-secondary)]">© {new Date().getFullYear()} AL Gestão — Temporada.</p>
            <a href={`https://wa.me/${brand.whatsapp}`} target="_blank" rel="noopener" className="text-xs text-green-600 font-medium hover:text-green-700">WhatsApp: +55 21 99536-0322</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
