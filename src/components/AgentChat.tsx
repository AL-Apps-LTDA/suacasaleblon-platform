'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Send, Loader2, Bot, User, ChevronDown, ChevronUp,
  Mic, MicOff, Zap, Brain, Paperclip, X
} from 'lucide-react'

type MessageContent = string | Array<{ type: 'text'; text: string } | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }>
type Message = { role: 'user' | 'assistant'; content: MessageContent; imagePreview?: string }
type Model = 'haiku' | 'sonnet'

export function AgentChat() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [model, setModel] = useState<Model>('haiku')
  const [listening, setListening] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [imageData, setImageData] = useState<{ base64: string; mediaType: string; preview: string } | null>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    setVoiceSupported(!!SR)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  // Scroll to bottom of chat container
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages, loading])

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

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Só imagens são suportadas.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Imagem muito grande (máx 5MB).'); return }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const [header, base64] = result.split(',')
      const mediaType = header.match(/data:(.*?);/)?.[1] || 'image/jpeg'
      setImageData({ base64, mediaType, preview: result })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function send() {
    const text = input.trim()
    if ((!text && !imageData) || loading) return
    setInput(''); setError(''); setOpen(true)

    // Build user message content
    let userContent: MessageContent
    let displayPreview: string | undefined

    if (imageData) {
      const parts: Array<{ type: 'text'; text: string } | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }> = []
      parts.push({ type: 'image', source: { type: 'base64', media_type: imageData.mediaType, data: imageData.base64 } })
      if (text) parts.push({ type: 'text', text })
      userContent = parts
      displayPreview = imageData.preview
      setImageData(null)
    } else {
      userContent = text
    }

    const newMessages: Message[] = [...messages, { role: 'user', content: userContent, imagePreview: displayPreview }]
    setMessages(newMessages); setLoading(true)

    try {
      // Build API messages (strip imagePreview from payload)
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }))
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, model }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (e: any) {
      setError(e.message || 'Erro ao conectar.')
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  function getDisplayText(content: MessageContent): string {
    if (typeof content === 'string') return content
    const textParts = content.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    return textParts.map(p => p.text).join('\n') || '📷 Imagem enviada'
  }

  return (
    <div className="border rounded-xl overflow-hidden transition-all border-[rgb(var(--adm-border))] bg-[rgb(var(--adm-surface))]">

      {/* Barra de input */}
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 bg-[rgb(var(--adm-accent)/0.12)]">
          <Bot className="h-3 w-3 text-[rgb(var(--adm-accent))]" />
        </div>
        <input ref={inputRef} type="text" value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey} onFocus={() => setOpen(true)}
          placeholder="Pergunte sobre reservas, despesas, limpezas..."
          className="flex-1 bg-transparent text-sm text-[rgb(var(--adm-text))] placeholder:text-[rgb(var(--adm-muted)/0.55)] outline-none min-w-0"
        />
        <div className="flex items-center gap-1 shrink-0">
          {/* Photo upload */}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
          <button onClick={() => fileInputRef.current?.click()}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${imageData ? 'bg-violet-500/20 text-violet-400' : 'hover:bg-[rgb(var(--adm-elevated))] text-[rgb(var(--adm-muted))]'}`}>
            <Paperclip className="h-3.5 w-3.5" />
          </button>
          {/* Model toggle */}
          <button onClick={() => setModel(m => m === 'haiku' ? 'sonnet' : 'haiku')}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
              model === 'sonnet' ? 'bg-violet-500/15 text-violet-400 border-violet-500/30' : 'bg-[rgb(var(--adm-elevated))] text-[rgb(var(--adm-muted))] border-[rgb(var(--adm-border))]'
            }`}>
            {model === 'sonnet' ? <Brain className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
            {model === 'haiku' ? 'Haiku' : 'Sonnet'}
          </button>
          {/* Voice */}
          {voiceSupported && (
            <button onClick={toggleVoice}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                listening ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse' : 'hover:bg-[rgb(var(--adm-elevated))] text-[rgb(var(--adm-muted))]'
              }`}>
              {listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            </button>
          )}
          {/* Send */}
          {(input.trim() || imageData) && (
            <button onClick={send} disabled={loading}
              className="w-7 h-7 rounded-lg bg-[rgb(var(--adm-accent))] flex items-center justify-center hover:bg-[rgb(var(--adm-accent-hover))] transition-colors disabled:opacity-50">
              {loading ? <Loader2 className="h-3.5 w-3.5 text-white animate-spin" /> : <Send className="h-3.5 w-3.5 text-white" />}
            </button>
          )}
          {/* Toggle chat */}
          {messages.length > 0 && (
            <button onClick={() => setOpen(o => !o)}
              className="w-7 h-7 rounded-lg hover:bg-[rgb(var(--adm-elevated))] flex items-center justify-center">
              {open ? <ChevronUp className="h-4 w-4 text-[rgb(var(--adm-muted))]" /> : <ChevronDown className="h-4 w-4 text-[rgb(var(--adm-muted))]" />}
            </button>
          )}
        </div>
      </div>

      {/* Image preview */}
      {imageData && (
        <div className="px-3 pb-2 flex items-center gap-2">
          <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-[rgb(var(--adm-border))]">
            <img src={imageData.preview} alt="Preview" className="w-full h-full object-cover" />
            <button onClick={() => setImageData(null)}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
              <X className="h-3 w-3 text-white" />
            </button>
          </div>
          <span className="text-[10px] text-[rgb(var(--adm-muted))]">Imagem anexada</span>
        </div>
      )}

      {/* Histórico */}
      {open && messages.length > 0 && (
        <div ref={chatContainerRef} className="border-t border-[rgb(var(--adm-border))] max-h-96 overflow-y-auto px-4 py-3 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${m.role === 'assistant' ? 'bg-[rgb(var(--adm-accent)/0.12)]' : 'bg-[rgb(var(--adm-elevated))]'}`}>
                {m.role === 'assistant' ? <Bot className="h-3 w-3 text-[rgb(var(--adm-accent))]" /> : <User className="h-3 w-3 text-[rgb(var(--adm-muted))]" />}
              </div>
              <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === 'assistant'
                  ? 'bg-[#1a1a2e] text-[#e8e8f0]'
                  : 'bg-[rgb(var(--adm-accent)/0.10)] text-[rgb(var(--adm-text))] border border-[rgb(var(--adm-accent)/0.15)]'
              }`}>
                {m.imagePreview && (
                  <img src={m.imagePreview} alt="Enviado" className="max-w-[200px] rounded-lg mb-2" />
                )}
                {getDisplayText(m.content)}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-2.5">
              <div className="w-6 h-6 rounded-full bg-[rgb(var(--adm-accent)/0.12)] flex items-center justify-center shrink-0">
                <Bot className="h-3 w-3 text-[rgb(var(--adm-accent))]" />
              </div>
              <div className="bg-[#1a1a2e] rounded-xl px-3 py-2.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--adm-accent)/0.60)] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--adm-accent)/0.60)] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--adm-accent)/0.60)] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          {error && <p className="text-xs text-red-400 px-1">{error}</p>}
        </div>
      )}
    </div>
  )
}
