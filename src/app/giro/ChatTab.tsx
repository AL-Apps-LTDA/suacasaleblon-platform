'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Trash2, Pencil, ArrowLeft, Send, X, Loader2, MessageSquare } from 'lucide-react'

interface Chat { id: string; name: string; created_by: string; participants: string[]; updated_at: string }
interface Message { id: string; chat_id: string; sender_id: string; content: string; created_at: string }
interface AppUser { id: string; display_name: string; username: string; role: string }

interface Props { t: any; token: string; user: AppUser; allUsers: AppUser[] }

export default function ChatTab({ t, token, user, allUsers }: Props) {
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [activeChat, setActiveChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [msgLoading, setMsgLoading] = useState(false)
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [creating, setCreating] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const h = { Authorization: `Basic ${token}`, 'Content-Type': 'application/json' }
  const isAdm = user.role === 'admin'

  const loadChats = useCallback(async () => {
    try {
      const r = await fetch('/api/limpezas?action=chats', { headers: { Authorization: `Basic ${token}` } })
      if (r.ok) {
        const d = await r.json()
        // Show only chats where user is participant
        const mine = (Array.isArray(d) ? d : []).filter((c: Chat) => c.participants?.includes(user.id) || isAdm)
        setChats(mine.sort((a: Chat, b: Chat) => (b.updated_at || '').localeCompare(a.updated_at || '')))
      }
    } catch { }
    setLoading(false)
  }, [token, user.id, isAdm])

  useEffect(() => { loadChats() }, [loadChats])

  const loadMessages = useCallback(async (chatId: string) => {
    try {
      const r = await fetch(`/api/limpezas?action=messages&chat_id=${chatId}`, { headers: { Authorization: `Basic ${token}` } })
      if (r.ok) { const d = await r.json(); setMessages(Array.isArray(d) ? d : []) }
    } catch { }
  }, [token])

  function openChat(chat: Chat) {
    setActiveChat(chat)
    setMsgLoading(true)
    loadMessages(chat.id).then(() => setMsgLoading(false))
    // Poll every 5s
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(() => loadMessages(chat.id), 5000)
  }

  function closeChat() {
    setActiveChat(null)
    setMessages([])
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    loadChats()
  }

  useEffect(() => { return () => { if (pollRef.current) clearInterval(pollRef.current) } }, [])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function sendMessage() {
    if (!newMsg.trim() || !activeChat) return
    setSending(true)
    try {
      await fetch('/api/limpezas', { method: 'POST', headers: h, body: JSON.stringify({ action: 'send-message', chat_id: activeChat.id, sender_id: user.id, content: newMsg.trim() }) })
      setNewMsg('')
      await loadMessages(activeChat.id)
    } catch { }
    setSending(false)
  }

  async function createChat() {
    if (selectedUsers.length === 0) return
    setCreating(true)
    // Admin always included
    const adminUser = allUsers.find(u => u.role === 'admin')
    const participants = [...new Set([...selectedUsers, ...(adminUser ? [adminUser.id] : []), user.id])]
    try {
      await fetch('/api/limpezas', { method: 'POST', headers: h, body: JSON.stringify({ action: 'create-chat', name: newName.trim() || null, participants, created_by: user.id }) })
      setShowNew(false); setNewName(''); setSelectedUsers([])
      loadChats()
    } catch { }
    setCreating(false)
  }

  async function deleteChat(id: string) {
    try {
      await fetch('/api/limpezas', { method: 'POST', headers: h, body: JSON.stringify({ action: 'delete', table: 'chats', id }) })
      setDeleteConfirm(null)
      loadChats()
    } catch { }
  }

  function getUserName(id: string) {
    return allUsers.find(u => u.id === id)?.display_name || 'Desconhecido'
  }

  function participantNames(chat: Chat) {
    return (chat.participants || []).map(id => getUserName(id)).join(', ')
  }

  function formatTime(ts: string) {
    try { const d = new Date(ts); return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}` } catch { return '' }
  }

  const inputS = (extra?: any): any => ({ width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 13, background: t.inputBg, border: `1.5px solid ${t.inputBorder}`, color: t.textPrimary, outline: 'none', boxSizing: 'border-box' as const, ...extra })

  // ─── CHAT CONVERSATION VIEW ───
  if (activeChat) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 110px)', maxWidth: 600, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ padding: '10px 12px', borderBottom: `1.5px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={closeChat} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <ArrowLeft size={20} style={{ color: t.gold }} />
          </button>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary }}>{activeChat.name || 'Chat'}</div>
            <div style={{ fontSize: 9, color: t.textSecondary }}>{participantNames(activeChat)}</div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
          {msgLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}><Loader2 size={18} style={{ animation: 'spin 1s linear infinite', color: t.gold }} /></div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: t.textSecondary, fontSize: 12 }}>Nenhuma mensagem ainda</div>
          ) : (
            messages.map(msg => {
              const isMine = msg.sender_id === user.id
              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
                  <div style={{ maxWidth: '75%', padding: '10px 14px', borderRadius: isMine ? '12px 12px 0 12px' : '12px 12px 12px 0',
                    background: isMine ? t.gold : t.cardBg,
                    border: isMine ? 'none' : `1.5px solid ${t.border}`,
                    color: isMine ? '#fff' : t.textPrimary }}>
                    {!isMine && <div style={{ fontSize: 10, fontWeight: 700, color: t.gold, marginBottom: 3 }}>{getUserName(msg.sender_id)}</div>}
                    <div style={{ fontSize: 13, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                    <div style={{ fontSize: 9, color: isMine ? 'rgba(255,255,255,0.6)' : t.textSecondary, textAlign: 'right', marginTop: 4 }}>{formatTime(msg.created_at)}</div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '8px 10px', borderTop: `1.5px solid ${t.border}`, display: 'flex', gap: 8, alignItems: 'center' }}>
          <input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
            placeholder="Digite uma mensagem..." style={inputS({ flex: 1 })} />
          <button onClick={sendMessage} disabled={sending || !newMsg.trim()}
            style={{ width: 40, height: 40, borderRadius: 10, border: `1.5px solid ${t.gold}50`, background: t.gold + '15', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: sending ? 0.5 : 1 }}>
            <Send size={16} style={{ color: t.gold }} />
          </button>
        </div>
      </div>
    )
  }

  // ─── CHAT LIST VIEW ───
  return (
    <div style={{ padding: '12px 10px', maxWidth: 600, margin: '0 auto' }}>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: t.gold }} /></div>
      ) : chats.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: t.textSecondary, fontSize: 13 }}>Nenhuma conversa</div>
      ) : (
        chats.map(chat => (
          <div key={chat.id} style={{ background: t.cardBg, border: `1.5px solid ${t.border}`, borderRadius: 12, padding: '12px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div onClick={() => openChat(chat)} style={{ flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 20, background: t.gold + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MessageSquare size={18} style={{ color: t.gold }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary }}>{chat.name || 'Conversa'}</div>
                <div style={{ fontSize: 10, color: t.textSecondary, marginTop: 1 }}>{participantNames(chat)}</div>
              </div>
            </div>
            {(isAdm || chat.created_by === user.id) && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {deleteConfirm === chat.id ? (
                  <>
                    <button onClick={() => deleteChat(chat.id)} style={{ fontSize: 9, padding: '3px 8px', borderRadius: 4, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer' }}>Sim</button>
                    <button onClick={() => setDeleteConfirm(null)} style={{ fontSize: 9, padding: '3px 8px', borderRadius: 4, border: `1px solid ${t.border}`, background: 'none', color: t.textSecondary, cursor: 'pointer' }}>Não</button>
                  </>
                ) : (
                  <button onClick={() => setDeleteConfirm(chat.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}><Trash2 size={14} style={{ color: '#ef4444' }} /></button>
                )}
              </div>
            )}
          </div>
        ))
      )}

      {/* FAB */}
      <button onClick={() => { setShowNew(true); setSelectedUsers([]) }} style={{ position: 'fixed', bottom: 72, right: 16, width: 48, height: 48, borderRadius: 12, border: `1.5px solid ${t.gold}50`, background: t.bg, color: t.gold, fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.15)', zIndex: 10 }}>
        <Plus size={22} />
      </button>

      {/* Modal Nova Conversa */}
      {showNew && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setShowNew(false)}>
          <div style={{ position: 'absolute', inset: 0, background: t.overlay }} />
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', width: '100%', maxWidth: 400, background: t.modalBg, borderRadius: 16, padding: '20px 16px', boxShadow: '0 4px 30px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: t.textPrimary }}>Nova Conversa</div>
              <button onClick={() => setShowNew(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} style={{ color: t.textSecondary }} /></button>
            </div>

            <input placeholder="Nome do grupo (opcional)" value={newName} onChange={e => setNewName(e.target.value)} style={inputS({ marginBottom: 12 })} />

            <div style={{ fontSize: 11, fontWeight: 600, color: t.textSecondary, marginBottom: 8 }}>Selecionar Participantes:</div>

            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8, marginBottom: 16 }}>
              {allUsers.map(u => {
                const checked = selectedUsers.includes(u.id) || u.id === user.id
                const isMe = u.id === user.id
                return (
                  <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: isMe ? 'default' : 'pointer', opacity: isMe ? 0.7 : 1 }}>
                    <input type="checkbox" checked={checked} disabled={isMe}
                      onChange={e => {
                        if (isMe) return
                        setSelectedUsers(prev => e.target.checked ? [...prev, u.id] : prev.filter(id => id !== u.id))
                      }}
                      style={{ width: 18, height: 18, accentColor: t.gold }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: t.textPrimary }}>{u.display_name}</span>
                    {u.role === 'admin' && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: t.gold, color: '#fff' }}>Admin</span>}
                  </label>
                )
              })}
            </div>

            <button onClick={createChat} disabled={creating || selectedUsers.length === 0}
              style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: `1.5px solid ${t.gold}50`, background: t.gold + '15', color: t.gold, fontSize: 14, fontWeight: 700, cursor: creating ? 'wait' : 'pointer', opacity: creating || selectedUsers.length === 0 ? 0.5 : 1 }}>
              {creating ? 'Criando...' : 'Criar Conversa'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
