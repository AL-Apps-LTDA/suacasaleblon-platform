'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Home, MessageCircle, Loader2 } from 'lucide-react'
import { WHATSAPP_NUMBER } from '@/lib/types'

interface ReservationDetails {
  propertyTitle: string
  propertyCode: string
  checkin: string
  checkout: string
  nights: string
  guests: string
  guestName: string
  guestEmail: string
  total: number
  paymentMethod: string
  couponCode?: string
  couponDiscount?: number
}

export default function ConfirmacaoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#F5F0E8]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-brand)]" />
      </div>
    }>
      <ConfirmacaoContent />
    </Suspense>
  )
}

function ConfirmacaoContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [details, setDetails] = useState<ReservationDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!sessionId) {
      setError('Sessão não encontrada.')
      setLoading(false)
      return
    }

    fetch(`/api/checkout/status?session_id=${sessionId}`)
      .then(r => r.json())
      .then(data => {
        if (data.ok) setDetails(data.reservation)
        else setError(data.message || 'Erro ao buscar reserva.')
      })
      .catch(() => setError('Erro ao buscar reserva.'))
      .finally(() => setLoading(false))
  }, [sessionId])

  function fmtDate(d: string) {
    return new Date(`${d}T00:00:00`).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric'
    })
  }

  function fmtBRL(v: number) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F0E8]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-brand)]" />
      </div>
    )
  }

  if (error || !details) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F0E8] px-4">
        <div className="text-center max-w-md">
          <p className="text-red-600 mb-4">{error || 'Reserva não encontrada.'}</p>
          <Link href="/" className="text-[var(--color-brand)] underline">Voltar ao início</Link>
        </div>
      </div>
    )
  }

  const whatsMsg = `Olá! Acabei de confirmar minha reserva no ${details.propertyTitle}. Check-in: ${details.checkin}, Check-out: ${details.checkout}. Nome: ${details.guestName}. Valor: ${fmtBRL(details.total)}.`

  return (
    <div className="min-h-screen bg-[#F5F0E8] px-4 py-12">
      <div className="max-w-lg mx-auto">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">
            Reserva Confirmada!
          </h1>
          <p className="text-[var(--color-text-secondary)] mt-1">
            Pagamento aprovado via {details.paymentMethod === 'pix' ? 'PIX' : 'Cartão'}
          </p>
        </div>

        {/* Reservation Card */}
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-lg text-[var(--color-text)]">
            {details.propertyTitle}
          </h2>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-[var(--color-text-secondary)]">Check-in</span>
              <p className="font-medium">{fmtDate(details.checkin)}</p>
            </div>
            <div>
              <span className="text-[var(--color-text-secondary)]">Check-out</span>
              <p className="font-medium">{fmtDate(details.checkout)}</p>
            </div>
            <div>
              <span className="text-[var(--color-text-secondary)]">Noites</span>
              <p className="font-medium">{details.nights}</p>
            </div>
            <div>
              <span className="text-[var(--color-text-secondary)]">Hóspedes</span>
              <p className="font-medium">{details.guests}</p>
            </div>
          </div>

          <hr className="border-[var(--color-brand-100)]" />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">Hóspede</span>
              <span className="font-medium">{details.guestName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">Email</span>
              <span className="font-medium text-xs">{details.guestEmail}</span>
            </div>
            {details.couponCode && (
              <div className="flex justify-between text-green-600">
                <span>Cupom {details.couponCode}</span>
                <span>-{fmtBRL(details.couponDiscount || 0)}</span>
              </div>
            )}
          </div>

          <hr className="border-[var(--color-brand-100)]" />

          <div className="flex justify-between items-center">
            <span className="font-semibold text-[var(--color-text)]">Total Pago</span>
            <span className="font-bold text-lg text-green-700">{fmtBRL(details.total)}</span>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mt-4">
          <h3 className="font-semibold text-sm text-[var(--color-text)] mb-3">Próximos Passos</h3>
          <ul className="space-y-2 text-sm text-[var(--color-text-secondary)]">
            <li>✅ Um email de confirmação será enviado para {details.guestEmail}</li>
            <li>📲 Entraremos em contato via WhatsApp com instruções de check-in</li>
            <li>🏠 Horário de check-in: a partir das 15h</li>
            <li>🔑 Informações de acesso serão enviadas 24h antes</li>
          </ul>
        </div>

        {/* CTAs */}
        <div className="space-y-3 mt-6">
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsMsg)}`}
            target="_blank" rel="noopener"
            className="flex items-center justify-center gap-2 w-full bg-green-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors"
          >
            <MessageCircle className="h-4 w-4" /> Falar com Sua Casa Leblon
          </a>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full bg-[var(--color-brand)] text-white py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            <Home className="h-4 w-4" /> Voltar ao Início
          </Link>
        </div>
      </div>
    </div>
  )
}
