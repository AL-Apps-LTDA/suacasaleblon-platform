import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Para Proprietários — Sua Casa Leblon',
  description: 'Seu imóvel no Leblon pode render muito mais com gestão profissional de temporada. Sem obra, sem burocracia.',
  openGraph: {
    title: 'Seu imóvel no Leblon pode render muito mais',
    description: 'Gestão completa de aluguel por temporada no Leblon — sem obra, sem burocracia. Descubra quanto seu imóvel pode render.',
    url: 'https://suacasaleblon.com/proprietarios',
    images: [
      {
        url: '/images/og-proprietarios.jpg',
        width: 1200,
        height: 630,
        alt: 'Sua Casa Leblon — Gestão de imóveis por temporada',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Seu imóvel no Leblon pode render muito mais',
    description: 'Gestão completa de aluguel por temporada no Leblon — sem obra, sem burocracia.',
    images: ['/images/og-proprietarios.jpg'],
  },
}

export default function ProprietariosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
