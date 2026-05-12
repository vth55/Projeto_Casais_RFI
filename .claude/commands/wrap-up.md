---
name: wrap-up
description: Fecha a sessão criando um ficheiro de documentação em docs/sessions/ e actualizando runtime/last_wrapup.md
---

Cria um ficheiro de wrap-up para esta sessão seguindo estes passos:

1. Determina a data e hora actual no formato `YYYY-MM-DD_HH-MM`
2. Cria o ficheiro `docs/sessions/YYYY-MM-DD_HH-MM.md` com este formato exacto:

```markdown
# Sessão YYYY-MM-DD HH:MM

**Foco:** $ARGS (ou resume em 1 linha o que foi feito se não houver argumento)
**Branch:** [branch git actual]

## O que foi feito
[lista bullet do que foi implementado/corrigido nesta sessão]

## O que NÃO funcionou
[para cada problema encontrado:]
### [Nome do problema]
**Objectivo:** [o que se tentava fazer]
**Tentativas:**
1. [o que foi tentado] — [resultado]
2. ...
**Próximo passo:** [sugestão concreta]

(omitir esta secção se não houve problemas)

## Estado actual
- **Funciona:** [lista do que está operacional]
- **Em progresso:** [lista do que está a meio]
- **Pendente:** [lista do que ficou por fazer]

## 3 Sugestões de próximas tarefas
1. **[Título]** — [porquê é importante] — esforço: S/M/L
2. **[Título]** — [porquê é importante] — esforço: S/M/L
3. **[Título]** — [porquê é importante] — esforço: S/M/L
```

3. Actualiza `.claude/memory/runtime/last_wrapup.md` com um resumo compacto da sessão (máx 20 linhas), incluindo: data, foco, o que foi feito, o que ficou pendente, as 3 sugestões.

4. Confirma ao utilizador: "Wrap-up guardado em docs/sessions/YYYY-MM-DD_HH-MM.md"
