import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function POST(request: NextRequest) {
  try {
    const { code, grandTotal } = await request.json()

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ ok: false, message: 'Código inválido.' }, { status: 400 })
    }

    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .eq('active', true)
      .single()

    if (error || !coupon) {
      return NextResponse.json({ ok: false, message: 'Cupom não encontrado ou inativo.' }, { status: 404 })
    }

    // Check max uses
    if (coupon.max_uses && coupon.uses_count >= coupon.max_uses) {
      return NextResponse.json({ ok: false, message: 'Este cupom já atingiu o limite de usos.' }, { status: 400 })
    }

    // Check validity dates
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
    if (coupon.valid_from && today < coupon.valid_from) {
      return NextResponse.json({ ok: false, message: 'Este cupom ainda não está válido.' }, { status: 400 })
    }
    if (coupon.valid_until && today > coupon.valid_until) {
      return NextResponse.json({ ok: false, message: 'Este cupom expirou.' }, { status: 400 })
    }

    // Calculate discount
    let discount = 0
    if (coupon.discount_type === 'percent') {
      discount = Math.round((grandTotal || 0) * (coupon.discount_value / 100) * 100) / 100
    } else {
      // fixed — BRL value
      discount = coupon.discount_value
    }

    // Don't discount more than total
    discount = Math.min(discount, grandTotal || 0)

    const newTotal = Math.round(((grandTotal || 0) - discount) * 100) / 100

    return NextResponse.json({
      ok: true,
      coupon: {
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        discount_amount: discount,
      },
      newTotal,
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message || 'Erro.' }, { status: 500 })
  }
}
