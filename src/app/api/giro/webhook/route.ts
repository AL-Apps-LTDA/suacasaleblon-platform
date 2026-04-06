import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  const webhookSecret = process.env.GIRO_STRIPE_WEBHOOK_SECRET
  if (!webhookSecret || !sig) {
    return NextResponse.json({ error: 'Missing webhook secret or signature' }, { status: 400 })
  }

  const stripe = getStripe()
  let event

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    console.error('Giro webhook signature failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const obj = event.data.object as any

  const supabase = getSupabase()

  switch (event.type) {
    case 'checkout.session.completed': {
      const tenantId = obj.metadata?.tenant_id
      const subscriptionId = obj.subscription
      if (tenantId && subscriptionId) {
        await supabase
          .from('giro_tenants')
          .update({
            stripe_subscription_id: subscriptionId,
            subscription_status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('id', tenantId)
      }
      break
    }

    case 'customer.subscription.updated': {
      const status = obj.status // active, past_due, canceled, unpaid
      const customerId = obj.customer
      if (customerId) {
        await supabase
          .from('giro_tenants')
          .update({
            subscription_status: status,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const customerId = obj.customer
      if (customerId) {
        await supabase
          .from('giro_tenants')
          .update({
            subscription_status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
