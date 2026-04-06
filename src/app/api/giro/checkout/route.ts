import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe'

// POST — create Stripe Checkout session for Giro subscription (with optional coupon)
export async function POST(request: NextRequest) {
  const response = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Service role client for coupon operations (bypasses RLS)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))

  // Get or create tenant
  let { data: tenant } = await supabaseAdmin
    .from('giro_tenants')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (!tenant) {
    const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Meu Negócio'
    const { data: newTenant } = await supabaseAdmin
      .from('giro_tenants')
      .insert({ name, owner_id: user.id })
      .select()
      .single()
    tenant = newTenant
    if (!tenant) {
      return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 })
    }
    await supabaseAdmin.from('giro_members').insert({
      tenant_id: tenant.id,
      auth_user_id: user.id,
      display_name: name,
      role: 'owner',
      email: user.email,
    })
  }

  const stripe = getStripe()
  const origin = new URL(request.url).origin

  // Create or reuse Stripe customer
  let customerId = tenant.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email!,
      name: user.user_metadata?.full_name || undefined,
      metadata: { tenant_id: tenant.id, supabase_user_id: user.id },
    })
    customerId = customer.id
    await supabaseAdmin
      .from('giro_tenants')
      .update({ stripe_customer_id: customerId })
      .eq('id', tenant.id)
  }

  // Validate coupon if provided
  let stripeCouponId: string | undefined
  if (body.coupon) {
    const { data: coupon } = await supabaseAdmin
      .from('coupons')
      .select('*')
      .eq('code', body.coupon)
      .eq('target', 'giro')
      .eq('active', true)
      .single()

    if (!coupon) {
      return NextResponse.json({ error: 'Cupom invalido ou expirado' }, { status: 400 })
    }

    if (coupon.max_uses > 0 && coupon.uses_count >= coupon.max_uses) {
      return NextResponse.json({ error: 'Cupom esgotado' }, { status: 400 })
    }

    // Create Stripe coupon on the fly
    const stripeCoupon = await stripe.coupons.create({
      ...(coupon.discount_type === 'percent'
        ? { percent_off: coupon.discount_value }
        : { amount_off: Math.round(coupon.discount_value * 100), currency: 'brl' }
      ),
      duration: coupon.duration || 'once',
      ...(coupon.duration === 'repeating' && coupon.duration_months
        ? { duration_in_months: coupon.duration_months }
        : {}
      ),
      name: `Giro: ${coupon.code}`,
    })
    stripeCouponId = stripeCoupon.id

    // Increment uses_count
    await supabaseAdmin
      .from('coupons')
      .update({ uses_count: coupon.uses_count + 1 })
      .eq('id', coupon.id)
  }

  // Create Checkout Session — R$27,90/month
  const sessionParams: any = {
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'brl',
          product_data: {
            name: 'Giro Temporada — Plano Mensal',
            description: 'Gestao completa de temporada: agenda, equipe, financeiro',
          },
          unit_amount: 2790,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/giro?checkout=success`,
    cancel_url: `${origin}/giro?checkout=cancel`,
    metadata: { tenant_id: tenant.id },
  }

  if (stripeCouponId) {
    sessionParams.discounts = [{ coupon: stripeCouponId }]
  } else {
    sessionParams.allow_promotion_codes = true
  }

  const session = await stripe.checkout.sessions.create(sessionParams)

  return NextResponse.json({ url: session.url })
}
