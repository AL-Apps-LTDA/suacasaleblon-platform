import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id')
    if (!sessionId) {
      return NextResponse.json({ ok: false, message: 'session_id obrigatório.' }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid') {
      return NextResponse.json({
        ok: false,
        message: 'Pagamento ainda não confirmado. Aguarde alguns instantes.',
        status: session.payment_status,
      })
    }

    const meta = session.metadata || {}

    return NextResponse.json({
      ok: true,
      reservation: {
        propertyTitle: meta.propertyTitle || meta.propertyCode,
        propertyCode: meta.propertyCode,
        checkin: meta.checkin,
        checkout: meta.checkout,
        nights: meta.nights,
        guests: meta.guests,
        guestName: meta.guestName,
        guestEmail: meta.guestEmail,
        total: (session.amount_total || 0) / 100,
        paymentMethod: meta.paymentMethod || 'card',
        couponCode: meta.couponCode || null,
        couponDiscount: meta.couponDiscount ? parseFloat(meta.couponDiscount) : null,
      },
    })
  } catch (err: any) {
    console.error('Checkout status error:', err)
    return NextResponse.json(
      { ok: false, message: err.message || 'Erro ao buscar sessão.' },
      { status: 500 }
    )
  }
}
