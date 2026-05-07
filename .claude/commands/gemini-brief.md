---
name: gemini-brief
description: Formata um brief no formato correcto para delegar ao Gemini Flash
---

Com base no contexto actual da conversa e no argumento fornecido ($ARGS), formata um brief para o Gemini no seguinte formato. Preenche cada campo com informação concreta — sem campos vagos.

Dita ao utilizador este bloco formatado para copiar para o Gemini:

```
CONTEXTO: [1 linha — o que estamos a fazer e porquê]
FICHEIRO: [path exacto do ficheiro a editar, ou "-" se for git/comando]
ALVO: [linhas exactas (ex: L45-67), nome de função, ou "novo ficheiro"]
TAREFA: [o que mudar exactamente — sem ambiguidade, sem "talvez"]
NÃO TOCAR: [o que o Gemini NÃO deve mexer — anti-scope-creep]
VALIDAR: [como saber que correu bem — output esperado, UI esperada, teste]
```

Após o bloco, indica qual o agente `.agent/agents/` mais adequado para incluir no brief (ex: "Usa o role backend-specialist.md para contexto Firebase").

Regra: só delegar ao Gemini tarefas da tabela em CLAUDE.md (git, CSS, docs .md, build check, visual check, mock data).
