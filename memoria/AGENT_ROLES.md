# Sistema de Agentes - Claude Code

## Modelos Disponíveis

| Modelo | Uso | Comando |
|--------|-----|---------|
| **Sonnet 4.5** | Tarefas complexas, implementação | `sonnet` ou `--model sonnet` |
| **Haiku 4** | Tarefas simples, pesquisas | `haiku` ou `--model haiku` |

## Agentes Configurados (/agents)

### 1. haiku-rapido (Económico)
**Modelo:** Haiku 4
**Acesso:** READ-ONLY (Glob, Grep, Read)

**Usar para:**
- Pesquisas no código
- Análises rápidas
- Perguntas simples
- Verificações

**Exemplo:** "Usa o haiku-rapido para encontrar onde está definido o componente X"

---

### 2. sonnet-dev (Completo)
**Modelo:** Sonnet 4.5
**Acesso:** FULL (Read, Write, Edit, Bash)

**Usar para:**
- Implementar features
- Editar código
- Criar ficheiros
- Refatorar

**Exemplo:** "Usa o sonnet-dev para implementar o sistema de tarifários"

---

## Quando Usar Cada Modelo

### Haiku 4 (Barato) ✅
- Pesquisas no código
- Perguntas de contexto
- Análises simples
- Formatação de texto
- Verificar se ficheiro existe

### Sonnet 4.5 (Principal) ⚡
- Implementação de código
- Refatoração complexa
- Debugging
- Criação de componentes
- Lógica de negócio

---

## Fluxo de Trabalho Recomendado

```
1. PLANEAR (Sonnet ou conversa normal)
   - Discutir o que fazer
   - Definir tarefas

2. PESQUISAR (Haiku - economiza tokens)
   - Encontrar ficheiros relevantes
   - Verificar código existente

3. IMPLEMENTAR (Sonnet)
   - Criar/editar código
   - Testar

4. VALIDAR (Haiku ou manual)
   - Verificar se funciona
   - Code review rápido
```

---

## Como Forçar Modelo

**Terminal:**
```bash
sonnet          # Abre com Sonnet
haiku           # Abre com Haiku
```

**Dentro do Claude Code:**
```
/model sonnet   # Muda para Sonnet
/model haiku    # Muda para Haiku
```

**Agentes:**
```
/agents         # Ver agentes disponíveis
```

---

## Economizar Tokens

1. **Não debater muito** - Ir direto ao ponto
2. **Usar Haiku para pesquisas** - É mais barato
3. **Sonnet só para implementar** - Quando precisa de editar
4. **Resumos curtos** - Não pedir explicações longas
5. **Uma tarefa de cada vez** - Evitar listas gigantes

---

**Última atualização:** 08 Dezembro 2025
