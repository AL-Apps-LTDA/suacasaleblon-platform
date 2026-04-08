'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { Plus, Save, Trash2, Mail, ToggleLeft, ToggleRight, ChevronDown, ChevronUp, Eye, Send } from 'lucide-react'

const TRIGGER_LABELS: Record<string, string> = {
  on_booking: 'Na confirmação da reserva',
  days_before_checkin: 'Dias antes do check-in',
  day_of_checkin: 'No dia do check-in',
  days_after_checkout: 'Dias após o check-out',
  day_of_checkout: 'No dia do check-out',
  manual: 'Envio manual',
}

const VARIABLES_HELP = [
  { var: '{{guest_name}}', desc: 'Nome do hóspede' },
  { var: '{{guest_email}}', desc: 'Email do hóspede' },
  { var: '{{property_name}}', desc: 'Nome do apartamento' },
  { var: '{{property_code}}', desc: 'Código do apt (ex: 103)' },
  { var: '{{checkin_date}}', desc: 'Data de check-in' },
  { var: '{{checkout_date}}', desc: 'Data de check-out' },
  { var: '{{total_value}}', desc: 'Valor total' },
  { var: '{{nights}}', desc: 'Número de noites' },
]
interface Automation {
  id: string
  name: string
  subject_template: string
  body_html: string
  trigger_type: string
  trigger_days: number
  is_active: boolean
  send_to_guest: boolean
  send_to_owner: boolean
  send_to_admin: boolean
  custom_emails: string[] | null
  applies_to_source: string
  created_at: string
}

