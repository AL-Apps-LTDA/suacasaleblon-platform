'use client'

import EquipePage from '@/app/equipe/page'

// Admin/Limpezas renders the exact same component as /equipe (Giro Temporada).
// This guarantees 100% sync — any change to equipe/page.tsx is reflected here.
// The equipe component handles its own auth (PIN login) and admin detection.
export default function LimpezasPage() {
  return <EquipePage />
}
