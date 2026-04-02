'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Pencil, Phone, X, Loader2 } from 'lucide-react'

const CATEGORIES = [
  { value: 'porteiros', label: 'Porteiros', icon: '🛡' },
  { value: 'manutencao', label: 'Manutenção', icon: '🔧' },
  { value: 'limpeza', label: 'Limpeza', icon: '🧹' },
  { value: 'emergencia', label: 'Emergência', icon: '🚨' },
  { value: 'outros', label: 'Outros', icon: '👥' },
] as const

interface Contact {
  id: string; name: string; phone?: string; role?: string; category: string; notes?: string; created_by?: string; created_at?: string
}

interface Props { t: any; token: string; userId?: string }

export default function ContactsTab({ t, token, userId }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Contact | null>(null)
  const [form, setForm] = useState({ name: '', phone: '', role: '', category: 'porteiros', notes: '' })
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const h = { Authorization: `Basic ${token}`, 'Content-Type': 'application/json' }

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/limpezas?action=contacts', { headers: { Authorization: `Basic ${token}` } })
      if (r.ok) { const d = await r.json(); setContacts(Array.isArray(d) ? d : []) }
    } catch { }
    setLoading(false)
  }, [token])

  useEffect(() => { load() }, [load])

  function openNew() {
    setEditing(null)
    setForm({ name: '', phone: '', role: '', category: 'porteiros', notes: '' })
    setShowForm(true)
  }

  function openEdit(c: Contact) {
    setEditing(c)
    setForm({ name: c.name, phone: c.phone || '', role: c.role || '', category: c.category || 'outros', notes: c.notes || '' })
    setShowForm(true)
  }

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)
    const action = editing ? 'update-contact' : 'create-contact'
    const body: any = { action, ...form, created_by: userId }
    if (editing) body.id = editing.id
    try {
      const r = await fetch('/api/limpezas', { method: 'POST', headers: h, body: JSON.stringify(body) })
      if (r.ok) { setShowForm(false); load() }
    } catch { }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    try {
      await fetch('/api/limpezas', { method: 'POST', headers: h, body: JSON.stringify({ action: 'delete', table: 'contacts', id }) })
      setDeleteConfirm(null)
      load()
    } catch { }
  }

  function phoneHref(phone: string) {
    const clean = phone.replace(/\D/g, '')
    return `tel:+${clean.startsWith('55') ? clean : '55' + clean}`
  }

  function whatsHref(phone: string) {
    const clean = phone.replace(/\D/g, '')
    return `https://wa.me/${clean.startsWith('55') ? clean : '55' + clean}`
  }

  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    items: contacts.filter(c => c.category === cat.value)
  })).filter(g => g.items.length > 0)

  const inputS = (extra?: any): any => ({ width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 13, background: t.inputBg, border: `1.5px solid ${t.inputBorder}`, color: t.textPrimary, outline: 'none', boxSizing: 'border-box' as const, ...extra })

  return (
    <div style={{ padding: '12px 10px', maxWidth: 600, margin: '0 auto' }}>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: t.gold }} /></div>
      ) : (
        <>
          {grouped.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: t.textSecondary, fontSize: 13 }}>
              Nenhum contato cadastrado
            </div>
          )}

          {grouped.map(group => (
            <div key={group.value} style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, padding: '0 4px' }}>
                <span style={{ fontSize: 14 }}>{group.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: t.textSecondary, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{group.label}</span>
              </div>

              {group.items.map(c => (
                <div key={c.id} style={{ background: t.cardBg, border: `1.5px solid ${t.border}`, borderRadius: 12, padding: '12px 14px', marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: t.textPrimary }}>{c.name}</div>
                      {c.role && <div style={{ fontSize: 11, color: t.textSecondary, marginTop: 2 }}>{c.role}</div>}
                      {c.phone && (
                        <a href={phoneHref(c.phone)} style={{ fontSize: 12, color: t.gold, textDecoration: 'underline', display: 'block', marginTop: 3 }}>{c.phone}</a>
                      )}
                      {c.notes && <div style={{ fontSize: 11, color: t.textSecondary, fontStyle: 'italic', marginTop: 4, lineHeight: 1.4 }}>{c.notes}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 8 }}>
                      {c.phone && (
                        <>
                          <a href={phoneHref(c.phone)} style={{ color: '#22c55e' }}><Phone size={16} /></a>
                          <a href={whatsHref(c.phone)} target="_blank" rel="noopener" style={{ fontSize: 16 }}>💬</a>
                        </>
                      )}
                      {(!c.created_by || c.created_by === userId || !userId) && (
                        <>
                          <button onClick={() => openEdit(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><Pencil size={14} style={{ color: t.gold }} /></button>
                          {deleteConfirm === c.id ? (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={() => handleDelete(c.id)} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer' }}>Sim</button>
                              <button onClick={() => setDeleteConfirm(null)} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, border: `1px solid ${t.border}`, background: 'none', color: t.textSecondary, cursor: 'pointer' }}>Não</button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteConfirm(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><Trash2 size={14} style={{ color: '#ef4444' }} /></button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </>
      )}

      {/* FAB */}
      <button onClick={openNew} style={{ position: 'fixed', bottom: 72, right: 16, width: 48, height: 48, borderRadius: 12, border: `1.5px solid ${t.gold}50`, background: t.bg, color: t.gold, fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.15)', zIndex: 10 }}>
        <Plus size={22} />
      </button>

      {/* Modal Novo/Editar */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setShowForm(false)}>
          <div style={{ position: 'absolute', inset: 0, background: t.overlay }} />
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', width: '100%', maxWidth: 400, maxHeight: '85vh', overflowY: 'auto' as const, background: t.modalBg, borderRadius: 16, padding: '20px 16px', boxShadow: '0 4px 30px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: t.textPrimary }}>{editing ? 'Editar Contato' : 'Novo Contato'}</div>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} style={{ color: t.textSecondary }} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
              <input placeholder="Nome *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputS()} />
              <input placeholder="Telefone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={inputS()} inputMode="tel" />
              <input placeholder="Cargo / Função *" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={inputS()} />

              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: t.textSecondary, marginBottom: 6 }}>Categoria:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
                  {CATEGORIES.map(cat => (
                    <button key={cat.value} onClick={() => setForm(f => ({ ...f, category: cat.value }))}
                      style={{ padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                        background: form.category === cat.value ? t.gold : t.cardBg,
                        color: form.category === cat.value ? '#fff' : t.textSecondary,
                      }}>
                      {cat.icon} {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <textarea placeholder="Observações" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} style={inputS({ resize: 'vertical' as const, fontFamily: 'inherit' })} />

              <button onClick={save} disabled={saving || !form.name.trim()}
                style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: `1.5px solid ${t.gold}50`, background: t.gold + '15', color: t.gold, fontSize: 14, fontWeight: 700, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.6 : 1, marginTop: 4 }}>
                {saving ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Adicionar Contato'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
