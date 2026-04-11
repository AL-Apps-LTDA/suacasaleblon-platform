'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Send, Loader2, Bot, User, ChevronDown, ChevronUp,
  Mic, MicOff, Zap, Brain, MessageSquare, DollarSign,
  Calendar, FileText, Code2, Check, X, Plus, Minus
} from 'lucide-react'

type Message = { role: 'user' | 'assistant'; content: string }
type Model = 'haiku' | 'sonnet'
type Mode = 'consulta' | 'despesa' | 'agendar' | 'relatorio' | 'codigo'

const MODES: { id: Mode; label: string; icon: any; color: string; risk: string }[] = [
  { id: 'consulta',  label: 'Consulta',  icon: MessageSquare, color: 'text-sky-400 border-sky-400/30 bg-sky-400/10',     risk: 'zero' },
  { id: 'despesa',   label: 'Despesa',   icon: DollarSign,    color: 'text-amber-400 border-amber-400/30 bg-amber-400/10', risk: 'baixo' },
  { id: 'agendar',   label: 'Agendar',   icon: Calendar,      color: 'text-violet-400 border-violet-400/30 bg-violet-400/10', risk: 'baixo' },
  { id: 'relatorio', label: 'Relatório', icon: FileText,       color: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10', risk: 'zero' },
  { id: 'codigo',    label: 'Código',    icon: Code2,          color: 'text-red-400 border-red-400/30 bg-red-400/10',      risk: 'alto' },
]

type PendingCode = { branchName: string; diff: string; instruction: string; filePath: string } | null

export function AgentChat() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [model, setModel] = useState<Model>('haiku')
  const [mode, setMode] = useState<Mode>('consulta')
  const [listening, setListening] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [pendingCode, setPendingCode] = useState<PendingCode>(null)
  const [confirming, setConfirming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    setVoiceSupported(!!SR)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, pendingCode])

  const toggleVoice = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    if (listening) { recognitionRef.current?.stop(); setListening(false); return }
    const r = new SR()
    r.lang = 'pt-BR'; r.continuous = false; r.interimResults = false
    r.onstart = () => setListening(true)
    r.onresult = (e: any) => {
      setInput(prev => prev ? prev + ' ' + e.results[0][0].transcript : e.results[0][0].transcript)
      setOpen(true); inputRef.current?.focus()
    }
    r.onerror = () => setListening(false)
    r.onend = () => setListening(false)
    recognitionRef.current = r; r.start()
  }, [listening])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput(''); setError(''); setOpen(true)
    const newMessages: Message[] = [...messages, { role: 'user', content: `[${mode.toUpperCase()}] ${text}` }]
    setMessages(newMessages); setLoading(true)

    try {
      if (mode === 'codigo') {
        // Extrai filePath da instrução ou usa default
        const fileMatch = text.match(/src\/[^\s]+\.tsx?/)
        const filePath = fileMatch ? fileMatch[0] : 'src/app/admin/page.tsx'

        const res = await fetch('/api/agent/code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ instruction: text, filePath }),
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)

        setPendingCode({ branchName: data.branchName, diff: data.diff, instruction: text, filePath })
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Branch criada: \`${data.branchName}\`\n\nRevisando o que seria alterado em \`${data.filePath}\`...`
        }])
      } else {
        const res = await fetch('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: newMessages, model, mode }),
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      }
    } catch (e: any) {
      setError(e.message || 'Erro ao conectar.')
    } finally {
      setLoading(false)
    }
  }

  async function confirmCode() {
    if (!pendingCode) return
    setConfirming(true)
    try {
      const res = await fetch('/api/agent/code/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchName: pendingCode.branchName, instruction: pendingCode.instruction }),
      })
      const data = await res.json()
      if (data.ok) {
        setMessages(prev => [...prev, { role: 'assistant', content: '✅ Alteração aprovada e aplicada! Deploy em andamento...' }])
        setPendingCode(null)
      } else {
        throw new Error(data.error || 'Erro no merge')
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setConfirming(false)
    }
  }

  async function cancelCode() {
    if (!pendingCode) return
    // Deleta a branch via API
    await fetch('/api/agent/code/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branchName: pendingCode.branchName }),
    })
    setMessages(prev => [...prev, { role: 'assistant', content: '❌ Alteração cancelada. Branch deletada.' }])
    setPendingCode(null)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const currentMode = MODES.find(m => m.id === mode)!
  const isCodeMode = mode === 'codigo'

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${isCodeMode ? 'border-red-400/40 bg-red-400/5' : 'border-[rgb(var(--adm-border))] bg-[rgb(var(--adm-surface))]'}`}>

      {/* Seletor de modos */}
      <div className="flex items-center gap-1 px-3 pt-2.5 pb-1.5 overflow-x-auto">
        {MODES.map(m => (
          <button key={m.id} onClick={() => setMode(m.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all whitespace-nowrap ${
              mode === m.id ? m.color : 'text-[rgb(var(--adm-muted))] border-[rgb(var(--adm-border))] bg-transparent hover:text-[rgb(var(--adm-text))]'
            }`}>
            <m.icon className="h-3 w-3" />{m.label}
          </button>
        ))}
        {isCodeMode && (
          <span className="ml-auto text-[9px] text-red-400 font-semibold shrink-0 animate-pulse">⚠️ MODO CÓDIGO</span>
        )}
      </div>

      {/* Barra de input */}
      <div className="flex items-center gap-2 px-3 py-2">
        <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${currentMode.color} border`}>
          <currentMode.icon className="h-3 w-3" />
        </div>
        <input ref={inputRef} type="text" value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey} onFocus={() => setOpen(true)}
          placeholder={isCodeMode
            ? 'Descreva a alteração. Ex: muda cor do botão de sync para azul'
            : 'Pergunte, lance, agende...'}
          className="flex-1 bg-transparent text-sm text-[rgb(var(--adm-text))] placeholder:text-[rgb(var(--adm-muted)/0.55)] outline-none min-w-0"
        />
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setModel(m => m === 'haiku' ? 'sonnet' : 'haiku')}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
              model === 'sonnet' ? 'bg-violet-500/15 text-violet-400 border-violet-500/30' : 'bg-[rgb(var(--adm-elevated))] text-[rgb(var(--adm-muted))] border-[rgb(var(--adm-border))]'
            }`}>
            {model === 'sonnet' ? <Brain className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
            {model === 'haiku' ? 'Haiku' : 'Sonnet'}
          </button>
          {voiceSupported && (
            <button onClick={toggleVoice}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                listening ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse' : 'hover:bg-[rgb(var(--adm-elevated))] text-[rgb(var(--adm-muted))]'
              }`}>
              {listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            </button>
          )}
          {input.trim() && (
            <button onClick={send} disabled={loading}
              className="w-7 h-7 rounded-lg bg-[rgb(var(--adm-accent))] flex items-center justify-center hover:bg-[rgb(var(--adm-accent-hover))] transition-colors disabled:opacity-50">
              {loading ? <Loader2 className="h-3.5 w-3.5 text-white animate-spin" /> : <Send className="h-3.5 w-3.5 text-white" />}
            </button>
          )}
          {messages.length > 0 && (
            <button onClick={() => setOpen(o => !o)}
              className="w-7 h-7 rounded-lg hover:bg-[rgb(var(--adm-elevated))] flex items-center justify-center">
              {open ? <ChevronUp className="h-4 w-4 text-[rgb(var(--adm-muted))]" /> : <ChevronDown className="h-4 w-4 text-[rgb(var(--adm-muted))]" />}
            </button>
          )}
        </div>
      </div>

      {/* Histórico + diff */}
      {open && (messages.length > 0 || pendingCode) && (
        <div className="border-t border-[rgb(var(--adm-border))] max-h-96 overflow-y-auto px-4 py-3 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${m.role === 'assistant' ? 'bg-[rgb(var(--adm-accent)/0.12)]' : 'bg-[rgb(var(--adm-elevated))]'}`}>
                {m.role === 'assistant' ? <Bot className="h-3 w-3 text-[rgb(var(--adm-accent))]" /> : <User className="h-3 w-3 text-[rgb(var(--adm-muted))]" />}
              </div>
              <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === 'assistant' ? 'bg-[rgb(var(--adm-elevated))] text-[rgb(var(--adm-text))]' : 'bg-[rgb(var(--adm-accent)/0.10)] text-[rgb(var(--adm-text))] border border-[rgb(var(--adm-accent)/0.15)]'
              }`}>{m.content}</div>
            </div>
          ))}

          {/* Diff visual + botões */}
          {pendingCode && (
            <div className="border border-red-400/30 rounded-xl overflow-hidden">
              <div className="bg-red-400/10 px-3 py-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-red-400">📋 Revisão obrigatória — {pendingCode.filePath}</span>
              </div>
              <div className="bg-[rgb(var(--adm-elevated))] p-3 font-mono text-[11px] max-h-48 overflow-y-auto">
                {pendingCode.diff.split('\n').map((line, i) => (
                  <div key={i} className={`${line.startsWith('+') ? 'text-emerald-400 bg-emerald-400/10' : line.startsWith('-') ? 'text-red-400 bg-red-400/10' : 'text-[rgb(var(--adm-muted))]'} px-1 rounded`}>
                    {line}
                  </div>
                ))}
              </div>
              <div className="px-3 py-2.5 flex items-center gap-2 bg-[rgb(var(--adm-surface))]">
                <span className="text-[10px] text-[rgb(var(--adm-muted))] flex-1">Você revisou? Confirme para aplicar.</span>
                <button onClick={cancelCode} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 border border-red-400/30 hover:bg-red-400/10 transition-colors">
                  <X className="h-3 w-3" /> Cancelar
                </button>
                <button onClick={confirmCode} disabled={confirming} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-400 border border-emerald-400/30 hover:bg-emerald-400/10 transition-colors disabled:opacity-50">
                  {confirming ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  {confirming ? 'Aplicando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          )}

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
