'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Users, ChevronRight, MessageCircle, Loader2, Search, Calendar, Building2, ArrowRight } from 'lucide-react'
import { siteConfig } from '@/lib/config'
import { fmtBRL, WHATSAPP_NUMBER } from '@/lib/types'
import type { Property } from '@/lib/types'

interface AvailableResult {
  property: Property
  quote: { nights: number; dailyTotal: number; cleaningFee: number; extrasTotal: number; grandTotal: number; savings: number; mode: string }
}

export default function Home() {
  const { properties, brand, pricing } = siteConfig
  const [checkin, setCheckin] = useState('')
  const [checkout, setCheckout] = useState('')
  const [guests, setGuests] = useState(2)
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<AvailableResult[] | null>(null)
  const [searchError, setSearchError] = useState('')
  const [activeTab, setActiveTab] = useState<'reservar' | 'imovel'>('reservar')
  const today = new Date().toLocaleDateString('sv-SE')
  const carouselRef = useRef<HTMLDivElement>(null)

  const checkinRef = useRef<HTMLInputElement>(null)
  const checkoutRef = useRef<HTMLInputElement>(null)

  function openDatePicker(ref: React.RefObject<HTMLInputElement | null>) {
    if (ref.current) {
      ref.current.showPicker?.()
      ref.current.focus()
    }
  }

  async function handleSearch() {
    if (!checkin || !checkout) return
    setSearching(true); setResults(null); setSearchError('')
    try {
      const eligible = properties.filter(p => p.max_guests >= guests)
      const available: AvailableResult[] = []
      for (const property of eligible) {
        try {
          const availRes = await fetch(`/api/availability/${property.code}`)
          const availData = await availRes.json()
          const blockedDates = new Set(availData.blockedDates || [])
          const start = new Date(`${checkin}T00:00:00`), end = new Date(`${checkout}T00:00:00`)
          let isBlocked = false
          const cursor = new Date(start)
          while (cursor < end) { const cds = `${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,'0')}-${String(cursor.getDate()).padStart(2,'0')}`; if (blockedDates.has(cds)) { isBlocked = true; break }; cursor.setDate(cursor.getDate() + 1) }
          if (isBlocked) continue
          const quoteRes = await fetch('/api/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ propertyCode: property.code, checkin, checkout, guests }) })
          const quoteData = await quoteRes.json()
          if (quoteData.ok !== false) available.push({ property, quote: quoteData })
        } catch {}
      }
      if (available.length === 0) setSearchError('Nenhum apartamento disponível para essas datas. Tente outras datas ou entre em contato pelo WhatsApp.')
      available.sort((a, b) => a.quote.grandTotal - b.quote.grandTotal)
      setResults(available)
    } catch { setSearchError('Erro ao buscar disponibilidade. Tente novamente.') }
    finally { setSearching(false) }
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      {/* ─── HEADER ─── */}
      <header className="sticky top-0 z-50 bg-[#F5F0E8]/95 backdrop-blur-md border-b border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/images/logo.png" alt="Sua Casa Leblon" width={32} height={32} className="rounded-lg" />
              <span className="font-display text-lg text-[var(--color-text)] hidden sm:block">Sua Casa Leblon</span>
            </Link>
            <a href={`https://wa.me/${brand.whatsapp}?text=Olá!`} target="_blank" rel="noopener" className="flex items-center justify-center w-9 h-9 bg-[#25D366] text-white rounded-full hover:bg-[#20BD5A] transition-colors md:hidden">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4.5 h-4.5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
            </a>
          </div>
          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-3">
            <a href="#apartamentos" className="bg-gold text-gold-foreground px-5 py-2 rounded-full text-sm font-semibold hover:bg-gold-dark transition-colors">Ver apartamentos</a>
            <Link href="/proprietarios" className="bg-gold/15 border border-gold/40 text-gold px-5 py-2 rounded-full text-sm font-semibold hover:bg-gold hover:text-gold-foreground transition-all">Tenho um imóvel</Link>
            <a href={`https://wa.me/${brand.whatsapp}?text=Olá!`} target="_blank" rel="noopener" className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-full text-xs font-semibold hover:bg-green-700 transition-colors ml-1"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</a>
          </nav>
          {/* Mobile nav buttons */}
          <div className="flex md:hidden items-center gap-2">
            <a href="#apartamentos" className="bg-gold text-gold-foreground px-3 py-1.5 rounded-full text-xs font-semibold">Reservar</a>
            <Link href="/proprietarios" className="bg-gold/15 border border-gold/40 text-gold px-3 py-1.5 rounded-full text-xs font-semibold">Meu imóvel</Link>
          </div>
        </div>
      </header>

      {/* ─── APARTMENT CAROUSEL (mobile) ─── */}
      <div className="md:hidden overflow-hidden py-3 border-b border-[var(--color-border)]/50">
        <div ref={carouselRef} className="flex gap-3 px-4 overflow-x-auto scroll-smooth" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
          {[...properties, ...properties].map((p, i) => (
            <Link key={`carousel-${p.code}-${i}`} href={`/property/${p.code}`} className="w-[140px] h-[100px] flex-shrink-0 rounded-xl overflow-hidden relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <span className="absolute bottom-2 left-2 text-white text-xs font-semibold drop-shadow">{p.title}</span>
            </Link>
          ))}
        </div>
        <style>{`
          div[style*="scrollbarWidth"] ::-webkit-scrollbar { display: none; }
        `}</style>
      </div>

      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden">
        {/* Desktop: full-width beach image band */}
        <div className="hidden md:block absolute inset-0">
          <div
            className="absolute inset-0 bg-center bg-cover bg-no-repeat"
            style={{ backgroundImage: "url('/images/leblon-beach.jpg')" }}
          />
          <div className="absolute inset-0 bg-black/35" />
        </div>

        {/* Hero text content */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 pt-8 pb-8 md:pt-16 md:pb-12">
          <div className="max-w-2xl mx-auto text-center" style={{ maxWidth: '600px' }}>
            <h1 className="font-display text-3xl md:text-5xl leading-tight animate-fade-in animate-fade-in-delay-1" style={{ lineHeight: 1.2 }}>
              <span className="text-[var(--color-text)] md:text-white">Seu Lugar no </span>
              <span className="text-gold">Leblon</span>
            </h1>
            <p className="mt-4 text-base max-w-lg mx-auto animate-fade-in animate-fade-in-delay-2 text-[var(--color-text-secondary)] md:text-white/90" style={{ lineHeight: 1.6 }}>
              Reserve direto pagando menos
            </p>
            <p className="mt-2 text-sm animate-fade-in animate-fade-in-delay-2 text-[var(--color-text-secondary)]/70 md:text-white/70">
              Pagamento via Pix ou cartão.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6 animate-fade-in animate-fade-in-delay-3">
              <a href="#apartamentos" className="flex items-center gap-2 bg-gold text-gold-foreground px-6 py-3 rounded-xl font-semibold text-sm hover:bg-gold-dark transition-colors"><Search className="h-4 w-4" /> Ver apartamentos disponíveis</a>
              <Link href="/proprietarios" className="flex items-center gap-2 bg-gold/15 border border-gold/40 text-gold px-6 py-3 rounded-xl font-semibold text-sm hover:bg-gold hover:text-gold-foreground transition-all md:text-white md:border-white/30 md:bg-white/10 md:hover:bg-white/20 md:hover:text-white"><Building2 className="h-4 w-4" /> Tenho um imóvel</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── METRICS / TRUST BLOCK ─── */}
      <section className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 text-center">
          {[{ val: '2.000+', label: 'hóspedes atendidos' }, { val: '4.9', label: 'avaliação média' }].map(s => (
            <div key={s.label} className="flex items-center gap-2">
              <span className="text-xl font-extrabold text-[#8B6914] font-mono">{s.val}</span>
              <span className="text-xs font-medium text-[#4a3520]">{s.label}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center gap-1 mt-3">
          <p className="text-lg font-bold text-gold">Superhost <span className="text-xs font-medium text-[#4a3520]">desde 2018</span></p>
          <p className="text-lg font-bold text-gold">14% <span className="text-xs font-medium text-[#4a3520]">mais barato que Airbnb e Booking</span></p>
        </div>
      </section>

      {/* ─── SEARCH / BOOKING FORM WITH TABS ─── */}
      <section id="apartamentos" className="max-w-6xl mx-auto px-4 pb-8 scroll-mt-20">
        <div className="max-w-3xl mx-auto">
          {/* Tab buttons */}
          <div className="flex rounded-t-2xl overflow-hidden border border-b-0 border-[var(--color-border)]">
            <button
              onClick={() => setActiveTab('reservar')}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'reservar' ? 'bg-gold text-gold-foreground' : 'bg-white text-[var(--color-text-secondary)] hover:bg-[#F5F0E8]'}`}
            >
              Reservar
            </button>
            <button
              onClick={() => setActiveTab('imovel')}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'imovel' ? 'bg-gold text-gold-foreground' : 'bg-white text-[var(--color-text-secondary)] hover:bg-[#F5F0E8]'}`}
            >
              Tenho um Imóvel
            </button>
          </div>

          {/* Tab content */}
          {activeTab === 'reservar' ? (
            <div className="bg-white rounded-b-2xl border border-t-0 border-[var(--color-border)] shadow-lg p-4 md:p-5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="cursor-pointer" onClick={() => openDatePicker(checkinRef)}>
                  <label className="text-[10px] text-[#4a3520] font-medium uppercase tracking-wider block mb-1">Check-in</label>
                  <input
                    ref={checkinRef}
                    type="date"
                    value={checkin}
                    min={today}
                    onChange={e => { setCheckin(e.target.value); setResults(null) }}
                    className="w-full border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-sm bg-[#F5F0E8] text-[var(--color-text)] focus:border-gold focus:ring-1 focus:ring-gold/30 transition-all cursor-pointer"
                  />
                </div>
                <div className="cursor-pointer" onClick={() => openDatePicker(checkoutRef)}>
                  <label className="text-[10px] text-[#4a3520] font-medium uppercase tracking-wider block mb-1">Check-out</label>
                  <input
                    ref={checkoutRef}
                    type="date"
                    value={checkout}
                    min={checkin || today}
                    onChange={e => { setCheckout(e.target.value); setResults(null) }}
                    className="w-full border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-sm bg-[#F5F0E8] text-[var(--color-text)] focus:border-gold focus:ring-1 focus:ring-gold/30 transition-all cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#4a3520] font-medium uppercase tracking-wider block mb-1">Hóspedes</label>
                  <select value={guests} onChange={e => { setGuests(Number(e.target.value)); setResults(null) }} className="w-full border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-sm bg-[#F5F0E8] text-[var(--color-text)] focus:border-gold focus:ring-1 focus:ring-gold/30 transition-all">
                    {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} hóspede{n > 1 ? 's' : ''}</option>)}
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
          ) : (
            <div className="bg-white rounded-b-2xl border border-t-0 border-[var(--color-border)] shadow-lg p-6">
              <h3 className="font-display text-lg text-[var(--color-text)] mb-2">Quanto seu imóvel pode render?</h3>
              <p className="text-sm text-[var(--color-text-secondary)] mb-4">Studios e 1-quartos no Leblon rendem até <span className="font-bold text-gold">R$ 8.000/mês</span> em temporada.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="text-[10px] text-[#4a3520] font-medium uppercase tracking-wider block mb-1">Tipo</label>
                  <select className="w-full border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-sm bg-[#F5F0E8] text-[var(--color-text)]">
                    <option>Studio</option>
                    <option>1 quarto</option>
                    <option>2 quartos</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-[#4a3520] font-medium uppercase tracking-wider block mb-1">Bairro</label>
                  <select className="w-full border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-sm bg-[#F5F0E8] text-[var(--color-text)]">
                    <option>Leblon</option>
                    <option>Ipanema</option>
                    <option>Copacabana</option>
                    <option>Búzios</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <a href={`https://wa.me/${brand.whatsapp}?text=Olá! Tenho um imóvel e gostaria de saber quanto pode render.`} target="_blank" rel="noopener" className="w-full bg-[#25D366] text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-[#20BD5A] transition-colors flex items-center justify-center gap-2">
                    <MessageCircle className="h-4 w-4" /> Falar com consultor
                  </a>
                </div>
              </div>
              <p className="text-[10px] text-[var(--color-text-secondary)] text-center">Avaliação gratuita e sem compromisso</p>
            </div>
          )}
        </div>
      </section>

      {/* ─── SEARCH RESULTS ─── */}
      {results !== null && (
        <section className="max-w-6xl mx-auto px-4 pb-12">
          {searchError && (
            <div className="max-w-3xl mx-auto text-center py-8">
              <Calendar className="h-10 w-10 text-[var(--color-border)] mx-auto mb-3" />
              <p className="text-sm text-[var(--color-text-secondary)]">{searchError}</p>
              <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=Olá! Quero reservar de ${checkin} a ${checkout} para ${guests} hóspede(s).`} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 mt-4 text-green-600 text-sm font-semibold hover:text-green-700"><MessageCircle className="h-4 w-4" /> Consultar via WhatsApp</a>
            </div>
          )}
          {results.length > 0 && (
            <div>
              <h2 className="font-display text-xl text-[var(--color-text)] mb-1 text-center">{results.length} {results.length === 1 ? 'apartamento disponível' : 'apartamentos disponíveis'}</h2>
              <p className="text-xs text-[var(--color-text-secondary)] text-center mb-6">{checkin} → {checkout} • {guests} hóspede{guests > 1 ? 's' : ''}</p>
              {/* Desktop: grid */}
              <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl mx-auto">
                {results.map(({ property, quote }) => (
                  <ResultCard key={property.code} property={property} quote={quote} checkin={checkin} checkout={checkout} guests={guests} />
                ))}
              </div>
              {/* Mobile: horizontal carousel */}
              <div className="md:hidden card-carousel gap-4 px-4 -mx-4">
                {results.map(({ property, quote }) => (
                  <div key={property.code} className="w-[82%] flex-shrink-0">
                    <ResultCard property={property} quote={quote} checkin={checkin} checkout={checkout} guests={guests} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ─── DEFAULT APARTMENT CARDS (no search yet) ─── */}
      {results === null && (
        <section className="max-w-6xl mx-auto px-4 pb-12">
          <h2 className="font-display text-2xl text-[var(--color-text)] mb-2">Nossos apartamentos</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mb-6">Escolha suas datas acima para ver preços e disponibilidade</p>
          {/* Desktop: grid */}
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {properties.map(property => (
              <DefaultCard key={property.code} property={property} />
            ))}
          </div>
          {/* Mobile: horizontal carousel showing 1 card + peek of next */}
          <div className="md:hidden card-carousel gap-4 px-1">
            {properties.map(property => (
              <div key={property.code} className="w-[82%] flex-shrink-0">
                <DefaultCard property={property} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── CTA PROPRIETÁRIOS ─── */}
      <section className="bg-[#3D3428]">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-20">
          <div className="max-w-xl">
            <p className="text-gold text-xs font-bold uppercase tracking-wider mb-3">Para proprietários</p>
            <h2 className="font-display text-3xl md:text-4xl text-white leading-tight">Seu imóvel no Leblon pode render <span className="text-gold">muito mais</span></h2>
            <p className="mt-4 text-white/60 leading-relaxed">Studios e apartamentos compactos são os que mais crescem em demanda. Fazemos ajustes leves — sem obra — que aumentam sua receita em até 60%.</p>
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <Link href="/proprietarios" className="inline-flex items-center gap-2 bg-gold text-gold-foreground px-6 py-3 rounded-xl font-semibold text-sm hover:bg-gold-dark transition-colors">Descobrir quanto meu imóvel pode render <ArrowRight className="h-4 w-4" /></Link>
              <a href={`https://wa.me/${brand.whatsapp}?text=Olá! Tenho um imóvel no Leblon e gostaria de uma avaliação.`} target="_blank" rel="noopener" className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors"><MessageCircle className="h-4 w-4" /> Avalie Sem Compromisso</a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-white border-t border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2"><Image src="/images/logo.png" alt="Sua Casa Leblon" width={24} height={24} className="rounded" /><span className="font-display text-sm text-[var(--color-text)]">Sua Casa Leblon</span></div>
            <p className="text-xs text-[var(--color-text-secondary)]">© {new Date().getFullYear()} AL Gestão — Aluguéis de Temporada no Leblon.</p>
            <a href={`https://wa.me/${brand.whatsapp}`} target="_blank" rel="noopener" className="text-xs text-green-600 font-medium hover:text-green-700">WhatsApp: +55 21 99536-0322</a>
          </div>
        </div>
      </footer>

      {/* ─── FLOATING WHATSAPP BUTTON ─── */}
      <a
        href={`https://wa.me/${brand.whatsapp}?text=Olá!`}
        target="_blank"
        rel="noopener"
        className="fixed bottom-5 right-5 z-50 flex items-center justify-center w-14 h-14 bg-[#25D366] text-white rounded-full shadow-lg hover:bg-[#20BD5A] transition-colors whatsapp-pulse"
        aria-label="Conversar no WhatsApp"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>
    </div>
  )
}

/* ─── RESULT CARD (with quote) ─── */
function ResultCard({ property, quote, checkin, checkout, guests }: {
  property: Property
  quote: { grandTotal: number; nights: number; savings: number }
  checkin: string; checkout: string; guests: number
}) {
  return (
    <Link href={`/property/${property.code}?checkin=${checkin}&checkout=${checkout}&guests=${guests}`} className="group bg-white rounded-2xl border border-[var(--color-border)]/60 overflow-hidden hover:border-gold/30 hover:shadow-lg hover:shadow-gold/5 transition-all duration-300 block">
      <div className="aspect-[4/3] bg-brand-100 relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={property.images[0]} alt={property.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-white/90" />
          <span className="text-xs text-white/90 font-medium">Leblon</span>
        </div>
        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm text-[var(--color-text)] text-xs font-bold px-3 py-2 rounded-xl shadow-lg">
          <span className="text-base font-mono">{fmtBRL(quote.grandTotal)}</span>
          <span className="block text-[9px] font-normal text-[var(--color-text-secondary)] mt-0.5">Valor Final</span>
        </div>
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
  )
}

/* ─── DEFAULT CARD (no quote) ─── */
function DefaultCard({ property }: { property: Property }) {
  return (
    <Link href={`/property/${property.code}`} className="group bg-white rounded-2xl border border-[var(--color-border)]/60 overflow-hidden hover:border-gold/30 hover:shadow-lg hover:shadow-gold/5 transition-all duration-300 block">
      <div className="aspect-[4/3] bg-brand-100 relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={property.images[0]} alt={property.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-white/90" />
          <span className="text-xs text-white/90 font-medium">Leblon, Rio de Janeiro</span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-display text-lg text-[var(--color-text)] group-hover:text-gold transition-colors">{property.title}</h3>
        <p className="text-xs text-[var(--color-text-secondary)] mt-1">{property.subtitle}</p>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]"><Users className="h-3.5 w-3.5" /> Até {property.max_guests}</div>
          <span className="text-xs text-[#8B6914] font-semibold">Pague Menos Que no Airbnb e Booking.</span>
        </div>
      </div>
    </Link>
  )
}
