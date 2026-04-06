import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Giro Temporada',
  description: 'Gestão inteligente de temporada',
}

export default function GiroLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
