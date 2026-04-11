'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, Bot, User, ChevronDown, ChevronUp, Mic, MicOff, Zap, Brain } from 'lucide-react'

type Message = { role: 'user' | 'assistant'; content: string }
type Model = 'haiku' | 'sonnet'

const MODEL_LABELS: Record<Model, string> = {
  haiku: 'Haiku',
  sonnet: 'Sonnet',
}

export function AgentChat() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [model, setModel] = useState<Model>('haiku')
  const [listening, setListening] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)

  // Detecta suporte a voz no navegador
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    setVoiceSupported(!!SpeechRecognition)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const toggleVoice = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return

    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'pt-BR'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => setListening(true)

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setInput(prev => (prev ? prev + ' ' + transcript : transcript))
      setOpen(true)
      inputRef.current?.focus()
    }

    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)

    recognitionRef.current = recognition
    recognition.start()
  }, [listening])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setError('')
    setOpen(true)

    const newMessages: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, model }),
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
    <div className="bg-[rgb(var(--adm-surface))] border border-[rgb(var(--adm-border))] rounded-xl overflow-hidden">

      {/* Barra principal */}
      <div className="flex items-center gap-2 px-3 py-2.5">

        {/* Ícone bot */}
        <div className="w-7 h-7 rounded-lg bg-[rgb(var(--adm-accent)/0.12)] border border-[rgb(var(--adm-accent)/0.20)] flex items-center justify-center shrink-0">
          <Bot className="h-3.5 w-3.5 text-[rgb(var(--adm-accent))]" />
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          onFocus={() => setOpen(true)}
          placeholder="Pergunte algo, lance uma despesa, bloqueie uma data..."
          className="flex-1 bg-transparent text-sm text-[rgb(var(--adm-text))] placeholder:text-[rgb(var(--adm-muted)/0.55)] outline-none min-w-0"
        />

        {/* Controles direita */}
        <div className="flex items-center gap-1 shrink-0">

          {/* Seletor de modelo */}
          <button
            onClick={() => setModel(m => m === 'haiku' ? 'sonnet' : 'haiku')}
            title={model === 'haiku' ? 'Haiku — rápido e econômico. Clique para Sonnet' : 'Sonnet — mais inteligente. Clique para Haiku'}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all border ${
              model === 'sonnet'
                ? 'bg-violet-500/15 text-violet-400 border-violet-500/30'
                : 'bg-[rgb(var(--adm-elevated))] text-[rgb(var(--adm-muted))] border-[rgb(var(--adm-border))] hover:text-[rgb(var(--adm-text))]'
            }`}
          >
            {model === 'sonnet' ? <Brain className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
            {MODEL_LABELS[model]}
          </button>

          {/* Microfone */}
          {voiceSupported && (
            <button
              onClick={toggleVoice}
              title={listening ? 'Parar gravação' : 'Falar com o agente'}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                listening
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                  : 'hover:bg-[rgb(var(--adm-elevated))] text-[rgb(var(--adm-muted))] hover:text-[rgb(var(--adm-text))]'
              }`}
            >
              {listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            </button>
          )}

          {/* Enviar */}
          {input.trim() && (
            <button
              onClick={send}
              disabled={loading}
              className="w-7 h-7 rounded-lg bg-[rgb(var(--adm-accent))] flex items-center justify-center hover:bg-[rgb(var(--adm-accent-hover))] transition-colors disabled:opacity-50"
            >
              {loading
                ? <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
                : <Send className="h-3.5 w-3.5 text-white" />}
            </button>
          )}

          {/* Toggle histórico */}
          {messages.length > 0 && (
            <button
              onClick={() => setOpen(o => !o)}
              className="w-7 h-7 rounded-lg hover:bg-[rgb(var(--adm-elevated))] flex items-center justify-center transition-colors"
            >
              {open
                ? <ChevronUp className="h-4 w-4 text-[rgb(var(--adm-muted))]" />
                : <ChevronDown className="h-4 w-4 text-[rgb(var(--adm-muted))]" />}
            </button>
          )}
        </div>
      </div>

      {/* Histórico */}
      {open && messages.length > 0 && (
        <div className="border-t border-[rgb(var(--adm-border))] max-h-80 overflow-y-auto px-4 py-3 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                m.role === 'assistant' ? 'bg-[rgb(var(--adm-accent)/0.12)]' : 'bg-[rgb(var(--adm-elevated))]'
              }`}>
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
