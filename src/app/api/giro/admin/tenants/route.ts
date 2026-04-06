import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET — list all Giro tenants with stats + Stripe payments (admin-only)
export async function GET() {
  const supabase = getSupabase()
  const stripe = getStripe()

  const { data: tenants, error } = await supabase
    .from('giro_tenants')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const enriched = await Promise.all(
    (tenants || []).map(async (t) => {
      const { data: authUser } = await supabase.auth.admin.getUserById(t.owner_id)

      const { count: aptCount } = await supabase
        .from('giro_apartments')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', t.id)

      const { count: memberCount } = await supabase
        .from('giro_members')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', t.id)

      // Stripe payment history
      let total_paid = 0
      let last_payment: string | null = null
      let payments: { amount: number; date: string; status: string }[] = []

      if (t.stripe_customer_id) {
        try {
          const invoices = await stripe.invoices.list({
            customer: t.stripe_customer_id,
            limit: 24,
          })
          payments = invoices.data.map(inv => ({
            amount: (inv.amount_paid || 0) / 100,
            date: new Date((inv.status_transitions?.paid_at || inv.created) * 1000).toISOString(),
            status: inv.status || 'unknown',
          }))
          total_paid = payments
            .filter(p => p.status === 'paid')
            .reduce((sum, p) => sum + p.amount, 0)
          const lastPaid = payments.find(p => p.status === 'paid')
          if (lastPaid) last_payment = lastPaid.date
        } catch {
          // Stripe customer may not exist yet
        }
      }

      return {
        ...t,
        owner_email: authUser?.user?.email || null,
        apartment_count: aptCount || 0,
        member_count: memberCount || 0,
        total_paid,
        last_payment,
        payments,
      }
    })
  )

  return NextResponse.json({ tenants: enriched })
}
