import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const sig = request.headers.get('stripe-signature')

    let event
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (webhookSecret && sig) {
      try {
        event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
      } catch (err: any) {
        console.error('Webhook signature verification failed:', err.message)
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
      }
    } else {
      // In dev/test mode without webhook secret, parse directly
      event = JSON.parse(body)
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        // For card payments, payment_status is 'paid' immediately.
        // For PIX, payment_status is 'unpaid' here (QR code just generated).
        await handleCompletedCheckout(session)
        break
      }
      case 'checkout.session.async_payment_succeeded': {
        // PIX payment confirmed — customer scanned QR and paid
        const session = event.data.object
        console.log(`PIX payment succeeded for session: ${session.id}`)
        await handleCompletedCheckout(session)
        break
      }
      case 'checkout.session.async_payment_failed': {
        // PIX expired or payment failed
        const session = event.data.object
        console.log(`PIX payment failed/expired for session: ${session.id}`)
        break
      }
      case 'checkout.session.expired': {
        console.log('Checkout session expired:', event.data.object.id)
        break
      }
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('Webhook error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function handleCompletedCheckout(session: any) {
  const meta = session.metadata || {}

  // Only process if payment is complete
  if (session.payment_status !== 'paid') {
    console.log(`Session ${session.id} not paid yet (status: ${session.payment_status})`)
    return
  }

  const { createServerClient } = await import('@/lib/supabase')
  const sb = createServerClient()

  // Check if reservation already exists for this session
  const { data: existing } = await sb
    .from('direct_reservations')
    .select('id')
    .eq('stripe_session_id', session.id)
    .single()

  if (existing) {
    console.log(`Reservation already exists for session ${session.id}`)
    return
  }

  const totalValue = parseFloat(meta.grandTotal || '0')
  const couponDiscount = parseFloat(meta.couponDiscount || '0')
  const paidAmount = (session.amount_total || 0) / 100 // cents to BRL

  // Estimate Stripe fee (3.99% + R$0.39 for domestic cards)
  const stripeFee = Math.round((paidAmount * 0.0399 + 0.39) * 100) / 100

  // Insert direct reservation
  const { data, error } = await sb.from('direct_reservations').insert({
    apartment_code: meta.propertyCode,
    guest_name: meta.guestName,
    checkin: meta.checkin,
    checkout: meta.checkout,
    total_value: totalValue,
    stripe_fee: stripeFee,
    payment_status: 'pago',
    payment_method: meta.paymentMethod || 'card',
    notes: [
      `Reserva online via ${meta.paymentMethod === 'pix' ? 'PIX' : 'Cartão'}`,
      meta.couponCode ? `Cupom: ${meta.couponCode} (-R$${couponDiscount.toFixed(2)})` : null,
      `Email: ${meta.guestEmail}`,
      meta.guestPhone ? `Tel: ${meta.guestPhone}` : null,
      `Valor pago: R$${paidAmount.toFixed(2)} (taxa Stripe: R$${stripeFee.toFixed(2)})`,
      `Stripe: ${session.id}`,
    ].filter(Boolean).join(' | '),
    source: 'site',
    stripe_session_id: session.id,
    coupon_code: meta.couponCode || null,
    coupon_discount: couponDiscount || null,
    discount_amount: couponDiscount || 0,
    guest_email: meta.guestEmail,
    guest_phone: meta.guestPhone || null,
  }).select().single()

  if (error) {
    console.error('Failed to save reservation:', error)
    throw error
  }

  // Increment coupon usage if used
  if (meta.couponCode) {
    try {
      await sb.rpc('increment_coupon_usage', { coupon_code: meta.couponCode })
    } catch (e: any) {
      console.error('Failed to increment coupon usage:', e)
    }
  }

  console.log(`✅ Reservation saved: ${data?.id} for ${meta.guestName} at ${meta.propertyCode}`)

  // Create reservation on Hospitable → syncs to Airbnb/Booking + sends check-in instructions
  try {
    const { createDirectReservation } = await import('@/lib/hospitable')
    const hospResult = await createDirectReservation({
      apartmentCode: meta.propertyCode,
      checkin: meta.checkin,
      checkout: meta.checkout,
      guestName: meta.guestName,
      guestEmail: meta.guestEmail,
      guestPhone: meta.guestPhone ? (meta.guestPhone.startsWith('+') ? meta.guestPhone.replace(/[^\d+]/g, '') : `+${meta.guestPhone.replace(/\D/g, '')}`) : undefined,
      guests: Math.max(1, Number(meta.guests) || 2),
      totalPaidCents: session.amount_total ?? 0,
      notes: `Reserva direta via suacasaleblon.com — ${meta.paymentMethod === 'pix' ? 'PIX' : 'Cartão'}${meta.couponCode ? ` — Cupom ${meta.couponCode}` : ''}`,
    })
    if (!hospResult.ok) {
      console.error(`⚠️ Hospitable reservation failed for ${meta.propertyCode}: ${hospResult.error}`)
      await sb.from('direct_reservations')
        .update({ notes: (data?.notes || '') + ' | ⚠️ RESERVA NÃO CRIADA NO HOSPITABLE — verificar manualmente' })
        .eq('id', data?.id)
    } else {
      console.log(`✅ Hospitable reservation ${hospResult.code} created for apt ${meta.propertyCode}`)
    }
  } catch (e: any) {
    console.error(`⚠️ Hospitable reservation error: ${e.message}`)
  }

  // Send confirmation email to guest + notification to Diego
  try {
    const { sendBookingConfirmationEmail, sendBookingNotificationToDiego } = await import('@/lib/email')
    const emailData = {
      guestName: meta.guestName,
      guestEmail: meta.guestEmail,
      propertyCode: meta.propertyCode,
      propertyName: meta.propertyTitle || meta.propertyCode,
      checkin: meta.checkin,
      checkout: meta.checkout,
      totalValue,
      paidAmount,
      paymentMethod: meta.paymentMethod || 'card',
      couponCode: meta.couponCode,
      couponDiscount: couponDiscount || undefined,
    }
    await sendBookingConfirmationEmail(emailData)
    await sendBookingNotificationToDiego(emailData)
  } catch (e: any) {
    console.error('Email sending error:', e.message)
    // Non-blocking: reservation is saved even if email fails
  }
}
