'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Pencil, X, Loader2, Shield, CheckSquare, Wrench, Users, BookOpen, Tag, ClipboardList, Copy, Camera } from 'lucide-react'
import { LEBLON_APARTMENTS } from '@/lib/types'
import ContactsTab from './ContactsTab'

// ─── CONSTANTS ─────────────────────────────────────────
const APTS: string[] = [...LEBLON_APARTMENTS]
const CHECKLIST_CATEGORIES = ['Limpeza Geral', 'Banheiro', 'Cozinha', 'Quarto', 'Sala'] as const
const INVENTORY_CATEGORIES = ['Quarto', 'Banheiro', 'Cozinha', 'Sala', 'Geral'] as const
const URGENCY_OPTIONS = ['Baixa', 'Média', 'Alta'] as const

// ─── TYPES ─────────────────────────────────────────────
interface AppUser { id: string; username: string; display_name: string; role: string; pix_key?: string; created_at?: string }
interface ChecklistItem { id: string; title: string; category: string; is_recurring?: boolean; frequency_days?: number }
interface MaintenanceItem { id: string; title: string; description?: string; frequency_days?: number; apartment_code?: string; urgency: string; photos?: string[]; last_done_at?: string; next_due_date?: string; assigned_to?: string }
interface ExpenseCategory { id: string; name: string }
interface InventoryItem { id: string; item_name: string; quantity: number; category: string; apartment_code: string }

type SubTab = 'checklist' | 'manutencoes' | 'usuarios' | 'contatos' | 'inventario' | 'categorias'

interface GeralTabProps {
  t: any
  token: string
  user: AppUser
  isAdmin: boolean
}

const SUB_TABS: { key: SubTab; label: string; icon: React.ReactNode }[] = [
  { key: 'checklist', label: 'Checklist', icon: <CheckSquare size={16} /> },
  { key: 'manutencoes', label: 'Manutenções', icon: <Wrench size={16} /> },
  { key: 'usuarios', label: 'Usuários', icon: <Users size={16} /> },
  { key: 'contatos', label: 'Contatos', icon: <BookOpen size={16} /> },
  { key: 'inventario', label: 'Inventário', icon: <ClipboardList size={16} /> },
  { key: 'categorias', label: 'Categorias', icon: <Tag size={16} /> },
]

function apiH(token: string) { return { 'Authorization': `Basic ${token}`, 'Content-Type': 'application/json' } }

// ─── MODAL WRAPPER ─────────────────────────────────────
function Modal({ t, onClose, title, children }: { t: any; onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 999, background: t.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: t.modalBg, border: `1px solid ${t.border}`, borderRadius: 12, padding: 20, width: '100%', maxWidth: 420, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: t.textPrimary }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textSecondary, padding: 4 }}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── INPUT HELPER ──────────────────────────────────────
function Input({ t, label, value, onChange, type = 'text', placeholder }: { t: any; label: string; value: string | number; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: t.labelColor, marginBottom: 4, display: 'block' }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '8px 10px', fontSize: 14, borderRadius: 8, border: `1px solid ${t.inputBorder}`, background: t.inputBg, color: t.textPrimary, outline: 'none', boxSizing: 'border-box' }}
        onFocus={e => e.currentTarget.style.borderColor = t.inputFocus}
        onBlur={e => e.currentTarget.style.borderColor = t.inputBorder} />
    </div>
  )
}

function SelectInput({ t, label, value, onChange, options }: { t: any; label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: t.labelColor, marginBottom: 4, display: 'block' }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '8px 10px', fontSize: 14, borderRadius: 8, border: `1px solid ${t.inputBorder}`, background: t.inputBg, color: t.textPrimary, outline: 'none', boxSizing: 'border-box' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function Btn({ t, label, onClick, gold, red, disabled, icon }: { t: any; label: string; onClick: () => void; gold?: boolean; red?: boolean; disabled?: boolean; icon?: React.ReactNode }) {
  const bg = gold ? t.gold : red ? t.red : t.btnBg
  const color = gold || red ? '#fff' : t.btnText
  const border = gold ? t.gold : red ? t.red : t.btnBorder
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: `1px solid ${border}`, background: bg, color, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}>
      {icon}{label}
    </button>
  )
}

