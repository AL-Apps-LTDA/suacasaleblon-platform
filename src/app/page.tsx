import Link from 'next/link'
import { MapPin, Star, Users, ChevronRight, MessageCircle, Shield, Percent } from 'lucide-react'
import { siteConfig } from '@/lib/config'

export default function Home() {
  const { properties, brand, pricing } = siteConfig
  const discountPct = Math.round(pricing.discount_pct * 100)

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
            <a href="#imoveis" className="hover:text-gold transition-colors">Imóveis</a>
            <Link href="/proprietarios" className="hover:text-gold transition-colors">Proprietários</Link>
            <a
              href={`https://wa.me/${brand.whatsapp}?text=Olá! Gostaria de saber mais sobre os imóveis.`}
              target="_blank"
              rel="noopener"
              className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-full text-xs font-semibold hover:bg-green-700 transition-colors"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-100/50 to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 pt-16 pb-12 md:pt-24 md:pb-16 relative">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/20 rounded-full px-4 py-1.5 mb-6 animate-fade-in">
              <Percent className="h-3.5 w-3.5 text-gold" />
              <span className="text-xs font-semibold text-gold">{discountPct}% de desconto reservando direto</span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-[var(--color-text)] leading-tight animate-fade-in animate-fade-in-delay-1">
              Sua casa no<br />
              <span className="text-gold">Leblon</span>
            </h1>
            <p className="mt-5 text-lg text-[var(--color-text-secondary)] max-w-lg leading-relaxed animate-fade-in animate-fade-in-delay-2">
              Studios e apartamentos reformados no coração do Leblon. A poucos passos da praia, 
              com gestão completa e atendimento 24h.
            </p>
            <div className="mt-8 flex flex-wrap gap-4 animate-fade-in animate-fade-in-delay-3">
              <a href="#imoveis" className="bg-gold text-gold-foreground px-6 py-3 rounded-xl font-semibold text-sm hover:bg-gold-dark transition-colors">
                Ver imóveis disponíveis
              </a>
              <a
                href={`https://wa.me/${brand.whatsapp}?text=Olá! Quero reservar um apartamento no Leblon.`}
                target="_blank"
                rel="noopener"
                className="border border-[var(--color-border)] px-6 py-3 rounded-xl font-semibold text-sm text-[var(--color-text-secondary)] hover:border-gold/40 hover:text-gold transition-colors"
              >
                Falar no WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Trust badges */}
      <section className="max-w-6xl mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Shield, title: 'Gestão Completa', desc: 'Check-in, limpeza e manutenção profissional' },
            { icon: Star, title: 'Superhost Airbnb', desc: 'Avaliação média acima de 4.8 estrelas' },
            { icon: Percent, title: 'Melhor Preço Direto', desc: `${discountPct}% menor que Airbnb e Booking` },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3 p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]/60">
              <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                <Icon className="h-5 w-5 text-gold" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text)]">{title}</h3>
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Properties */}
      <section id="imoveis" className="max-w-6xl mx-auto px-4 pb-20">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-display text-2xl text-[var(--color-text)]">Nossos imóveis</h2>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              {properties.length} imóveis no Leblon com gestão profissional
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {properties.map((property) => (
            <Link
              key={property.code}
              href={`/property/${property.code}`}
              className="group bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)]/60 overflow-hidden hover:border-gold/30 hover:shadow-lg hover:shadow-gold/5 transition-all duration-300"
            >
              {/* Image placeholder */}
              <div className="aspect-[4/3] bg-brand-100 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-white/90" />
                  <span className="text-xs text-white/90 font-medium">Leblon, Rio de Janeiro</span>
                </div>
                {property.docs_required && (
                  <div className="absolute top-3 right-3 bg-gold/90 text-white text-[10px] font-bold px-2 py-1 rounded-md">
                    DOCS VIA WHATSAPP
                  </div>
                )}
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg text-[var(--color-text)] group-hover:text-gold transition-colors">
                    {property.title}
                  </h3>
                  <ChevronRight className="h-4 w-4 text-[var(--color-text-secondary)] group-hover:text-gold transition-colors" />
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                  {property.subtitle}
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
                    <Users className="h-3.5 w-3.5" />
                    Até {property.max_guests}
                  </div>
                  <div className="text-xs text-gold font-semibold">
                    {discountPct}% OFF reserva direta
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA section for property owners */}
      <section className="bg-[var(--color-text)] text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-20">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl md:text-4xl">
              Tem um imóvel no <span className="text-gold">Leblon</span>?
            </h2>
            <p className="mt-4 text-brand-300 leading-relaxed">
              Oferecemos gestão completa — desde a criação do anúncio até o check-out do hóspede. 
              Seu imóvel gera mais receita mesmo pagando nossa comissão.
            </p>
            <Link
              href="/proprietarios"
              className="inline-flex items-center gap-2 mt-6 bg-gold text-gold-foreground px-6 py-3 rounded-xl font-semibold text-sm hover:bg-gold-dark transition-colors"
            >
              Simule sua receita
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--color-surface)] border-t border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gold flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">SC</span>
              </div>
              <span className="font-display text-sm text-[var(--color-text)]">{brand.name}</span>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)]">
              © {new Date().getFullYear()} AL Gestão — Temporada. Todos os direitos reservados.
            </p>
            <a
              href={`https://wa.me/${brand.whatsapp}`}
              target="_blank"
              rel="noopener"
              className="text-xs text-green-600 font-medium hover:text-green-700"
            >
              WhatsApp: +55 21 99536-0322
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
