# PLAN — SUA CASA LEBLON

---

## 🔥 AGORA

- corrigir Agenda no /equipe (bug: "undefined NaN Mar")
- validar no apt 403:
  - datas corretas
  - checkout gera limpeza
  - sem duplicação
- garantir persistência de edições
- corrigir sync de data de limpeza (ver seção abaixo)

---

## ⚙️ EM ANDAMENTO

- estabilizar Giro (/equipe)
- integração API reservas (token-based)
- estrutura de apartamentos (admin + site)
- regras de despesas

---

## 🧠 DECISÕES TRAVADAS

### Produto
- Sistema = gestão completa da operação
- Giro (/equipe) = núcleo operacional
- NÃO redesenhar Giro
- Agenda só existe se virar ferramenta de decisão

### Modos
- Operação = execução
- Financeiro = leitura

---

## 📅 DATAS E AGENDA (CRÍTICO)

- timezone: America/Sao_Paulo
- TODA data da API deve ser normalizada ao entrar
- nunca usar Date sem timezone

- check-in: 15:00
- check-out: 11:00
- checkout gera limpeza no mesmo dia

- API pode retornar UTC (ex: "2026-03-29T20:30:00Z")
→ sempre converter antes de usar

---

## 🚨 BUG — SYNC DE DATA DE LIMPEZA

Problema:
- datas de limpeza não estão sincronizando corretamente na interface
- inconsistência entre reservas e geração de tarefas de limpeza

Possíveis causas:
- erro na lógica de derivação da data (check-out → limpeza)
- problema no sync que reconstrói eventos
- conflito entre dados manuais e dados da API

Regra:
- data de limpeza deve sempre derivar corretamente do checkout
- não pode haver divergência visual entre agenda e estado real

Status:
→ PENDENTE DE CORREÇÃO

---

## 🔴 PERSISTÊNCIA (CRÍTICO — NÃO QUEBRAR)

- alterações do usuário DEVEM persistir
- edição nunca pode ser sobrescrita pelo sync

fluxo correto:
UI edit → API → DB → UI atualizado

---

## 🔌 API (CRÍTICO)

- usar Authorization: Bearer TOKEN
- nunca expor no frontend
- chamadas via backend

- API inconsistente:
  - tratar campos como opcionais
  - validar antes de usar

---

## 🌍 APARTAMENTOS

- cadastro via sistema (admin)
- localização: Leblon / Ipanema / Búzios

- filtro site:
  [Leblon] [Outros]

---

## 💰 FINANCEIRO

### Giro (custos operacionais)
- limpeza (custo base)
- custos adicionais:
  - transporte
  - compra
  - manutenção
  - outro

### Empresa (custos globais)
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

---

## 🧩 BÚZIOS

- separado do Giro
- não misturar lógica

---

## ☁️ GOOGLE

- não migrar nada sem validação
- evolução gradual

---

## 💡 EVENT PRICING

- aplicar weight em eventos
- preço_final = max(beyond, beyond * weight)

---

## 🧠 MARKETPLACE

- foco: buracos de calendário
- last-minute

---

## 📈 PROSPECÇÃO

- crescimento leve (1–2 apt/mês)
- não depender de esforço manual pesado

---

## 🧾 LOG

- bug Agenda NaN
- bug persistência
- bug guests_count
- bug sync de data de limpeza
