'use client'

import { TrendingUp } from 'lucide-react'

export default function DynamicPricingPage() {
  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[rgb(var(--adm-text))]">Dynamic Pricing</h1>
        <p className="text-xs text-[rgb(var(--adm-muted))] mt-0.5">Precificação dinâmica por apartamento</p>
      </div>

      <div className="bg-[rgb(var(--adm-surface))] border border-[rgb(var(--adm-border))] rounded-xl p-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[rgb(var(--adm-accent)/0.10)] border border-[rgb(var(--adm-accent)/0.20)] flex items-center justify-center mx-auto mb-4">
          <TrendingUp className="h-6 w-6 text-[rgb(var(--adm-accent))]" />
        </div>
        <h2 className="text-sm font-semibold text-[rgb(var(--adm-text))] mb-1">Em breve</h2>
        <p className="text-xs text-[rgb(var(--adm-muted))] max-w-sm mx-auto">
          Motor de precificação dinâmica próprio com ajuste automático baseado em ocupação, sazonalidade e demanda.
        </p>
      </div>
    </div>
  )
}
