# CLAUDE.md — Sua Casa Leblon

Documento de contexto para Claude. Fonte da verdade do projeto.
Atualizado em: Abril 2026

---

## 🏢 O NEGÓCIO

**Sua Casa Leblon** (AL Apps LTDA) — gestão de imóveis de temporada.
- **Operador:** Diego Tavares (mora em SP, gerencia remotamente)
- **Foco:** studios e 1-bedrooms em Leblon/Zona Sul e Búzios
- **Equipe local:** Marluce Lopes (salário fixo) e Niedja Távora (freelance)

**Imóveis:**
- Leblon: Apt 102, 103, 303, 334A, 403
- Búzios: BZ01, BZ02

---

## 🛠 STACK

- **Next.js 15** + TypeScript + Tailwind CSS
- **Supabase** (PostgreSQL, sa-east-1) — banco de dados principal
- **Vercel** — deploy automático via push na main
- **GitHub:** AL-Apps-LTDA/suacasaleblon-platform (privado)
- **Hospitable** — channel manager (sync 5min com Airbnb/Booking)
- **Beyond Pricing** — precificação dinâmica
- **Stripe Brazil** — pagamentos (PIX + cartão)
- **Resend** — emails transacionais (send.suacasaleblon.com)
- **Anthropic API** — agente IA operacional (Claude Haiku 4.5 / Sonnet 4.6)

**Google Sheets: REMOVIDO.** Sistema migrou 100% para Supabase.

---

## 🗂 ESTRUTURA DO SISTEMA

### Site público (suacasaleblon.com)
- `/` — homepage com listagem e reserva direta
- `/property/:id` — página do imóvel com cotação
- `/proprietarios` — captação de proprietários

### Admin (/admin — senha: suacasa2026)
- Dashboard com agente IA no topo
- Apartamentos, Despesas, Equipe/Limpezas
- Reservas Diretas, Importar CSV, Relatórios
- Contador, Prospecção, Cupons, Clientes Giro
- Emails/Mensagens, Dynamic Pricing, Integrações
- **Configurações** (nova) — subtab CRM em branco

### Equipe (/equipe — PIN: giro2026)
- App para faxineiras (quadradinhos, vista 2 semanas)
- Marluce pode lançar R$0 quando cabível
- Niedja lança sempre valor real

---

## 🤖 AGENTE IA (IMPLEMENTADO EM ABRIL 2026)

### Componente
- `src/components/AgentChat.tsx` — chat no topo do dashboard
- 5 modos: Consulta / Despesa / Agendar / Relatório / Código
- Voz (Web Speech API, PT-BR)
- Seletor Haiku ↔ Sonnet

### Rotas
- `POST /api/agent` — chat principal com contexto Supabase
- `GET /api/agent/briefing` — cron 9h BRT, email diário
- `GET /api/agent/limpezas-alerta` — cron 9h BRT, status limpezas
- `POST /api/agent/code` — modo código: abre branch, gera diff
- `POST /api/agent/code/confirm` — merge aprovado pelo Diego
- `POST /api/agent/code/cancel` — cancela e deleta branch

### Variáveis de ambiente necessárias
- `ANTHROPIC_API_KEY` — Anthropic API
- `GITHUB_TOKEN` — fine-grained token (Contents + PRs R/W)
- `CRON_SECRET` — protege endpoints de cron
- `RESEND_API_KEY` — emails
- `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### Fluxo modo Código (CRÍTICO)
1. Diego descreve alteração no chat
2. Agente abre branch `agent/code-{timestamp}`
3. Claude Sonnet escreve o código
4. Diff colorido aparece no chat (verde = novo, vermelho = removido)
5. Diego revisa com os olhos
6. "Confirmar" → merge na main → branch deletada → deploy automático
7. "Cancelar" → branch deletada → nada muda

**Regra de ouro:** nunca age na main diretamente. Sempre branch → diff → aprovação.

---

## 🔄 CRONS (VERCEL)

| Rota | Schedule | Função |
|---|---|---|
| /api/cron/sync-all | */5 * * * * | Sync Hospitable |
| /api/agent/briefing | 0 12 * * * | Briefing 9h BRT |
| /api/agent/limpezas-alerta | 0 12 * * * | Alerta limpezas 9h BRT |

---

## 🚨 REGRAS CRÍTICAS DE DEPLOY

- **NUNCA** usar Vercel CLI — sempre push via GitHub
- **NUNCA** commitar direto na main — sempre branch → merge
- Deploy só acontece quando push chega na main pelo GitHub
- `git commit --allow-empty` recupera deploy se necessário
- Rogue deploys identificados por `actor: "claude"` + `gitDirty: "1"`

---

## 🔒 SEGURANÇA

- Admin: autenticação por senha no sessionStorage
- Equipe: PIN giro2026
- Supabase: RLS habilitado com políticas permissivas (anon key funciona)
- Crons protegidos por CRON_SECRET no header Authorization
- Chaves nunca no código — sempre variáveis de ambiente no Vercel

---

## 📋 PENDÊNCIAS CONHECIDAS

### Alta prioridade
- [ ] Aba /equipe mostrando versão errada (deve ser quadradinhos, não dots+toggle)
- [ ] Agenda Leblon e Agenda Búzios — verificar se chegaram ao prod
- [ ] PDF proprietário — melhorar visual + disparo automático mensal
- [ ] Prospecção — sistema Apify + WhatsApp Business API

### Média prioridade
- [ ] Conciliação de extratos OTA vs sistema
- [ ] Avaliações/reviews — monitor + sugestão de resposta
- [ ] WhatsApp integrado ao agente (Agente Comms)
- [ ] Briefing diário — Diego recebe às 9h (IMPLEMENTADO, validar amanhã)
- [ ] Agente com poder de código — IMPLEMENTADO, testar

### Backlog
- [ ] Relatório proprietário pág 2 com extratos OTAs
- [ ] Área de credenciais /admin (trocar senha, cadastrar usuários)
- [ ] Cupom de desconto no fluxo de pagamento
- [ ] Pro-rata em reservas atravessando meses
- [ ] Google Sheets — remover referências mortas do código

---

## 🧠 DECISÕES TOMADAS

- **Stripe Brazil** (não MercadoPago)
- **Google Sheets: eliminado** — 100% Supabase
- **Giro Temporada** mantido como app nativo Expo separado (limpezasleblon.org)
- **Foco:** studios e 1-bedrooms (decisão estratégica, não mudar)
- **Agenda Búzios** só na versão do Diego, não no SaaS
- **Prospecção:** 1 mensagem/dia, alta qualidade, não volume
- **Agente IA:** modelo único com modos, não 3 agentes separados

---

## 🏗 PADRÕES DE CÓDIGO

- Tema admin: variáveis CSS `rgb(var(--adm-*))` — nunca hardcode de cor
- Componentes com `'use client'` quando usam hooks
- Supabase server: `createServerClient()` nas rotas de API
- Supabase client: `createClient()` com anon key no frontend
- Arquivos grandes (>100 linhas): editar com `edit_block`, nunca reescrever inteiro

---

## 📁 PATHS IMPORTANTES

- Repo local: `/Users/diegotavares/Documents/suacasaleblon-platform/`
- Backup: `/mnt/user-data/outputs/suacasaleblon-backup/`
- Supabase project: `sqysxboyvpipshapgmjo`
- Vercel project: `prj_QriaPs5y7Vup6kgUXhwA1xuNcDJZ`
- Team Vercel: `team_5MUOOxq2pN3lQzmcIVBtK095`