export default function EmailsPage() {
  const [automations, setAutomations] = useState<Automation[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Record<string, Partial<Automation>>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [testEmail, setTestEmail] = useState('')
  const [showVars, setShowVars] = useState(false)
  const sb = createBrowserClient()

  useEffect(() => { loadAutomations() }, [])

  async function loadAutomations() {
    const { data } = await sb.from('email_automations').select('*').order('created_at')
    setAutomations(data || [])
    setLoading(false)
  }
  function getEdit(id: string) {
    return editing[id] || {}
  }

  function updateEdit(id: string, field: string, value: any) {
    setEditing(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  }

  async function saveAutomation(auto: Automation) {
    setSaving(auto.id)
    const changes = editing[auto.id] || {}
    const { error } = await sb.from('email_automations')
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq('id', auto.id)
    if (!error) {
      setEditing(prev => { const n = { ...prev }; delete n[auto.id]; return n })
      await loadAutomations()
    }
    setSaving(null)
  }

  async function toggleActive(auto: Automation) {
    await sb.from('email_automations').update({ is_active: !auto.is_active }).eq('id', auto.id)
    await loadAutomations()
  }

  async function deleteAutomation(id: string) {
    if (!confirm('Excluir esta automação?')) return
    await sb.from('email_automations').delete().eq('id', id)
    await loadAutomations()
  }
  async function createNew() {
    const { data } = await sb.from('email_automations').insert({
      name: 'Novo Email',
      subject_template: 'Assunto — {{property_name}}',
      body_html: '<p>Edite o conteúdo deste email.</p>',
      trigger_type: 'manual',
      trigger_days: 0,
      is_active: false,
      send_to_guest: true,
      send_to_owner: false,
      send_to_admin: false,
    }).select().single()
    if (data) {
      await loadAutomations()
      setExpandedId(data.id)
    }
  }

  async function sendTest(auto: Automation) {
    const email = testEmail || 'ditavares@gmail.com'
    try {
      const res = await fetch('/api/emails/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ automationId: auto.id, testEmail: email }),
      })
      if (res.ok) alert(`Email de teste enviado para ${email}!`)
      else alert('Erro ao enviar teste')
    } catch { alert('Erro ao enviar teste') }
  }

  const merged = (auto: Automation) => ({ ...auto, ...getEdit(auto.id) })
  const hasChanges = (id: string) => Object.keys(editing[id] || {}).length > 0
  if (loading) return <div className="p-8 text-center text-[rgb(var(--adm-muted))]">Carregando...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[rgb(var(--adm-text))]">Emails Automáticos</h1>
          <p className="text-xs text-[rgb(var(--adm-muted))] mt-1">Configure mensagens automáticas para hóspedes e proprietários</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowVars(!showVars)} className="px-3 py-2 text-xs rounded-lg border border-[rgb(var(--adm-border))] text-[rgb(var(--adm-muted))] hover:bg-[rgb(var(--adm-surface))]">
            {'{{ }}'} Variáveis
          </button>
          <button onClick={createNew} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-[rgb(var(--adm-accent))] text-white hover:opacity-90">
            <Plus className="h-3.5 w-3.5" /> Novo Email
          </button>
        </div>
      </div>

      {showVars && (
        <div className="bg-[rgb(var(--adm-surface))] border border-[rgb(var(--adm-border))] rounded-xl p-4">
          <p className="text-xs font-medium text-[rgb(var(--adm-text))] mb-2">Variáveis disponíveis (use no assunto e corpo):</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {VARIABLES_HELP.map(v => (
              <div key={v.var} className="text-xs"><code className="text-[rgb(var(--adm-accent))]">{v.var}</code> <span className="text-[rgb(var(--adm-muted))]">— {v.desc}</span></div>
            ))}
          </div>
        </div>
      )}
      <div className="space-y-3">
        {automations.map(auto => {
          const m = merged(auto)
          const isOpen = expandedId === auto.id
          return (
            <div key={auto.id} className="bg-[rgb(var(--adm-surface))] border border-[rgb(var(--adm-border))] rounded-xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => setExpandedId(isOpen ? null : auto.id)}>
                <button onClick={(e) => { e.stopPropagation(); toggleActive(auto) }} className="shrink-0" title={auto.is_active ? 'Ativo' : 'Inativo'}>
                  {auto.is_active ? <ToggleRight className="h-5 w-5 text-emerald-500" /> : <ToggleLeft className="h-5 w-5 text-[rgb(var(--adm-muted))]" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[rgb(var(--adm-text))] truncate">{auto.name}</p>
                  <p className="text-[10px] text-[rgb(var(--adm-muted))]">
                    {TRIGGER_LABELS[auto.trigger_type] || auto.trigger_type}
                    {auto.trigger_days > 0 && ` (${auto.trigger_days} dias)`}
                    {' · '}
                    {[auto.send_to_guest && 'Hóspede', auto.send_to_owner && 'Proprietário', auto.send_to_admin && 'Admin'].filter(Boolean).join(', ') || 'Ninguém'}
                  </p>
                </div>
                {isOpen ? <ChevronUp className="h-4 w-4 text-[rgb(var(--adm-muted))]" /> : <ChevronDown className="h-4 w-4 text-[rgb(var(--adm-muted))]" />}
              </div>
              {/* Expanded editor */}
              {isOpen && (
                <div className="border-t border-[rgb(var(--adm-border))] px-4 py-4 space-y-4">
                  {/* Name */}
                  <div>
                    <label className="text-[10px] text-[rgb(var(--adm-muted))] font-medium uppercase tracking-wider block mb-1">Nome da automação</label>
                    <input value={m.name} onChange={e => updateEdit(auto.id, 'name', e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-[rgb(var(--adm-bg))] border border-[rgb(var(--adm-border))] text-[rgb(var(--adm-text))]" />
                  </div>

                  {/* Trigger */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-[rgb(var(--adm-muted))] font-medium uppercase tracking-wider block mb-1">Gatilho</label>
                      <select value={m.trigger_type} onChange={e => updateEdit(auto.id, 'trigger_type', e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg bg-[rgb(var(--adm-bg))] border border-[rgb(var(--adm-border))] text-[rgb(var(--adm-text))]">
                        {Object.entries(TRIGGER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    {(m.trigger_type === 'days_before_checkin' || m.trigger_type === 'days_after_checkout') && (
                      <div>
                        <label className="text-[10px] text-[rgb(var(--adm-muted))] font-medium uppercase tracking-wider block mb-1">Quantos dias</label>
                        <input type="number" min={1} value={m.trigger_days} onChange={e => updateEdit(auto.id, 'trigger_days', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 text-sm rounded-lg bg-[rgb(var(--adm-bg))] border border-[rgb(var(--adm-border))] text-[rgb(var(--adm-text))]" />
                      </div>
                    )}
                  </div>