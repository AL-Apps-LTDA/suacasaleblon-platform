# PLAN — SUA CASA LEBLON

---

## 🔥 AGORA

- Giro funcional (aba 1)
- custos extras implementados
- persistência funcionando
- adicionar nome + telefone do hóspede na agenda
- verificar sync de cleaning_fee (ver seção abaixo)
- configurar corretamente chaves do Supabase

---

## ⚙️ EM ANDAMENTO

- reconstrução completa do sistema original
- manter fidelidade ao fluxo antigo (Replit)
- evitar invenções

---

## 🧠 DECISÕES TRAVADAS

### Produto
- Sistema = operação + controle + comunicação
- Giro (/equipe) = núcleo
- NÃO reinventar → replicar o que já funcionava

---

## 📅 DATAS E AGENDA (CRÍTICO)

- timezone: America/Sao_Paulo
- check-in: 15h
- check-out: 11h
- checkout gera limpeza

---

## 📱 MELHORIA — AGENDA (ALTA PRIORIDADE)

Adicionar:

- nome do hóspede
- telefone do hóspede
- botão de ligação direta

Objetivo:
- eliminar dependência do Diego
- permitir ação direta da faxineira

---

## 🔴 PERSISTÊNCIA (CRÍTICO)

- alterações do usuário DEVEM persistir
- edição nunca pode ser sobrescrita pelo sync

fluxo correto:
UI edit → API → DB → UI atualizado

---

# 🚨 BUG — SYNC DE PREÇO (CLEANING_FEE)

Problema:
- alteração do cleaning_fee no Airbnb não reflete no site

Possibilidades:
- sync não está rodando
- sync roda mas não salva
- site não está lendo o campo correto
- cache impedindo atualização

Regra:
- não assumir que sync existe → verificar explicitamente

Status:
→ PENDENTE DE INVESTIGAÇÃO

---

# ⚠️ VERIFICAÇÃO — SYNC DO SISTEMA

Precisamos confirmar:

- existe cron rodando?
- endpoint /api/cron/sync-all está sendo chamado?
- dados estão sendo salvos corretamente?

---

## 🔑 INFRA — SUPABASE (PENDENTE)

- gerar novas chaves (anon + service role)
- atualizar no Vercel
- garantir conexão correta

Status:
→ PENDENTE

---

# 🧼 GIRO — LIMPEZAS (ABA 1)

### Estrutura

- custo base
- custos adicionais

### Custos adicionais

- transporte
- compra
- manutenção
- outro (com descrição)

### Regra

- armazenar no próprio cleaning (JSON)
- não criar tabela separada agora

---

# 💬 CHAT (ABA 2)

### Estrutura

- lista de chats
- criação
- mensagens

### Regras

- qualquer usuário pode criar chat
- Diego sempre incluído automaticamente
- não pode existir chat sem Diego

### Permissões

- criar: todos
- editar nome: criador + Diego
- deletar: criador + Diego

---

# 📞 CONTATOS (ABA 3)

### Objetivo

- centralizar contatos úteis da operação

### Estrutura

- nome
- telefone (clicável)
- função
- categoria
- observações

---

### Categorias

- porteiro
- manutenção
- limpeza
- emergência
- outros

---

### Regras

- apenas admin cria novas categorias
- qualquer usuário pode adicionar contatos

---

### Permissões

- editar: criador + Diego
- deletar: criador + Diego

---

# 💰 FINANCEIRO

### Giro

- custos operacionais reais (limpeza + extras)

### Empresa

- salários
- encargos
- lavanderia
- contador
- impostos
- pró-labore

---

## 🧪 TESTE

- apt padrão: 403

validar:

- persistência
- custos extras
- agenda
- sync
- preço

---

## 🧩 BÚZIOS

- separado do Giro

---

## ☁️ GOOGLE

- não migrar agora

---

## 💡 EVENT PRICING

- aplicar weight em eventos
- preço_final = max(beyond, beyond * weight)

---

## 🧠 MARKETPLACE

- last-minute

---

## 📈 PROSPECÇÃO

- crescimento leve (1–2 apt/mês)

---

## 🧾 LOG

- bug guests_count ✔️ resolvido
- persistência ✔️ resolvida
- custos extras ✔️ implementado
- bug sync limpeza ⏳ resolvido
- bug sync cleaning_fee ⏳ pendente
- supabase config ⏳ pendente
