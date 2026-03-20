import { NextResponse } from 'next/server'
import { siteConfig } from '@/lib/config'

export async function GET() {
  return NextResponse.json({
    brand: siteConfig.brand,
    pricing: siteConfig.pricing,
    rules: siteConfig.rules,
    properties: siteConfig.properties.map(p => ({
      code: p.code,
      title: p.title,
      subtitle: p.subtitle,
      max_guests: p.max_guests,
      base_guests: p.base_guests,
      extra_per_guest_per_night: p.extra_per_guest_per_night,
      docs_required: p.docs_required,
      images: p.images,
    })),
  })
}
