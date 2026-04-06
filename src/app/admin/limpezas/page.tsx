'use client'

import EquipePage from '@/app/equipe/page'

// Admin/Equipe — renders the /equipe component (Diego's internal cleaning team).
// 100% sync — any change to equipe/page.tsx is reflected here.
// Separate from /giro (Giro Temporada SaaS product for paying customers).
export default function LimpezasPage() {
  return <EquipePage />
}
