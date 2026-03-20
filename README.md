# Sua Casa Leblon — Platform

Sistema consolidado de gestão de aluguel por temporada no Leblon.

## Stack
- **Next.js 15** + TypeScript + Tailwind CSS
- **Supabase** (PostgreSQL) — database
- **Hospitable API** — channel manager, reservas, calendário, preços
- **Google Sheets API** — planilha financeira AL Gestão 2026
- **Beyond Pricing** — preços dinâmicos (via Hospitable)
- **Vercel** — deploy (suacasaleblon.com)

## Módulos
- `/` — Site público com listagem de imóveis e reserva direta (14% desconto)
- `/property/:id` — Página do imóvel com cotação em tempo real
- `/proprietarios` — Captação de proprietários com simulador de receita
- `/admin` — Dashboard financeiro (migrado do Giro Gestão Total)
- `/admin/reservas-diretas` — CRUD de reservas fora Airbnb/Booking
- `/admin/relatorios` — Geração de PDF mensal para clientes
- `/admin/integracoes` — Status de conexões (Hospitable, Sheets, Supabase)

## Setup
1. `npm install`
2. Copiar `.env.example` → `.env.local` e preencher credenciais
3. Rodar migration SQL no Supabase (supabase-migration.sql)
4. `npm run dev`

## Deploy
Push pro GitHub → Vercel puxa automaticamente.
