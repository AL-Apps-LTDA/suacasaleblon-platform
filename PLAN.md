Contexto do projeto:

Existe um arquivo PLAN.md com todas as regras do sistema.
Siga essas regras como prioridade.

Objetivo agora:
→ finalizar a primeira aba do /equipe (Giro)

Problemas que precisam ser corrigidos:

1. Persistência (CRÍTICO)
- alterações feitas pelo usuário não podem ser perdidas
- não pode haver sobrescrita por sync
- fluxo correto:
  UI edit → API → DB → UI atualizado

2. Estrutura da limpeza
- cada limpeza deve ter:
  - custo base
  - custos adicionais:
    - tipo (transporte, compra, outro)
    - valor

3. Integração
- custos da limpeza pertencem ao Giro
- NÃO lançar isso no financeiro manual

Regras:
- não criar novas telas
- não mexer fora do /equipe
- manter UX simples
- não refatorar o sistema inteiro

Objetivo final:
→ limpeza funciona
→ custos funcionam
→ edição persiste
