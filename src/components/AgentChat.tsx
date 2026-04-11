'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Bot, User, ChevronDown, ChevronUp } from 'lucide-react'

type Message = { role: 'user' | 'assistant'; content: string }

export function AgentChat() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setError('')

    const newMessages: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (e: any) {
      setError(e.message || 'Erro ao conectar com o agente.')
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div className="bg-[rgb(var(--adm-surface))] border border-[rgb(var(--adm-border))] rounded-xl overflow-hidden transition-all">
      {/* Header / input bar */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-7 h-7 rounded-lg bg-[rgb(var(--adm-accent)/0.12)] border border-[rgb(var(--adm-accent)/0.20)] flex items-center justify-center shrink-0">
          <Bot className="h-3.5 w-3.5 text-[rgb(var(--adm-accent))]" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          onFocus={() => setOpen(true)}
          placeholder="Pergunte algo, lance uma despesa, bloqueie uma data..."
          className="flex-1 bg-transparent text-sm text-[rgb(var(--adm-text))] placeholder:text-[rgb(var(--adm-muted)/0.60)] outline-none"
        />
        <div className="flex items-center gap-1.5 shrink-0">
          {input.trim() && (
            <button
              onClick={send}
              disabled={loading}
              className="w-7 h-7 rounded-lg bg-[rgb(var(--adm-accent))] flex items-center justify-center hover:bg-[rgb(var(--adm-accent-hover))] transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 text-white animate-spin" /> : <Send className="h-3.5 w-3.5 text-white" />}
            </button>
          )}
          {messages.length > 0 && (
            <button onClick={() => setOpen(o => !o)} className="w-7 h-7 rounded-lg hover:bg-[rgb(var(--adm-elevated))] flex items-center justify-center transition-colors">
              {open ? <ChevronUp className="h-4 w-4 text-[rgb(var(--adm-muted))]" /> : <ChevronDown className="h-4 w-4 text-[rgb(var(--adm-muted))]" />}
            </button>
          )}
        </div>
      </div>

      {/* Chat history */}
      {open && messages.length > 0 && (
        <div className="border-t border-[rgb(var(--adm-border))] max-h-80 overflow-y-auto px-4 py-3 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${m.role === 'assistant' ? 'bg-[rgb(var(--adm-accent)/0.12)]' : 'bg-[rgb(var(--adm-elevated))]'}`}>
                {m.role === 'assistant'
                  ? <Bot className="h-3 w-3 text-[rgb(var(--adm-accent))]" />
                  : <User className="h-3 w-3 text-[rgb(var(--adm-muted))]" />}
              </div>
              <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === 'assistant'
                  ? 'bg-[rgb(var(--adm-elevated))] text-[rgb(var(--adm-text))]'
                  : 'bg-[rgb(var(--adm-accent)/0.10)] text-[rgb(var(--adm-text))] border border-[rgb(var(--adm-accent)/0.15)]'
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-2.5">
              <div className="w-6 h-6 rounded-full bg-[rgb(var(--adm-accent)/0.12)] flex items-center justify-center shrink-0">
                <Bot className="h-3 w-3 text-[rgb(var(--adm-accent))]" />
              </div>
              <div className="bg-[rgb(var(--adm-elevated))] rounded-xl px-3 py-2.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--adm-accent)/0.60)] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--adm-accent)/0.60)] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--adm-accent)/0.60)] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          {error && <p className="text-xs text-red-400 px-1">{error}</p>}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  )
}
