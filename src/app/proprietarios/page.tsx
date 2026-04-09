'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, ArrowRight, Calculator, MessageCircle, CheckCircle2, TrendingUp, Shield, Clock, Building2, Star, Zap, BarChart3 } from 'lucide-react'
import { fmtBRL, WHATSAPP_NUMBER } from '@/lib/types'

const CALCULATOR_PRESETS = [
  { type: 'Studio', avgDaily: 450, occupancy: 0.72, expenses: 1800 },
  { type: '1 Quarto', avgDaily: 600, occupancy: 0.68, expenses: 2200 },
  { type: '2 Quartos', avgDaily: 900, occupancy: 0.65, expenses: 2800 },
  { type: '3 Quartos', avgDaily: 1200, occupancy: 0.60, expenses: 3500 },
]

export default function ProprietariosPage() {
  const [selectedType, setSelectedType] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [formName, setFormName] = useState('')
  const [formWhatsApp, setFormWhatsApp] = useState('')
  const [formLink, setFormLink] = useState('')

  const preset = CALCULATOR_PRESETS[selectedType]
  const commissionPct = 0.20 // Simulação para novos proprietários

  const daysInMonth = 30
  const occupiedNights = Math.round(daysInMonth * preset.occupancy)
  const grossRevenue = occupiedNights * preset.avgDaily
  const commission = grossRevenue * commissionPct
  const netOwner = grossRevenue - preset.expenses - commission

  function handleCalculate() {
    setShowResult(true)
    setTimeout(() => {
      document.getElementById('resultado')?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--color-bg)]/95 backdrop-blur-md border-b border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/images/logo.png" alt="Sua Casa Leblon" width={32} height={32} className="rounded-lg" />
            <span className="font-display text-lg text-[var(--color-text)] hidden sm:block">Sua Casa Leblon</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-[var(--color-text-secondary)] hover:text-gold transition-colors">← Reservar apartamento</Link>
            <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=Olá! Tenho um imóvel no Leblon e gostaria de saber mais.`} target="_blank" rel="noopener" className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-full text-xs font-semibold hover:bg-green-700 transition-colors">
              <MessageCircle className="h-3.5 w-3.5" /> Falar comigo
            </a>
          </div>
        </div>
      </header>

      {/* 1. HERO */}
      <section className="max-w-6xl mx-auto px-4 pt-12 pb-10 md:pt-20 md:pb-16">
        <div className="max-w-2xl">
          <p className="text-gold text-xs font-bold uppercase tracking-wider mb-3">Para proprietários no Leblon</p>
          <h1 className="font-display text-3xl md:text-5xl text-[var(--color-text)] leading-tight">
            Fazemos studios e apartamentos compactos renderem <span className="text-gold">mais</span>
          </h1>
          <p className="mt-5 text-lg text-[var(--color-text-secondary)] leading-relaxed">
            Especialmente nas regiões com maior demanda — sem necessidade de obra grande.
          </p>
          <a href="#calculadora" className="inline-flex items-center gap-2 mt-6 bg-gold text-gold-foreground px-6 py-3 rounded-xl font-semibold text-sm hover:bg-gold-dark transition-colors">
            <Calculator className="h-4 w-4" /> Descobrir quanto meu imóvel pode render
          </a>
        </div>
      </section>

      {/* 2. PROBLEMA */}
      <section className="bg-[var(--color-surface)] border-y border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl md:text-3xl text-[var(--color-text)]">
              Seu imóvel pode estar rendendo menos do que deveria
            </h2>
            <p className="mt-4 text-[var(--color-text-secondary)] leading-relaxed">
              A maioria dos proprietários no Leblon deixa dinheiro na mesa — fotos que não vendem, preço que não acompanha a demanda, e gestão que não maximiza a ocupação. Não é culpa sua. É que gestão de temporada virou uma especialidade.
            </p>
          </div>
        </div>
      </section>

      {/* 3. EXPLICAÇÃO SIMPLES — 3 passos */}
      <section className="max-w-6xl mx-auto px-4 py-12 md:py-16">
        <h2 className="font-display text-2xl text-[var(--color-text)] mb-8">Como funciona</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { n: '1', icon: BarChart3, title: 'Análise do imóvel', desc: 'Avaliamos o potencial real do seu imóvel com base em dados de mercado, localização e tipo de unidade.' },
            { n: '2', icon: Zap, title: 'Ajustes de posicionamento', desc: 'Fotos profissionais, descrição otimizada, precificação dinâmica. Sem reforma — só inteligência de mercado.' },
            { n: '3', icon: TrendingUp, title: 'Gestão e aumento de receita', desc: 'Check-in, limpeza, manutenção, atendimento ao hóspede. Você acompanha tudo, sem se preocupar com nada.' },
          ].map(s => (
            <div key={s.n} className="relative">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center"><s.icon className="h-5 w-5 text-gold" /></div>
                <span className="text-sm font-bold text-gold">Passo {s.n}</span>
              </div>
              <h3 className="text-lg font-semibold text-[var(--color-text)]">{s.title}</h3>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. PROVA */}
      <section className="bg-[var(--color-text)]">
        <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
          <p className="text-gold text-xs font-bold uppercase tracking-wider mb-4">Caso real</p>
          <div className="max-w-lg bg-white/5 border border-white/10 rounded-2xl p-6">
            <p className="text-white/60 text-sm">Studio na região da Dias Ferreira</p>
            <div className="flex items-center gap-6 mt-4">
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider">Antes</p>
                <p className="text-2xl font-bold text-white/50 font-mono line-through">R$ 6.000<span className="text-sm font-normal">/mês</span></p>
              </div>
              <ArrowRight className="h-5 w-5 text-gold" />
              <div>
                <p className="text-gold text-xs uppercase tracking-wider">Depois</p>
                <p className="text-2xl font-bold text-gold font-mono">R$ 9.500<span className="text-sm font-normal">/mês</span></p>
              </div>
            </div>
            <p className="mt-3 text-white/40 text-xs">Sem reforma. Apenas ajustes de posicionamento, fotos e precificação dinâmica.</p>
          </div>
        </div>
      </section>

      {/* 5. CALCULADORA */}
      <section id="calculadora" className="max-w-6xl mx-auto px-4 py-12 md:py-16 scroll-mt-20">
        <div className="max-w-2xl mx-auto text-center mb-8">
          <h2 className="font-display text-2xl md:text-3xl text-[var(--color-text)]">Descubra quanto seu imóvel pode render</h2>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Compare com o que você ganha hoje</p>
        </div>

        <div className="max-w-xl mx-auto bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6">
          <p className="text-xs text-[var(--color-text-secondary)] font-medium uppercase tracking-wider mb-3">Tipo do imóvel</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
            {CALCULATOR_PRESETS.map((p, i) => (
              <button key={p.type} onClick={() => { setSelectedType(i); setShowResult(false) }}
                className={`py-2.5 px-3 rounded-xl text-sm font-semibold transition-all ${
                  selectedType === i ? 'bg-gold text-gold-foreground' : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] border border-[var(--color-border)]'
                }`}>{p.type}</button>
            ))}
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-[var(--color-border)]/50">
              <span className="text-[var(--color-text-secondary)]">Diária média estimada</span>
              <span className="font-mono font-bold text-[var(--color-text)]">{fmtBRL(preset.avgDaily)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[var(--color-border)]/50">
              <span className="text-[var(--color-text-secondary)]">Ocupação estimada</span>
              <span className="font-mono font-bold text-[var(--color-text)]">{Math.round(preset.occupancy * 100)}%</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[var(--color-border)]/50">
              <span className="text-[var(--color-text-secondary)]">Noites ocupadas/mês</span>
              <span className="font-mono font-bold text-[var(--color-text)]">{occupiedNights}</span>
            </div>
          </div>

          <button onClick={handleCalculate} className="w-full mt-6 bg-gold text-gold-foreground py-3 rounded-xl font-semibold text-sm hover:bg-gold-dark transition-colors flex items-center justify-center gap-2">
            <Calculator className="h-4 w-4" /> Calcular rendimento
          </button>

          {/* Resultado */}
          {showResult && (
            <div id="resultado" className="mt-6 space-y-3 pt-6 border-t border-[var(--color-border)]">
              <div className="flex justify-between py-2">
                <span className="text-[var(--color-text-secondary)] text-sm">Receita bruta mensal</span>
                <span className="font-mono font-bold text-emerald-600">{fmtBRL(grossRevenue)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[var(--color-text-secondary)] text-sm">Despesas estimadas</span>
                <span className="font-mono font-bold text-red-500">- {fmtBRL(preset.expenses)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[var(--color-text-secondary)] text-sm">Nossa comissão ({Math.round(commissionPct * 100)}%)</span>
                <span className="font-mono font-bold text-red-500">- {fmtBRL(commission)}</span>
              </div>
              <div className="flex justify-between py-3 bg-gold/10 rounded-xl px-4 border border-gold/20">
                <span className="font-semibold text-[var(--color-text)]">Você recebe/mês</span>
                <span className="text-xl font-bold text-gold font-mono">{fmtBRL(netOwner)}</span>
              </div>

              {/* CTA pós-resultado */}
              <div className="mt-6 text-center">
                <p className="text-[var(--color-text)] font-semibold">Quer ajuda para chegar nesse valor?</p>
                <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=Olá! Vi a calculadora no site e tenho um ${preset.type} no Leblon. Gostaria de saber mais sobre a gestão.`}
                  target="_blank" rel="noopener"
                  className="inline-flex items-center gap-2 mt-3 bg-green-600 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors">
                  <MessageCircle className="h-4 w-4" /> Falar comigo
                </a>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Diferenciais */}
      <section className="bg-[var(--color-surface)] border-y border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Shield, title: 'Transparência total', desc: 'Você acessa todos os dados: reservas, receitas, despesas. Relatório mensal em PDF.' },
              { icon: Star, title: 'Superhost desde 2023', desc: 'Avaliação acima de 4.8 em todos os imóveis. Hóspedes satisfeitos = mais reservas.' },
              { icon: Clock, title: 'Sem contrato longo', desc: 'Comece quando quiser, pare quando quiser. Sem fidelidade, sem multa.' },
            ].map(d => (
              <div key={d.title} className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center shrink-0"><d.icon className="h-5 w-5 text-gold" /></div>
                <div><h3 className="text-sm font-semibold text-[var(--color-text)]">{d.title}</h3><p className="text-xs text-[var(--color-text-secondary)] mt-1 leading-relaxed">{d.desc}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. CTA FINAL + Formulário */}
      <section className="max-w-6xl mx-auto px-4 py-12 md:py-16">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="font-display text-2xl text-[var(--color-text)]">Quero entender o potencial do meu imóvel</h2>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Preencha abaixo e a gente te responde rápido</p>

          <div className="mt-6 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6 text-left space-y-4">
            <div>
              <label className="text-[10px] text-[var(--color-text-secondary)] font-medium uppercase tracking-wider block mb-1">Seu nome</label>
              <input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Como prefere ser chamado?" className="w-full border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm bg-[var(--color-bg)] text-[var(--color-text)] focus:border-gold focus:ring-1 focus:ring-gold/30" />
            </div>
            <div>
              <label className="text-[10px] text-[var(--color-text-secondary)] font-medium uppercase tracking-wider block mb-1">WhatsApp</label>
              <input type="tel" value={formWhatsApp} onChange={e => setFormWhatsApp(e.target.value)} placeholder="(21) 99999-9999" className="w-full border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm bg-[var(--color-bg)] text-[var(--color-text)] focus:border-gold focus:ring-1 focus:ring-gold/30" />
            </div>
            <div>
              <label className="text-[10px] text-[var(--color-text-secondary)] font-medium uppercase tracking-wider block mb-1">Link do imóvel (opcional)</label>
              <input type="url" value={formLink} onChange={e => setFormLink(e.target.value)} placeholder="Link do Airbnb, Booking ou anúncio" className="w-full border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm bg-[var(--color-bg)] text-[var(--color-text)] focus:border-gold focus:ring-1 focus:ring-gold/30" />
            </div>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Olá! Sou ${formName || 'proprietário'} e tenho interesse em gestão para meu imóvel no Leblon.${formLink ? ` Link: ${formLink}` : ''}`)}`}
              target="_blank" rel="noopener"
              className="w-full bg-gold text-gold-foreground py-3 rounded-xl font-semibold text-sm hover:bg-gold-dark transition-colors flex items-center justify-center gap-2"
            >
              <MessageCircle className="h-4 w-4" /> Cadastrar meu imóvel
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--color-surface)] border-t border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2"><Image src="/images/logo.png" alt="Sua Casa Leblon" width={24} height={24} className="rounded" /><span className="font-display text-sm text-[var(--color-text)]">Sua Casa Leblon</span></div>
            <p className="text-xs text-[var(--color-text-secondary)]">© {new Date().getFullYear()} AL Gestão — Aluguéis de Temporada no Leblon.</p>
            <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener" className="text-xs text-green-600 font-medium hover:text-green-700">WhatsApp: +55 21 99536-0322</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
