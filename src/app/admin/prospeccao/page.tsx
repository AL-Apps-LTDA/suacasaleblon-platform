'use client'

import { useState } from 'react'
import { Search, MapPin, Star, AlertTriangle, ExternalLink, Plus, Filter } from 'lucide-react'

interface Prospect {
  id: string
  platform: string
  title: string
  location: string
  rating: number | null
  reviews: number
  issues: string[]
  link: string
  ownerContact: string
  status: 'novo' | 'contactado' | 'negociando' | 'fechado' | 'descartado'
  notes: string
  addedAt: string
}

const STATUS_COLORS: Record<string, string> = {
  novo: 'bg-blue-500/15 text-blue-400',
  contactado: 'bg-yellow-500/15 text-yellow-400',
  negociando: 'bg-[#c9a96e]/15 text-[#c9a96e]',
  fechado: 'bg-emerald-500/15 text-emerald-400',
  descartado: 'bg-[#94918a]/15 text-[#94918a]',
}

const ISSUE_TAGS = [
  'Fotos ruins', 'Preço abaixo do mercado', 'Pouca ocupação', 
  'Sem manutenção', 'Resposta lenta', 'Sem Superhost',
  'Descrição fraca', 'Poucos reviews', 'Nota baixa'
]

export default function ProspeccaoPage() {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    platform: 'airbnb',
    title: '',
    location: 'Leblon',
    link: '',
    rating: '',
    issues: [] as string[],
    notes: '',
  })

  function addProspect() {
    const p: Prospect = {
      id: Date.now().toString(),
      platform: form.platform,
      title: form.title,
      location: form.location,
      rating: form.rating ? parseFloat(form.rating) : null,
      reviews: 0,
      issues: form.issues,
      link: form.link,
      ownerContact: '',
      status: 'novo',
      notes: form.notes,
      addedAt: new Date().toISOString(),
    }
    setProspects([p, ...prospects])
    setForm({ platform: 'airbnb', title: '', location: 'Leblon', link: '', rating: '', issues: [], notes: '' })
    setShowForm(false)
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#f0eee8]">Prospecção</h1>
          <p className="text-xs text-[#94918a] mt-0.5">
            Encontre listings subaproveitados no Leblon para oferecer gestão completa
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 bg-[#c9a96e] text-[#1a1207] px-4 py-2 rounded-lg text-xs font-semibold hover:bg-[#dbc192] transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Novo Prospect
        </button>
      </div>

      {/* Quick search tip */}
      <div className="bg-[#c9a96e]/5 border border-[#c9a96e]/20 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-[#f0eee8] flex items-center gap-2">
          <Search className="h-4 w-4 text-[#c9a96e]" />
          Como encontrar oportunidades
        </h3>
        <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-[#94918a]">
          <div className="bg-[#16161a] rounded-lg p-3">
            <p className="text-[#f0eee8] font-semibold mb-1">Airbnb</p>
            <p>Busque "Leblon" → filtre por studios/1qt → ordene por "mais recentes" → procure notas baixas, fotos amadoras, poucos reviews</p>
          </div>
          <div className="bg-[#16161a] rounded-lg p-3">
            <p className="text-[#f0eee8] font-semibold mb-1">Booking.com</p>
            <p>Busque Leblon → filtre "Apartamentos" → ordene por nota crescente → identifique anúncios com problemas visíveis</p>
          </div>
          <div className="bg-[#16161a] rounded-lg p-3">
            <p className="text-[#f0eee8] font-semibold mb-1">ZAP / VivaReal / OLX</p>
            <p>Busque studios/conjugados no Leblon pra aluguel → donos que podem querer migrar pra temporada</p>
          </div>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-[#16161a] border border-[#c9a96e]/20 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-[#f0eee8]">Adicionar prospect</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] text-[#94918a] uppercase tracking-wider block mb-1">Plataforma</label>
              <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} className="w-full bg-[#1e1e24] border border-[#2a2a30] rounded-lg px-3 py-2 text-xs text-[#f0eee8]">
                <option value="airbnb">Airbnb</option>
                <option value="booking">Booking.com</option>
                <option value="zap">ZAP Imóveis</option>
                <option value="vivareal">VivaReal</option>
                <option value="olx">OLX</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[#94918a] uppercase tracking-wider block mb-1">Título do anúncio</label>
              <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Studio no Leblon..." className="w-full bg-[#1e1e24] border border-[#2a2a30] rounded-lg px-3 py-2 text-xs text-[#f0eee8]" />
            </div>
            <div>
              <label className="text-[10px] text-[#94918a] uppercase tracking-wider block mb-1">Nota</label>
              <input type="text" value={form.rating} onChange={e => setForm(f => ({ ...f, rating: e.target.value }))} placeholder="4.2" className="w-full bg-[#1e1e24] border border-[#2a2a30] rounded-lg px-3 py-2 text-xs text-[#f0eee8]" />
            </div>
            <div>
              <label className="text-[10px] text-[#94918a] uppercase tracking-wider block mb-1">Link</label>
              <input type="text" value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))} placeholder="https://..." className="w-full bg-[#1e1e24] border border-[#2a2a30] rounded-lg px-3 py-2 text-xs text-[#f0eee8]" />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-[#94918a] uppercase tracking-wider block mb-2">Problemas identificados</label>
            <div className="flex flex-wrap gap-1.5">
              {ISSUE_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => setForm(f => ({
                    ...f,
                    issues: f.issues.includes(tag) ? f.issues.filter(t => t !== tag) : [...f.issues, tag]
                  }))}
                  className={`text-[10px] px-2.5 py-1 rounded-full transition-all ${
                    form.issues.includes(tag)
                      ? 'bg-[#c9a96e] text-[#1a1207] font-semibold'
                      : 'bg-[#1e1e24] text-[#94918a] hover:text-[#f0eee8]'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] text-[#94918a] uppercase tracking-wider block mb-1">Notas</label>
            <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Observações..." className="w-full bg-[#1e1e24] border border-[#2a2a30] rounded-lg px-3 py-2 text-xs text-[#f0eee8]" />
          </div>

          <div className="flex gap-2">
            <button onClick={addProspect} disabled={!form.title} className="bg-[#c9a96e] text-[#1a1207] px-4 py-2 rounded-lg text-xs font-semibold hover:bg-[#dbc192] disabled:opacity-50">Salvar</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-xs text-[#94918a] border border-[#2a2a30]">Cancelar</button>
          </div>
        </div>
      )}

      {/* Prospects list */}
      {prospects.length === 0 && !showForm ? (
        <div className="bg-[#16161a] border border-[#2a2a30] rounded-xl p-8 text-center">
          <Search className="h-8 w-8 text-[#c9a96e]/30 mx-auto mb-3" />
          <p className="text-sm text-[#94918a]">Nenhum prospect cadastrado</p>
          <p className="text-xs text-[#94918a]/60 mt-1">Comece a buscar listings subaproveitados e adicione aqui</p>
        </div>
      ) : (
        <div className="space-y-2">
          {prospects.map(p => (
            <div key={p.id} className="bg-[#16161a] border border-[#2a2a30] rounded-xl p-4 hover:border-[#c9a96e]/30 transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#1e1e24] text-[#94918a] uppercase font-semibold">{p.platform}</span>
                  <span className="text-sm font-medium text-[#f0eee8]">{p.title}</span>
                  {p.rating && (
                    <span className="flex items-center gap-0.5 text-xs text-[#c9a96e]">
                      <Star className="h-3 w-3" /> {p.rating}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[p.status]}`}>{p.status}</span>
              </div>
              {p.issues.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {p.issues.map(issue => (
                    <span key={issue} className="text-[9px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 flex items-center gap-0.5">
                      <AlertTriangle className="h-2.5 w-2.5" /> {issue}
                    </span>
                  ))}
                </div>
              )}
              {p.link && (
                <a href={p.link} target="_blank" rel="noopener" className="text-[10px] text-[#c9a96e] hover:underline flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" /> Ver anúncio
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