// ═══════════════════════════════════════════════════════
// CHECKLIST SUB-TAB
// ═══════════════════════════════════════════════════════
function ChecklistSubTab({ t, token, isAdmin }: { t: any; token: string; isAdmin: boolean }) {
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<string>(CHECKLIST_CATEGORIES[0])

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/limpezas?action=checklist-items', { headers: { Authorization: `Basic ${token}` } })
      if (r.ok) { const d = await r.json(); setItems(Array.isArray(d) ? d : []) }
    } catch { }
    setLoading(false)
  }, [token])

  useEffect(() => { load() }, [load])

  async function handleAdd() {
    if (!title.trim()) return
    // TODO: POST { action: 'create-checklist-item', title, category } — endpoint pending
    // For now, optimistically add to UI
    setItems(prev => [...prev, { id: `temp-${Date.now()}`, title: title.trim(), category }])
    setTitle('')
    setShowForm(false)
  }

  async function handleDelete(id: string) {
    try {
      await fetch('/api/limpezas', { method: 'POST', headers: apiH(token), body: JSON.stringify({ action: 'delete', table: 'checklist_items', id }) })
      setItems(prev => prev.filter(i => i.id !== id))
    } catch { }
  }

  const grouped = CHECKLIST_CATEGORIES.reduce((acc, cat) => {
    const filtered = items.filter(i => i.category === cat)
    if (filtered.length > 0) acc[cat] = filtered
    return acc
  }, {} as Record<string, ChecklistItem[]>)

  // Items without a recognized category
  const uncategorized = items.filter(i => !CHECKLIST_CATEGORIES.includes(i.category as any))
  if (uncategorized.length > 0) grouped['Outros'] = uncategorized

  if (loading) return <div style={{ textAlign: 'center', padding: 24, color: t.textSecondary }}><Loader2 size={20} className="animate-spin" style={{ display: 'inline-block' }} /> Carregando...</div>

  return (
    <div>
      {Object.entries(grouped).map(([cat, catItems]) => (
        <div key={cat} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.gold, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>{cat}</div>
          {catItems.map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: t.cardBg, border: `1px solid ${t.borderInner}`, borderRadius: 8, marginBottom: 4 }}>
              <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${t.border}`, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 14, color: t.textPrimary }}>{item.title}</span>
              {isAdmin && (
                <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.red, padding: 2 }}><Trash2 size={14} /></button>
              )}
            </div>
          ))}
        </div>
      ))}

      {items.length === 0 && <div style={{ textAlign: 'center', padding: 24, color: t.textSecondary, fontSize: 13 }}>Nenhuma tarefa cadastrada</div>}

      <div style={{ marginTop: 12 }}>
        <Btn t={t} label="+ Adicionar Tarefa" onClick={() => setShowForm(true)} gold icon={<Plus size={14} />} />
      </div>

      {showForm && (
        <Modal t={t} onClose={() => setShowForm(false)} title="Nova Tarefa">
          <Input t={t} label="Descrição" value={title} onChange={setTitle} placeholder="Ex: Limpar espelho do banheiro" />
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: t.labelColor, marginBottom: 6, display: 'block' }}>Categoria</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {CHECKLIST_CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setCategory(cat)}
                  style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, borderRadius: 6, border: `1px solid ${category === cat ? t.gold : t.btnBorder}`, background: category === cat ? t.goldBg : t.btnBg, color: category === cat ? t.gold : t.btnText, cursor: 'pointer' }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <Btn t={t} label="Salvar" onClick={handleAdd} gold />
        </Modal>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// MANUTENCOES SUB-TAB
// ═══════════════════════════════════════════════════════
function ManutencaoSubTab({ t, token, isAdmin }: { t: any; token: string; isAdmin: boolean }) {
  const [items, setItems] = useState<MaintenanceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('Todos')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<MaintenanceItem | null>(null)
  const [form, setForm] = useState({ title: '', description: '', frequency_days: '30', urgency: 'Média', apartment_code: '' })

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/limpezas?action=maintenance', { headers: { Authorization: `Basic ${token}` } })
      if (r.ok) { const d = await r.json(); setItems(Array.isArray(d) ? d : []) }
    } catch { }
    setLoading(false)
  }, [token])

  useEffect(() => { load() }, [load])

  function openNew() {
    setEditing(null)
    setForm({ title: '', description: '', frequency_days: '30', urgency: 'Média', apartment_code: '' })
    setShowForm(true)
  }

  function openEdit(item: MaintenanceItem) {
    setEditing(item)
    setForm({ title: item.title, description: item.description || '', frequency_days: String(item.frequency_days || 30), urgency: item.urgency || 'Média', apartment_code: item.apartment_code || '' })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.title.trim()) return
    try {
      const body: any = { action: 'upsert-maintenance', item: { title: form.title, description: form.description, frequency_days: parseInt(form.frequency_days) || 30, urgency: form.urgency, apartment_code: form.apartment_code || null } }
      if (editing) body.item.id = editing.id
      await fetch('/api/limpezas', { method: 'POST', headers: apiH(token), body: JSON.stringify(body) })
      setShowForm(false)
      load()
    } catch { }
  }

  async function handleMarkDone(id: string) {
    try {
      await fetch('/api/limpezas', { method: 'POST', headers: apiH(token), body: JSON.stringify({ action: 'mark-maintenance-done', id }) })
      load()
    } catch { }
  }

  async function handleDelete(id: string) {
    try {
      await fetch('/api/limpezas', { method: 'POST', headers: apiH(token), body: JSON.stringify({ action: 'delete', table: 'maintenance_items', id }) })
      setItems(prev => prev.filter(i => i.id !== id))
    } catch { }
  }

  const filtered = filter === 'Todos' ? items : items.filter(i => i.apartment_code === filter)

  const urgencyColor = (u: string) => {
    if (u === 'Alta') return { color: t.red, bg: t.redBg, border: t.redBorder }
    if (u === 'Baixa') return { color: t.green, bg: t.greenBg, border: t.greenBorder }
    return { color: t.yellow, bg: t.yellowBg, border: t.yellowBorder }
  }

  function fmtDate(s?: string) {
    if (!s) return null
    const [y, m, d] = s.split('T')[0].split('-').map(Number)
    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 24, color: t.textSecondary }}><Loader2 size={20} className="animate-spin" style={{ display: 'inline-block' }} /> Carregando...</div>

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <select value={filter} onChange={e => setFilter(e.target.value)}
          style={{ padding: '8px 10px', fontSize: 13, borderRadius: 8, border: `1px solid ${t.inputBorder}`, background: t.inputBg, color: t.textPrimary, outline: 'none' }}>
          <option value="Todos">Todos os apartamentos</option>
          {APTS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {filtered.map(item => {
        const uc = urgencyColor(item.urgency)
        const lastDone = fmtDate(item.last_done_at)
        return (
          <div key={item.id} style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 10, padding: 12, marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.yellow, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: t.textPrimary }}>{item.title}</span>
              {item.apartment_code && (
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: t.goldBg, color: t.gold, border: `1px solid ${t.gold}40` }}>{item.apartment_code}</span>
              )}
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: uc.bg, color: uc.color, border: `1px solid ${uc.border}` }}>{item.urgency}</span>
            </div>
            {item.description && <div style={{ fontSize: 13, color: t.textSecondary, marginBottom: 6, marginLeft: 16 }}>{item.description}</div>}
            <div style={{ fontSize: 12, color: lastDone ? t.green : t.red, marginLeft: 16, marginBottom: 8 }}>
              {lastDone ? `Última: ${lastDone}` : 'Nunca feito'}
            </div>
            <div style={{ display: 'flex', gap: 6, marginLeft: 16, flexWrap: 'wrap' }}>
              <Btn t={t} label="Marcar Feito" onClick={() => handleMarkDone(item.id)} gold />
              <button style={{ background: 'none', border: `1px solid ${t.btnBorder}`, borderRadius: 6, padding: '6px 8px', cursor: 'pointer', color: t.textSecondary }}><Camera size={14} /></button>
              {isAdmin && (
                <>
                  <button onClick={() => openEdit(item)} style={{ background: 'none', border: `1px solid ${t.btnBorder}`, borderRadius: 6, padding: '6px 8px', cursor: 'pointer', color: t.textSecondary }}><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: `1px solid ${t.redBorder}`, borderRadius: 6, padding: '6px 8px', cursor: 'pointer', color: t.red }}><Trash2 size={14} /></button>
                </>
              )}
            </div>
          </div>
        )
      })}

      {filtered.length === 0 && <div style={{ textAlign: 'center', padding: 24, color: t.textSecondary, fontSize: 13 }}>Nenhuma manutenção cadastrada</div>}

      {isAdmin && (
        <div style={{ marginTop: 12 }}>
          <Btn t={t} label="+ Nova Manutenção" onClick={openNew} gold icon={<Plus size={14} />} />
        </div>
      )}

      {showForm && (
        <Modal t={t} onClose={() => setShowForm(false)} title={editing ? 'Editar Manutenção' : 'Nova Manutenção'}>
          <Input t={t} label="Título" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} placeholder="Ex: Trocar filtro do ar" />
          <Input t={t} label="Descrição" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} placeholder="Detalhes opcionais" />
          <Input t={t} label="Frequência (dias)" value={form.frequency_days} onChange={v => setForm(f => ({ ...f, frequency_days: v }))} type="number" />
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: t.labelColor, marginBottom: 6, display: 'block' }}>Urgência</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {URGENCY_OPTIONS.map(u => {
                const uc = urgencyColor(u)
                return (
                  <button key={u} onClick={() => setForm(f => ({ ...f, urgency: u }))}
                    style={{ flex: 1, padding: '6px 10px', fontSize: 12, fontWeight: 600, borderRadius: 6, border: `1px solid ${form.urgency === u ? uc.color : t.btnBorder}`, background: form.urgency === u ? uc.bg : t.btnBg, color: form.urgency === u ? uc.color : t.btnText, cursor: 'pointer' }}>
                    {u}
                  </button>
                )
              })}
            </div>
          </div>
          <SelectInput t={t} label="Apartamento" value={form.apartment_code} onChange={v => setForm(f => ({ ...f, apartment_code: v }))}
            options={[{ value: '', label: 'Todos' }, ...APTS.map(a => ({ value: a, label: a }))]} />
          <Btn t={t} label={editing ? 'Salvar Alterações' : 'Criar'} onClick={handleSave} gold />
        </Modal>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// USUARIOS SUB-TAB
// ═══════════════════════════════════════════════════════
function UsuariosSubTab({ t, token, isAdmin }: { t: any; token: string; isAdmin: boolean }) {
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ display_name: '', username: '', password: '', role: 'cleaner' })
  const [copied, setCopied] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/limpezas?action=users', { headers: { Authorization: `Basic ${token}` } })
      if (r.ok) { const d = await r.json(); setUsers(Array.isArray(d) ? d : []) }
    } catch { }
    setLoading(false)
  }, [token])

  useEffect(() => { load() }, [load])

  async function handleCreate() {
    if (!form.display_name.trim() || !form.username.trim() || !form.password.trim()) return
    try {
      await fetch('/api/limpezas', { method: 'POST', headers: apiH(token), body: JSON.stringify({ action: 'create-user', username: form.username, password: form.password, display_name: form.display_name, role: form.role }) })
      setShowForm(false)
      setForm({ display_name: '', username: '', password: '', role: 'cleaner' })
      load()
    } catch { }
  }

  async function handleDelete(id: string) {
    try {
      await fetch('/api/limpezas', { method: 'POST', headers: apiH(token), body: JSON.stringify({ action: 'delete', table: 'app_users', id }) })
      setUsers(prev => prev.filter(u => u.id !== id))
    } catch { }
  }

  function copyPix(key: string) {
    navigator.clipboard.writeText(key).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 24, color: t.textSecondary }}><Loader2 size={20} className="animate-spin" style={{ display: 'inline-block' }} /> Carregando...</div>

  return (
    <div>
      {users.map(u => {
        const isAdminUser = u.role === 'admin'
        return (
          <div key={u.id} style={{ background: t.cardBg, border: `1px solid ${isAdminUser ? t.gold : t.border}`, borderRadius: 10, padding: 12, marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {isAdminUser && <Shield size={16} style={{ color: t.gold }} />}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary }}>{u.display_name}</div>
                <div style={{ fontSize: 12, color: t.textSecondary }}>@{u.username}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: isAdminUser ? t.goldBg : t.greenBg, color: isAdminUser ? t.gold : t.green, border: `1px solid ${isAdminUser ? t.gold : t.green}40` }}>
                {isAdminUser ? 'Admin' : 'Faxineiro(a)'}
              </span>
              {isAdmin && (
                <button onClick={() => handleDelete(u.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.red, padding: 4 }}><Trash2 size={14} /></button>
              )}
            </div>
            {!isAdminUser && u.pix_key && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, marginLeft: 24 }}>
                <span style={{ fontSize: 12, color: t.green, fontWeight: 600 }}>Pix: {u.pix_key}</span>
                <button onClick={() => copyPix(u.pix_key!)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: 11, fontWeight: 600, borderRadius: 6, border: `1px solid ${t.greenBorder}`, background: t.greenBg, color: t.green, cursor: 'pointer' }}>
                  <Copy size={12} /> {copied === u.pix_key ? 'Copiado!' : 'Copiar Pix'}
                </button>
              </div>
            )}
          </div>
        )
      })}

      {users.length === 0 && <div style={{ textAlign: 'center', padding: 24, color: t.textSecondary, fontSize: 13 }}>Nenhum usuário cadastrado</div>}

      {isAdmin && (
        <div style={{ marginTop: 12 }}>
          <Btn t={t} label="+ Novo Usuário" onClick={() => setShowForm(true)} gold icon={<Plus size={14} />} />
        </div>
      )}

      {showForm && (
        <Modal t={t} onClose={() => setShowForm(false)} title="Novo Usuário">
          <Input t={t} label="Nome completo" value={form.display_name} onChange={v => setForm(f => ({ ...f, display_name: v }))} placeholder="Ex: Maria Silva" />
          <Input t={t} label="Nome de usuário" value={form.username} onChange={v => setForm(f => ({ ...f, username: v }))} placeholder="Ex: maria" />
          <Input t={t} label="Senha" value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} type="password" />
          <SelectInput t={t} label="Função" value={form.role} onChange={v => setForm(f => ({ ...f, role: v }))}
            options={[{ value: 'cleaner', label: 'Faxineiro(a)' }, { value: 'admin', label: 'Administrador' }]} />
          <Btn t={t} label="Criar Usuário" onClick={handleCreate} gold />
        </Modal>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// INVENTARIO SUB-TAB
// ═══════════════════════════════════════════════════════
function InventarioSubTab({ t, token, isAdmin }: { t: any; token: string; isAdmin: boolean }) {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('Todos')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ item_name: '', quantity: '1', category: 'Geral', apartment_code: APTS[0] })

  const load = useCallback(async () => {
    try {
      // TODO: GET ?action=inventory-items — endpoint pending
      // For now, set empty
      setItems([])
    } catch { }
    setLoading(false)
  }, [token])

  useEffect(() => { load() }, [load])

  async function handleAdd() {
    if (!form.item_name.trim()) return
    // TODO: POST { action: 'create-inventory-item', item_name, quantity, category, apartment_code } — endpoint pending
    setItems(prev => [...prev, { id: `temp-${Date.now()}`, item_name: form.item_name.trim(), quantity: parseInt(form.quantity) || 1, category: form.category, apartment_code: form.apartment_code }])
    setForm({ item_name: '', quantity: '1', category: 'Geral', apartment_code: APTS[0] })
    setShowForm(false)
  }

  async function handleDelete(id: string) {
    try {
      await fetch('/api/limpezas', { method: 'POST', headers: apiH(token), body: JSON.stringify({ action: 'delete', table: 'inventory_items', id }) })
      setItems(prev => prev.filter(i => i.id !== id))
    } catch { }
  }

  const filtered = filter === 'Todos' ? items : items.filter(i => i.apartment_code === filter)

  if (loading) return <div style={{ textAlign: 'center', padding: 24, color: t.textSecondary }}><Loader2 size={20} className="animate-spin" style={{ display: 'inline-block' }} /> Carregando...</div>

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <select value={filter} onChange={e => setFilter(e.target.value)}
          style={{ padding: '8px 10px', fontSize: 13, borderRadius: 8, border: `1px solid ${t.inputBorder}`, background: t.inputBg, color: t.textPrimary, outline: 'none' }}>
          <option value="Todos">Todos os apartamentos</option>
          {APTS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {filtered.map(item => (
        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: t.cardBg, border: `1px solid ${t.borderInner}`, borderRadius: 8, marginBottom: 4 }}>
          <span style={{ flex: 1, fontSize: 14, color: t.textPrimary }}>{item.item_name}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary, minWidth: 28, textAlign: 'center' }}>{item.quantity}x</span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: t.goldBg, color: t.gold }}>{item.category}</span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: t.btnBg, color: t.btnText }}>{item.apartment_code}</span>
          {isAdmin && (
            <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.red, padding: 2 }}><Trash2 size={14} /></button>
          )}
        </div>
      ))}

      {filtered.length === 0 && <div style={{ textAlign: 'center', padding: 24, color: t.textSecondary, fontSize: 13 }}>Nenhum item no inventário</div>}

      <div style={{ marginTop: 12 }}>
        <Btn t={t} label="+ Adicionar Item" onClick={() => setShowForm(true)} gold icon={<Plus size={14} />} />
      </div>

      {showForm && (
        <Modal t={t} onClose={() => setShowForm(false)} title="Novo Item">
          <Input t={t} label="Nome do item" value={form.item_name} onChange={v => setForm(f => ({ ...f, item_name: v }))} placeholder="Ex: Toalha de banho" />
          <Input t={t} label="Quantidade" value={form.quantity} onChange={v => setForm(f => ({ ...f, quantity: v }))} type="number" />
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: t.labelColor, marginBottom: 6, display: 'block' }}>Categoria</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {INVENTORY_CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setForm(f => ({ ...f, category: cat }))}
                  style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, borderRadius: 6, border: `1px solid ${form.category === cat ? t.gold : t.btnBorder}`, background: form.category === cat ? t.goldBg : t.btnBg, color: form.category === cat ? t.gold : t.btnText, cursor: 'pointer' }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <SelectInput t={t} label="Apartamento" value={form.apartment_code} onChange={v => setForm(f => ({ ...f, apartment_code: v }))}
            options={APTS.map(a => ({ value: a, label: a }))} />
          <Btn t={t} label="Salvar" onClick={handleAdd} gold />
        </Modal>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// CATEGORIAS SUB-TAB
// ═══════════════════════════════════════════════════════
function CategoriasSubTab({ t, token, isAdmin }: { t: any; token: string; isAdmin: boolean }) {
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ExpenseCategory | null>(null)
  const [name, setName] = useState('')

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/limpezas?action=expense-categories', { headers: { Authorization: `Basic ${token}` } })
      if (r.ok) { const d = await r.json(); setCategories(Array.isArray(d) ? d : []) }
    } catch { }
    setLoading(false)
  }, [token])

  useEffect(() => { load() }, [load])

  function openNew() {
    setEditing(null)
    setName('')
    setShowForm(true)
  }

  function openEdit(cat: ExpenseCategory) {
    setEditing(cat)
    setName(cat.name)
    setShowForm(true)
  }

  async function handleSave() {
    if (!name.trim()) return
    // TODO: POST upsert expense category — endpoint pending
    if (editing) {
      setCategories(prev => prev.map(c => c.id === editing.id ? { ...c, name: name.trim() } : c))
    } else {
      setCategories(prev => [...prev, { id: `temp-${Date.now()}`, name: name.trim() }])
    }
    setShowForm(false)
  }

  async function handleDelete(id: string) {
    try {
      await fetch('/api/limpezas', { method: 'POST', headers: apiH(token), body: JSON.stringify({ action: 'delete', table: 'expense_categories', id }) })
      setCategories(prev => prev.filter(c => c.id !== id))
    } catch { }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 24, color: t.textSecondary }}><Loader2 size={20} className="animate-spin" style={{ display: 'inline-block' }} /> Carregando...</div>

  if (!isAdmin) return <div style={{ textAlign: 'center', padding: 24, color: t.textSecondary, fontSize: 13 }}>Acesso restrito a administradores</div>

  return (
    <div>
      {categories.map(cat => (
        <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: t.cardBg, border: `1px solid ${t.borderInner}`, borderRadius: 8, marginBottom: 4 }}>
          <span style={{ flex: 1, fontSize: 14, color: t.textPrimary }}>{cat.name}</span>
          <button onClick={() => openEdit(cat)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textSecondary, padding: 4 }}><Pencil size={14} /></button>
          <button onClick={() => handleDelete(cat.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.red, padding: 4 }}><Trash2 size={14} /></button>
        </div>
      ))}

      {categories.length === 0 && <div style={{ textAlign: 'center', padding: 24, color: t.textSecondary, fontSize: 13 }}>Nenhuma categoria cadastrada</div>}

      <div style={{ marginTop: 12 }}>
        <Btn t={t} label="+ Adicionar Categoria" onClick={openNew} gold icon={<Plus size={14} />} />
      </div>

      {showForm && (
        <Modal t={t} onClose={() => setShowForm(false)} title={editing ? 'Editar Categoria' : 'Nova Categoria'}>
          <Input t={t} label="Nome" value={name} onChange={setName} placeholder="Ex: Material de limpeza" />
          <Btn t={t} label={editing ? 'Salvar Alterações' : 'Criar'} onClick={handleSave} gold />
        </Modal>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════
export default function GeralTab({ t, token, user, isAdmin }: GeralTabProps) {
  const [subTab, setSubTab] = useState<SubTab>('checklist')

  return (
    <div>
      {/* Sub-tab navigation — flex-wrap row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        {SUB_TABS.map(st => (
          <button key={st.key} onClick={() => setSubTab(st.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', fontSize: 13, fontWeight: 600,
              borderRadius: 8,
              border: `1px solid ${subTab === st.key ? t.gold : t.btnBorder}`,
              background: subTab === st.key ? t.goldBg : t.btnBg,
              color: subTab === st.key ? t.gold : t.btnText,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}>
            {st.icon}
            {st.label}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      {subTab === 'checklist' && <ChecklistSubTab t={t} token={token} isAdmin={isAdmin} />}
      {subTab === 'manutencoes' && <ManutencaoSubTab t={t} token={token} isAdmin={isAdmin} />}
      {subTab === 'usuarios' && <UsuariosSubTab t={t} token={token} isAdmin={isAdmin} />}
      {subTab === 'contatos' && <ContactsTab t={t} token={token} userId={user?.id} />}
      {subTab === 'inventario' && <InventarioSubTab t={t} token={token} isAdmin={isAdmin} />}
      {subTab === 'categorias' && <CategoriasSubTab t={t} token={token} isAdmin={isAdmin} />}
    </div>
  )
}
