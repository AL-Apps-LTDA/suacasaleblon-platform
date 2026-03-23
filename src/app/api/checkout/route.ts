import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { siteConfig } from '@/lib/config'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      propertyCode,
      checkin,
      checkout,
      guests,
      guestName,
      guestEmail,
      guestPhone,
      grandTotal,
      couponCode,
      couponDiscount,
      paymentMethod, // 'pix' | 'card'
    } = body

    // Validate required fields
    if (!propertyCode || !checkin || !checkout || !guests || !guestName || !guestEmail || !grandTotal) {
      return NextResponse.json({ ok: false, message: 'Campos obrigatórios faltando.' }, { status: 400 })
    }

    const property = siteConfig.properties.find(p => p.code === propertyCode)
    if (!property) {
      return NextResponse.json({ ok: false, message: 'Imóvel não encontrado.' }, { status: 404 })
    }

    const finalAmount = couponDiscount
      ? Math.round((grandTotal - couponDiscount) * 100) // Stripe uses cents
      : Math.round(grandTotal * 100)

    if (finalAmount <= 0) {
      return NextResponse.json({ ok: false, message: 'Valor inválido.' }, { status: 400 })
    }

    const nights = Math.round(
      (new Date(`${checkout}T00:00:00`).getTime() - new Date(`${checkin}T00:00:00`).getTime()) / 86400000
    )

    const origin = request.headers.get('origin') || 'https://suacasaleblon.com'

    const metadata = {
      propertyCode,
      propertyTitle: property.title,
      checkin,
      checkout,
      nights: String(nights),
      guests: String(guests),
      guestName,
      guestEmail,
      guestPhone: guestPhone || '',
      grandTotal: String(grandTotal),
      couponCode: couponCode || '',
      couponDiscount: couponDiscount ? String(couponDiscount) : '0',
      paymentMethod: paymentMethod || 'card',
    }

    // PIX uses Boleto-like flow with Stripe — or we use a custom PIX approach
    // Stripe supports PIX as a payment method in Brazil
    const paymentMethodTypes: string[] =
      paymentMethod === 'pix' ? ['pix'] : ['card']

    const sessionParams: any = {
      payment_method_types: paymentMethodTypes,
      mode: 'payment',
      currency: 'brl',
      customer_email: guestEmail,
      metadata,
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: `${property.title} — ${nights} noite(s)`,
              description: `Check-in: ${formatDate(checkin)} | Check-out: ${formatDate(checkout)} | ${guests} hóspede(s)${couponCode ? ` | Cupom: ${couponCode}` : ''}`,
              images: property.images?.length ? [property.images[0]] : [],
            },
            unit_amount: finalAmount,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/confirmacao?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/property/${propertyCode}?checkin=${checkin}&checkout=${checkout}&guests=${guests}`,
      locale: 'pt-BR' as any,
      expires_after: paymentMethod === 'pix' ? 1800 : 3600, // PIX: 30min, Card: 1h
    }

    // PIX specific: set expiration
    if (paymentMethod === 'pix') {
      sessionParams.payment_method_options = {
        pix: {
          expires_after_seconds: 1800, // 30 minutes
        },
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    return NextResponse.json({
      ok: true,
      sessionId: session.id,
      url: session.url,
    })
  } catch (err: any) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json(
      { ok: false, message: err.message || 'Erro ao criar sessão de pagamento.' },
      { status: 500 }
    )
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
