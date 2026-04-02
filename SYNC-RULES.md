# Regras de Sincronizacao — Sua Casa Leblon

Documento de referencia com todas as regras de sync, fontes de dados e timings.
Atualizado: 2026-04-02

---

## Fontes de dados

| Fonte | O que contem | Como chega |
|-------|-------------|------------|
| **Hospitable API** (live) | Reservas, calendario, diarias | Chamada HTTP em tempo real |
| **Supabase `reservations`** | Cache de reservas do Hospitable | Populado pelo cron + webhook |
| **Supabase `direct_reservations`** | Reservas feitas pelo site | Populado pelo webhook do Stripe |
| **Supabase `cleanings`** | Agenda de limpezas | Criado auto pelo sync + manual pelo admin |
| **Supabase `airbnb_transactions`** | CSV importado do Airbnb | Upload manual via /admin/importar |
| **Supabase `expenses`** | Despesas fixas | Manual via /admin/despesas |
| **Supabase `app_expenses`** | Despesas operacionais | Manual via /admin/limpezas |

---

## Pipeline de sync (Hospitable → Supabase)

### 1. Webhook Hospitable (TEMPO REAL)
- **Endpoint**: `/api/webhook/hospitable`
- **Trigger**: Hospitable envia POST quando reserva e criada/alterada
- **Acao**: Upsert em `reservations` + auto-cria `cleanings`
- **Latencia**: ~1 segundo
- **Configurar em**: hospitable.com → Apps → Webhooks

### 2. Cron sync-all (SAFETY NET)
- **Endpoint**: `/api/cron/sync-all`
- **Schedule (vercel.json)**: `0 12 * * *` (meio-dia UTC = 9h BRT)
- **Schedule (externo)**: Algo esta chamando a cada ~5 min (verificar Make/Zapier/etc)
- **Acao**: Busca TODAS as reservas do ano no Hospitable → upsert em `reservations` + sync limpezas
- **Duracao**: ~12 segundos por run

### 3. Webhook Stripe (reservas do site)
- **Endpoint**: `/api/webhook/stripe`
- **Trigger**: Pagamento confirmado (cartao ou PIX)
- **Acao**: Insere em `direct_reservations`
- **ATENCAO**: Reservas do site NAO bloqueiam calendario no Airbnb automaticamente (TODO)

---

## Como cada tela puxa dados

### /admin (painel principal) — `GET /api/apartments`
- **Fonte primaria**: Hospitable API live (todas reservas jan-hoje)
- **Fallback**: Supabase `reservations` (cache do cron)
- **Tambem usa**: `airbnb_transactions` (CSV), `direct_reservations`, `expenses`, `app_expenses`
- **Refresh**: Manual (botao Sincronizar) ou reload da pagina
- **Nao tem auto-refresh**

### /admin/agenda — client-side Supabase
- **Fonte**: Supabase direto (`reservations` + `direct_reservations` + `cleanings`)
- **Refresh**: Ao mudar mes ou reload
- **Nao tem auto-refresh**

### /equipe (calendario da equipe) — `GET /api/equipe`
- **Fonte primaria**: Hospitable API live (5 semanas ao redor de hoje)
- **Fallback**: Supabase `reservations` (cache do cron)
- **Refresh**: Ao fazer login ou reload
- **Nao tem auto-refresh**

### Site de reservas (hospede) — `POST /api/quote` + `GET /api/availability/[code]`
- **Disponibilidade**: Hospitable calendar API (cache Next.js 5 min)
- **Diarias**: Hospitable calendar API (live) ou fallback `demo_beyond_nightly` do config
- **Cleaning fee**: Hardcoded R$150 em `src/lib/config.ts`
- **Min nights**: Hospitable calendar API ou fallback regras estaticas

---

## Configuracoes centralizadas

### Apartamentos
- **Arquivo**: `src/lib/types.ts`
- `APARTMENTS` = todos (incluindo BZ02)
- `LEBLON_APARTMENTS` = sem BZ02 (usado no admin e equipe)
- `PROPERTY_HOSPITABLE_MAP` = codigo → UUID do Hospitable

### Defaults
- **Arquivo**: `src/lib/types.ts` → `DEFAULTS`
- `cleaning_fee`: R$ 150
- `commission_pct`: 15%

### Pricing do site
- **Arquivo**: `src/lib/config.ts` → `siteConfig.pricing`
- `discount_pct`: 14% (desconto do site vs Airbnb)
- `cleaning_fee`: R$ 150

### Commission por apto
- **Fonte primaria**: Supabase tabela `apartments` → `commission_pct`
- **Fallback**: `DEFAULTS.commission_pct` (15%)

---

## Timings resumo

| O que | Frequencia | Automatico? |
|-------|-----------|-------------|
| Hospitable → Supabase (webhook) | Tempo real | Sim (apos configurar) |
| Hospitable → Supabase (cron) | 1x/dia (vercel.json) ou 5min (externo) | Sim |
| Stripe → Supabase (webhook) | Tempo real | Sim |
| Admin painel carrega dados | Ao abrir pagina | Nao (manual) |
| Admin agenda carrega dados | Ao abrir/mudar mes | Nao (manual) |
| Equipe carrega dados | Ao fazer login | Nao (manual) |
| Hospitable API cache (Next.js) | 5 min (revalidate: 300) | Sim |

---

## TODO / Pendencias

- [ ] Configurar webhook no Hospitable (hospitable.com → Apps → Webhooks)
- [ ] Reservas do site NAO bloqueiam calendario Airbnb — risco de overbooking
- [ ] Cleaning fee hardcoded — atualizar manualmente quando mudar no Airbnb
- [ ] Considerar auto-refresh no admin (ex: polling a cada 60s)
