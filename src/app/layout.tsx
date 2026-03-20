import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Sua Casa Leblon — Aluguel por Temporada no Leblon',
  description: 'Studios e apartamentos reformados no coração do Leblon, a poucos passos da praia. Reserve direto com até 14% de desconto.',
  openGraph: {
    title: 'Sua Casa Leblon',
    description: 'Aluguel por temporada no Leblon — studios e apartamentos reformados, a passos da praia.',
    type: 'website',
    locale: 'pt_BR',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300..700;1,9..40,300..700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        {children}
      </body>
    </html>
  )
}
