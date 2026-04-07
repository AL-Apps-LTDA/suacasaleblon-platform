# Regras de Sincronizacao — Sua Casa Leblon

Documento de referencia com todas as regras de sync, fontes de dados, timings e workflow de desenvolvimento.
Atualizado: 2026-04-07

---

## ⚠️ WORKFLOW DE DESENVOLVIMENTO — LEIA ANTES DE CODAR

### Regra fundamental
**A `main` do GitHub é a única fonte oficial do projeto.**
Toda janela/sessão/agente que for trabalhar no projeto DEVE começar fazendo pull da `main`.
Nunca edite diretamente na cópia local sem antes sincronizar com o remoto.

### Fluxo obrigatório para qualquer mudança

```
1. SEMPRE começar pela main remota
   git checkout main
   git pull origin main

2. Criar branch para a feature/fix
   git checkout -b feat/nome-da-feature
   # ou
   git checkout -b fix/nome-do-bug

3. Desenvolver e commitar na branch
   git add .
   git commit -m "feat: descrição clara do que foi feito"

4. Push da branch → Vercel gera preview automático
   git push origin feat/nome-da-feature
   → Vercel cria URL de preview (ex: suacasaleblon-platform-abc123-diego-tavares-projects.vercel.app)

5. Conferir o preview antes de mergear
   → Abrir a URL de preview e testar
   → Só avançar se estiver OK

6. Merge na main (via Pull Request no GitHub ou linha de comando)
   git checkout main
   git pull origin main
   git merge feat/nome-da-feature
   git push origin main
   → Vercel faz deploy em produção automaticamente

7. Deletar a branch antiga
   git branch -d feat/nome-da-feature
   git push origin --delete feat/nome-da-feature
```

### Por que esse fluxo?
- Cada janela/sessão do Claude ou editor local pode ter cópias diferentes do código
- Editar direto na main local sem sync causa conflitos e deploys quebrados (como aconteceu em 2026-04-07)
- O Vercel só valida o build na nuvem — o build local pode falhar por diferença de Node.js (Mac usa v24, Vercel usa v20)
- O preview do Vercel é o único ambiente confiável para validar antes de ir pra produção

### Nunca fazer
- ❌ Editar arquivos direto na `main` local sem `git pull` antes
- ❌ Dar `git push --force` na main
- ❌ Rodar `npm run build` localmente como critério de aprovação (Node 24 vs 20 diverge)
- ❌ Commitar e dar push diretamente na main sem branch + preview

### Ambiente de build oficial
- **Node.js**: 20.x (Vercel) — não confiar no build local se estiver em versão diferente
- **Validação de build**: sempre via preview do Vercel, não local
- **Referência do projeto**: `https://github.com/AL-Apps-LTDA/suacasaleblon-platform`

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

---

## Como cada tela puxa dados

### /admin (painel principal) — `GET /api/apartments`
- **Fonte primaria**: Hospitable API live (todas reservas jan-hoje)
- **Fallback**: Supabase `reservations` (cache do cron)
- **Tambem usa**: `airbnb_transactions` (CSV), `direct_reservations`, `expenses`, `app_expenses`
- **Refresh**: Manual (botao Sincronizar) ou reload da pagina

### /admin/agenda — client-side Supabase
- **Fonte**: Supabase direto (`reservations` + `direct_reservations` + `cleanings`)
- **Refresh**: Ao mudar mes ou reload

### /equipe (calendario da equipe) — `GET /api/equipe`
- **Fonte primaria**: Hospitable API live (5 semanas ao redor de hoje)
- **Fallback**: Supabase `reservations` (cache do cron)
- **Refresh**: Ao fazer login ou reload

### Site de reservas (hospede) — `POST /api/quote` + `GET /api/availability/[code]`
- **Disponibilidade**: Hospitable calendar API (cache Next.js 5 min)
- **Diarias**: Hospitable calendar API (live) ou fallback `demo_beyond_nightly` do config
- **Cleaning fee**: Hardcoded R$150 em `src/lib/config.ts`
- **Min nights**: Hospitable calendar API ou fallback regras estaticas

---

## Configuracoes centralizadas

### Apartamentos
- **Arquivo**: `src/lib/types.ts`
- `APARTMENTS` = todos (103, 102, 403, 303, 334A, BZ01, BZ02)
- `LEBLON_APARTMENTS` = sem Búzios (usado no admin e equipe)
- `PROPERTY_HOSPITABLE_MAP` = codigo → UUID do Hospitable

### Propriedades do site de reservas
- **Arquivo**: `src/lib/config.ts` → `siteConfig.properties`
- Cards editáveis por apartamento: título, subtítulo, hóspedes, fotos, taxa de limpeza
- BZ01 e BZ02 estão cadastrados como cards em branco — preencher quando disponível
- Campo `location: 'leblon' | 'buzios'` disponível para filtros futuros

### Defaults
- **Arquivo**: `src/lib/types.ts` → `DEFAULTS`
- `cleaning_fee`: R$ 150
- `commission_pct`: 15%

### Pricing do site
- **Arquivo**: `src/lib/config.ts` → `siteConfig.pricing`
- `discount_pct`: 14% (desconto do site vs Airbnb)
- `cleaning_fee`: R$ 150

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
- [ ] Preencher dados de BZ01 e BZ02 no `src/lib/config.ts` (título, fotos, hóspedes)
- [ ] Reservas do site NAO bloqueiam calendario Airbnb — risco de overbooking
- [ ] Cleaning fee hardcoded — atualizar manualmente quando mudar no Airbnb
- [ ] Considerar auto-refresh no admin (ex: polling a cada 60s)
