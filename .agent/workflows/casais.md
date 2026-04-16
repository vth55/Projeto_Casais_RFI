---
description: Comando Mestre Casais - Ativa Orquestrador, Schemas e Skills automaticamente.
---

# 🚀 Workflow Master Casais

Sempre que o utilizador usar o comando `/casais`, a IA deve seguir rigorosamente estes passos antes de responder ou editar código:

### 1. Auditoria de Contexto (Silent)
- Ler `llms.txt` para status atual.
- Ler `docs/standards/FIREBASE_SCHEMAS.md` para nomes de campos.
- Ler `docs/architecture/ADR/` para decisões bloqueadoras.

### 2. Ativação de Especialistas
- Invocar automaticamente o agente `orchestrator`.
- Selecionar `skills` baseadas no domínio (Frontend, Backend, Hardware).

### 3. Validação de Padrões
- Comparar a proposta com o `docs/standards/CODE_PATTERNS.md`.
- Garantir que o "Purple Ban" e as cores Casais (#005EB8) são respeitados.

### 4. Execução e Registo
- Realizar a tarefa pedida.
- Atualizar o `DOCS_HISTORY.md` no final da tarefa.
- Se houver uma decisão nova, propor um novo **ADR**.

---
> **Objetivo**: Garantir que o Vitor não precisa de se preocupar com nomes de agentes. O comando `/casais` resolve tudo.
