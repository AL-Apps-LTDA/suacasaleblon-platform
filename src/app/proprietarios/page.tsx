'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Calculator, MessageCircle, CheckCircle2, TrendingUp, Shield, Clock } from 'lucide-react'
import { fmtBRL, WHATSAPP_NUMBER } from '@/lib/types'

const CALCULATOR_PRESETS = [
  { type: 'Studio', avgDaily: 450, occupancy: 0.72, expenses: 1800 },
  { type: '1 Quarto', avgDaily: 600, occupancy: 0.68, expenses: 2200 },
  { type: '2 Quartos', avgDaily: 900, occupancy: 0.65, expenses: 2800 },
  { type: '3 Quartos', avgDaily: 1200, occupancy: 0.60, expenses: 3500 },
]

export default function ProprietariosPage() {
  const [selectedType, setSelectedType] = useState(0)
  const preset = CALCULATOR_PRESETS[selectedType]
  const commissionPct = 0.15

  const daysInMonth = 30
  const occupiedNights = Math.round(daysInMonth * preset.occupancy)
  const grossRevenue = occupiedNights * preset.avgDaily
  const commission = grossRevenue * commissionPct
  const netOwner = grossRevenue - preset.expenses - commission

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--color-bg)]/90 backdrop-blur-md border-b border-[var(--color-border)]">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/" className="text-[var(--color-text-secondary)] hover:text-gold transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="font-display text-lg text-[var(--color-text)]">Para Proprietários</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="mb-12">
          <h1 className="font-display text-3xl md:text-4xl text-[var(--color-text)] leading-tight">
            Seu imóvel no Leblon<br />
            <span className="text-gold">rende mais com gestão profissional</span>
          </h1>
          <p className="mt-4 text-[var(--color-text-secondary)] max-w-xl leading-relaxed">
            Cuidamos de tudo — do anúncio ao check-out. Você recebe mais do que receberia 
            sozinho, mesmo pagando nossa comissão.
          </p>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          {[
            { icon: TrendingUp, title: 'Mais receita', desc: 'Precificação dinâmica com Beyond Pricing + presença em Airbnb, Booking e reservas diretas' },
            { icon: Shield, title: 'Zero preocupação', desc: 'Gestão completa: limpeza, manutenção, check-in/out, atendimento 24h ao hóspede' },
            { icon: Clock, title: 'Transparência total', desc: 'Relatório mensal detalhado com todas as receitas, despesas e métricas (RevPAN, ADR, ocupação)' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]/60">
              <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center mb-3">
                <Icon className="h-5 w-5 text-gold" />
              </div>
              <h3 className="font-semibold text-sm text-[var(--color-text)]">{title}</h3>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1.5 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Revenue Calculator */}
        <div className="bg-[var(--color-surface)] rounded-2xl border border-gold/20 p-6 md:p-8 mb-12">
          <div className="flex items-center gap-2 mb-6">
            <Calculator className="h-5 w-5 text-gold" />
            <h2 className="font-display text-xl text-[var(--color-text)]">Simulador de receita</h2>
          </div>

          {/* Property type selector */}
          <div className="flex flex-wrap gap-2 mb-6">
            {CALCULATOR_PRESETS.map((p, i) => (
              <button
                key={p.type}
                onClick={() => setSelectedType(i)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  i === selectedType
                    ? 'bg-gold text-gold-foreground'
                    : 'bg-brand-100 text-[var(--color-text-secondary)] hover:bg-brand-200'
                }`}
              >
                {p.type}
              </button>
            ))}
          </div>

          {/* Results */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-brand-50 rounded-xl p-3 text-center">
              <p className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wider">Diária média</p>
              <p className="text-lg font-bold text-[var(--color-text)] font-mono mt-1">{fmtBRL(preset.avgDaily)}</p>
            </div>
            <div className="bg-brand-50 rounded-xl p-3 text-center">
              <p className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wider">Ocupação</p>
              <p className="text-lg font-bold text-[var(--color-text)] font-mono mt-1">{Math.round(preset.occupancy * 100)}%</p>
            </div>
            <div className="bg-brand-50 rounded-xl p-3 text-center">
              <p className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wider">Receita bruta</p>
              <p className="text-lg font-bold text-teal font-mono mt-1">{fmtBRL(grossRevenue)}</p>
            </div>
            <div className="bg-gold/5 border border-gold/20 rounded-xl p-3 text-center">
              <p className="text-[10px] text-gold uppercase tracking-wider font-semibold">Você recebe</p>
              <p className="text-lg font-bold text-gold font-mono mt-1">{fmtBRL(netOwner)}</p>
              <p className="text-[9px] text-[var(--color-text-secondary)] mt-0.5">por mês</p>
            </div>
          </div>

          <div className="text-xs text-[var(--color-text-secondary)] space-y-1">
            <p>• Comissão de gestão: {Math.round(commissionPct * 100)}% ({fmtBRL(commission)}/mês)</p>
            <p>• Despesas estimadas (condomínio, IPTU, utilidades): {fmtBRL(preset.expenses)}/mês</p>
            <p>• Valores estimados para imóvel no Leblon. Simulação real sob consulta.</p>
          </div>
        </div>

        {/* What's included */}
        <div className="mb-12">
          <h2 className="font-display text-xl text-[var(--color-text)] mb-4">O que está incluído</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              'Criação e otimização dos anúncios (Airbnb, Booking, site próprio)',
              'Precificação dinâmica com Beyond Pricing',
              'Atendimento ao hóspede 24h via Hospitable',
              'Check-in e check-out presencial',
              'Limpeza profissional com checklist',
              'Manutenção preventiva e corretiva',
              'Relatório mensal detalhado com PDF',
              'Gestão de avaliações e Superhost',
              'Fotos profissionais do imóvel',
              'Reposição de enxoval e amenities',
            ].map(item => (
              <div key={item} className="flex items-start gap-2 p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]/40">
                <CheckCircle2 className="h-4 w-4 text-teal shrink-0 mt-0.5" />
                <span className="text-xs text-[var(--color-text)]">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-gold/10 to-gold/5 border border-gold/20">
          <h2 className="font-display text-2xl text-[var(--color-text)]">Pronto para começar?</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-2">
            Fale com Diego pelo WhatsApp e receba uma avaliação gratuita do potencial do seu imóvel.
          </p>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=Olá Diego! Tenho um imóvel no Leblon e gostaria de saber mais sobre a gestão completa.`}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 mt-4 bg-green-600 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            Falar com Diego no WhatsApp
          </a>
        </div>
      </div>
    </div>
  )
}
