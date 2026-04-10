'use client'

import { useState } from 'react'
import { Users2, Settings2 } from 'lucide-react'

const SUBTABS = [
  { id: 'crm', label: 'CRM', icon: Users2 },
] as const

type SubtabId = typeof SUBTABS[number]['id']

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState<SubtabId>('crm')

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Settings2 className="h-5 w-5 text-[rgb(var(--adm-accent))]" />
          <h1 className="text-lg font-bold text-[rgb(var(--adm-text))]">Configurações</h1>
        </div>
        <p className="text-xs text-[rgb(var(--adm-muted))]">Gerencie as configurações do sistema</p>
      </div>

      {/* Subtabs */}
      <div className="flex gap-1 mb-6 border-b border-[rgb(var(--adm-border))]">
        {SUBTABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
                isActive
                  ? 'border-[rgb(var(--adm-accent))] text-[rgb(var(--adm-accent))]'
                  : 'border-transparent text-[rgb(var(--adm-muted))] hover:text-[rgb(var(--adm-text))]'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {activeTab === 'crm' && <CRMTab />}
    </div>
  )
}

function CRMTab() {
  return (
    <div className="bg-[rgb(var(--adm-surface))] border border-[rgb(var(--adm-border))] rounded-2xl p-10 flex flex-col items-center justify-center text-center min-h-[300px]">
      <div className="w-14 h-14 rounded-2xl bg-[rgb(var(--adm-accent)/0.10)] border border-[rgb(var(--adm-accent)/0.20)] flex items-center justify-center mb-4">
        <Users2 className="h-6 w-6 text-[rgb(var(--adm-accent))]" />
      </div>
      <h2 className="text-base font-semibold text-[rgb(var(--adm-text))] mb-2">CRM</h2>
      <p className="text-sm text-[rgb(var(--adm-muted))] max-w-sm">
        Configurações de CRM e pipeline de prospecção. Em breve.
      </p>
    </div>
  )
}
