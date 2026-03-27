'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Users, ChevronRight, MessageCircle, Shield, Star, Loader2, Search, Calendar, Building2, ArrowRight } from 'lucide-react'
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
  const today = new Date().toISOString().slice(0, 10)

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
          while (cursor < end) { if (blockedDates.has(cursor.toISOString().slice(0, 10))) { isBlocked = true; break }; cursor.setDate(cursor.getDate() + 1) }
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
      {/* Header — bifurcação clara */}
      <header className="sticky top-0 z-50 bg-[#F5F0E8]/95 backdrop-blur-md border-b border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/images/logo.png" alt="Sua Casa Leblon" width={32} height={32} className="rounded-lg" />
            <span className="font-display text-lg text-[var(--color-text)] hidden sm:block">Sua Casa Leblon</span>
          </Link>
          <nav className="hidden md:flex items-center gap-3">
            <a href="#apartamentos" className="bg-gold text-gold-foreground px-5 py-2 rounded-full text-sm font-semibold hover:bg-gold-dark transition-colors">Ver apartamentos</a>
            <Link href="/proprietarios" className="bg-gold/15 border border-gold/40 text-gold px-5 py-2 rounded-full text-sm font-semibold hover:bg-gold hover:text-gold-foreground transition-all">Tenho um imóvel</Link>
            <a href={`https://wa.me/${brand.whatsapp}?text=Olá!`} target="_blank" rel="noopener" className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-full text-xs font-semibold hover:bg-green-700 transition-colors ml-1"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</a>
          </nav>
          <div className="flex md:hidden items-center gap-2">
            <a href="#apartamentos" className="bg-gold text-gold-foreground px-3 py-1.5 rounded-full text-xs font-semibold">Reservar</a>
            <Link href="/proprietarios" className="bg-gold/15 border border-gold/40 text-gold px-3 py-1.5 rounded-full text-xs font-semibold">Meu imóvel</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="hidden md:block absolute inset-0">
          <div
            className="absolute inset-0 bg-center bg-cover bg-no-repeat"
            style={{ backgroundImage: "url('/images/hero-bg.jpg')" }}
          />
          <div className="absolute inset-0 bg-black/35" />
        </div>
        {/* Mobile: apartment thumbnails strip */}
        <div className="relative z-10 md:hidden flex gap-2 px-4 pt-4 overflow-x-auto no-scrollbar">
          {properties.map(p => (
            <a key={p.code} href="#apartamentos" className="shrink-0 w-28 h-20 rounded-xl overflow-hidden relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <span className="absolute bottom-1.5 left-2 text-[10px] text-white font-bold drop-shadow">{p.title}</span>
            </a>
          ))}
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 pt-6 pb-6 md:pt-16 md:pb-10">
          <div className="max-w-2xl mx-auto text-center">

            <h1 className="font-display text-3xl md:text-5xl text-[var(--color-text)] leading-tight animate-fade-in animate-fade-in-delay-1">
              Seu Lugar no <span className="text-gold">Leblon</span>
            </h1>
            <p className="mt-4 text-base text-[var(--color-text-secondary)] max-w-lg mx-auto animate-fade-in animate-fade-in-delay-2">
              Praia, bares e restaurantes. Tudo a poucos passos.</p>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]/70 animate-fade-in animate-fade-in-delay-2">Pague Menos Que no Airbnb e Booking.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6 animate-fade-in animate-fade-in-delay-3">
              <a href="#apartamentos" className="flex items-center gap-2 bg-gold text-gold-foreground px-6 py-3 rounded-xl font-semibold text-sm hover:bg-gold-dark transition-colors"><Search className="h-4 w-4" /> Ver apartamentos disponíveis</a>
              <Link href="/proprietarios" className="flex items-center gap-2 bg-gold/15 border border-gold/40 text-gold px-6 py-3 rounded-xl font-semibold text-sm hover:bg-gold hover:text-gold-foreground transition-all"><Building2 className="h-4 w-4" /> Tenho um imóvel</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Prova social */}
      <section className="max-w-6xl mx-auto px-4 pb-6">
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 text-center">
          {[{ val: '1.9K+', label: 'reservas' },{ val: '4.9', label: 'avaliação média' },{ val: 'Superhost', label: 'desde 2018' }].map(s => (
            <div key={s.label} className="flex items-center gap-2">
              <span className="text-lg font-bold text-gold font-mono">{s.val}</span>
              <span className="text-xs text-[var(--color-text-secondary)]">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Search box */}
      <section id="apartamentos" className="max-w-6xl mx-auto px-4 pb-8 scroll-mt-20">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-lg p-4 md:p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div><label className="text-[10px] text-[var(--color-text-secondary)] font-medium uppercase tracking-wider block mb-1">Check-in</label><input type="date" value={checkin} min={today} onChange={e=>{setCheckin(e.target.value);setResults(null)}} className="w-full border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-sm bg-[#F5F0E8] text-[var(--color-text)] focus:border-gold focus:ring-1 focus:ring-gold/30 transition-all" /></div>
              <div><label className="text-[10px] text-[var(--color-text-secondary)] font-medium uppercase tracking-wider block mb-1">Check-out</label><input type="date" value={checkout} min={checkin||today} onChange={e=>{setCheckout(e.target.value);setResults(null)}} className="w-full border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-sm bg-[#F5F0E8] text-[var(--color-text)] focus:border-gold focus:ring-1 focus:ring-gold/30 transition-all" /></div>
              <div><label className="text-[10px] text-[var(--color-text-secondary)] font-medium uppercase tracking-wider block mb-1">Hóspedes</label><select value={guests} onChange={e=>{setGuests(Number(e.target.value));setResults(null)}} className="w-full border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-sm bg-[#F5F0E8] text-[var(--color-text)] focus:border-gold focus:ring-1 focus:ring-gold/30 transition-all">{[1,2,3,4,5,6].map(n=><option key={n} value={n}>{n} hóspede{n>1?'s':''}</option>)}</select></div>
              <div className="flex items-end"><button onClick={handleSearch} disabled={!checkin||!checkout||searching} className="w-full bg-gold text-gold-foreground py-2.5 rounded-xl font-semibold text-sm hover:bg-gold-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2">{searching?<Loader2 className="h-4 w-4 animate-spin"/>:<Search className="h-4 w-4"/>}{searching?'Buscando...':'Buscar'}</button></div>
            </div>
          </div>
        </div>
      </section>

      {/* Search results */}
      {results !== null && (
        <section className="max-w-6xl mx-auto px-4 pb-12">
          {searchError && (<div className="max-w-3xl mx-auto text-center py-8"><Calendar className="h-10 w-10 text-[var(--color-border)] mx-auto mb-3"/><p className="text-sm text-[var(--color-text-secondary)]">{searchError}</p><a href={`https://wa.me/${WHATSAPP_NUMBER}?text=Olá! Quero reservar de ${checkin} a ${checkout} para ${guests} hóspede(s).`} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 mt-4 text-green-600 text-sm font-semibold hover:text-green-700"><MessageCircle className="h-4 w-4"/> Consultar via WhatsApp</a></div>)}
          {results.length > 0 && (<div>
            <h2 className="font-display text-xl text-[var(--color-text)] mb-1 text-center">{results.length} {results.length===1?'apartamento disponível':'apartamentos disponíveis'}</h2>
            <p className="text-xs text-[var(--color-text-secondary)] text-center mb-6">{checkin} → {checkout} • {guests} hóspede{guests>1?'s':''}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl mx-auto">
              {results.map(({property,quote})=>(<Link key={property.code} href={`/property/${property.code}?checkin=${checkin}&checkout=${checkout}&guests=${guests}`} className="group bg-white rounded-2xl border border-[var(--color-border)]/60 overflow-hidden hover:border-gold/30 hover:shadow-lg hover:shadow-gold/5 transition-all duration-300">
                <div className="aspect-[4/3] bg-brand-100 relative overflow-hidden">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={property.images[0]} alt={property.title} className="w-full h-full object-cover"/><div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"/><div className="absolute bottom-3 left-3 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-white/90"/><span className="text-xs text-white/90 font-medium">Leblon</span></div><div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm text-[var(--color-text)] text-xs font-bold px-3 py-2 rounded-xl shadow-lg"><span className="text-base font-mono">{fmtBRL(quote.grandTotal)}</span><span className="block text-[9px] font-normal text-[var(--color-text-secondary)] mt-0.5">Valor Final</span></div></div>
                <div className="p-4"><div className="flex items-center justify-between"><h3 className="font-display text-lg text-[var(--color-text)] group-hover:text-gold transition-colors">{property.title}</h3><ChevronRight className="h-4 w-4 text-[var(--color-text-secondary)] group-hover:text-gold transition-colors"/></div><p className="text-xs text-[var(--color-text-secondary)] mt-1">{property.subtitle}</p><div className="mt-3 flex items-center justify-between"><div className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]"><Users className="h-3.5 w-3.5"/> Até {property.max_guests}</div><div className="text-right"><span className="text-sm font-bold text-gold font-mono">{fmtBRL(quote.grandTotal)}</span><span className="text-[10px] text-[var(--color-text-secondary)] block">{quote.nights} noite{quote.nights>1?'s':''} total</span></div></div>{quote.savings>0&&(<div className="mt-2 bg-green-50 rounded-lg px-3 py-1.5 text-center"><span className="text-[10px] text-green-700 font-semibold">Economia de {fmtBRL(quote.savings)} vs Airbnb</span></div>)}</div>
              </Link>))}
            </div>
          </div>)}
        </section>
      )}

      {/* All properties when no search */}
      {results === null && (
        <section className="max-w-6xl mx-auto px-4 pb-12">
          <h2 className="font-display text-2xl text-[var(--color-text)] mb-2">Nossos apartamentos</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mb-6">Escolha suas datas acima para ver preços e disponibilidade</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {properties.map(property=>(<Link key={property.code} href={`/property/${property.code}`} className="group bg-white rounded-2xl border border-[var(--color-border)]/60 overflow-hidden hover:border-gold/30 hover:shadow-lg hover:shadow-gold/5 transition-all duration-300">
              <div className="aspect-[4/3] bg-brand-100 relative overflow-hidden">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={property.images[0]} alt={property.title} className="w-full h-full object-cover"/><div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"/><div className="absolute bottom-3 left-3 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-white/90"/><span className="text-xs text-white/90 font-medium">Leblon, Rio de Janeiro</span></div></div>
              <div className="p-4"><h3 className="font-display text-lg text-[var(--color-text)] group-hover:text-gold transition-colors">{property.title}</h3><p className="text-xs text-[var(--color-text-secondary)] mt-1">{property.subtitle}</p><div className="mt-3 flex items-center gap-3"><div className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]"><Users className="h-3.5 w-3.5"/> Até {property.max_guests}</div><span className="text-xs text-gold font-semibold">Pague Menos Que no Airbnb e Booking.</span></div></div>
            </Link>))}
          </div>
        </section>
      )}

      {/* CTA proprietários */}
      <section className="bg-[#3D3428]">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-20">
          <div className="max-w-xl">
            <p className="text-gold text-xs font-bold uppercase tracking-wider mb-3">Para proprietários</p>
            <h2 className="font-display text-3xl md:text-4xl text-white leading-tight">Seu imóvel no Leblon pode render <span className="text-gold">muito mais</span></h2>
            <p className="mt-4 text-white/60 leading-relaxed">Studios e apartamentos compactos são os que mais crescem em demanda. Fazemos ajustes leves — sem obra — que aumentam sua receita em até 60%.</p>
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <Link href="/proprietarios" className="inline-flex items-center gap-2 bg-gold text-gold-foreground px-6 py-3 rounded-xl font-semibold text-sm hover:bg-gold-dark transition-colors">Descobrir quanto meu imóvel pode render <ArrowRight className="h-4 w-4"/></Link>
              <a href={`https://wa.me/${brand.whatsapp}?text=Olá! Tenho um imóvel no Leblon e gostaria de uma avaliação.`} target="_blank" rel="noopener" className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors"><MessageCircle className="h-4 w-4"/> Avalie Sem Compromisso</a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2"><Image src="/images/logo.png" alt="Sua Casa Leblon" width={24} height={24} className="rounded"/><span className="font-display text-sm text-[var(--color-text)]">Sua Casa Leblon</span></div>
            <p className="text-xs text-[var(--color-text-secondary)]">© {new Date().getFullYear()} AL Gestão — Aluguéis de Temporada no Leblon.</p>
            <a href={`https://wa.me/${brand.whatsapp}`} target="_blank" rel="noopener" className="text-xs text-green-600 font-medium hover:text-green-700">WhatsApp: +55 21 99536-0322</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
