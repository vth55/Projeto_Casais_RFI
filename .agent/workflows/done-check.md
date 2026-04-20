---
description: Verifica se uma feature cumpre todos os critérios antes de ser concluída.
---

# Workflow: /done-check ✅

O "Portão de Segurança" final antes de uma tarefa ser marcada como concluída.

## Passos

1. **Verificar Checklist de Testes**:
   - Existe checklist de testes para esta feature? Se NÃO → gerar com `/test-checklist` primeiro.
   - TODOS os itens da checklist foram testados? Se NÃO → **BLOQUEADO**.
2. **Auditoria de Critérios**:
   - A issue está no Linear (`PWA-XX`)?
   - O código segue os padrões de clean-code?
   - Sem erros na consola do browser?
   - Sem warnings críticos?
3. **Verificação Técnica**:
   - `vite build` corre sem erros?
   - Testes mobile verificados (pelo menos 1 device/tamanho)?
   - Nenhuma regressão identificada?
4. **Verificação de Dados**:
   - Dados corretos no Firebase (verificar consola)?
   - Sem dados orphan ou duplicados?
5. **Veredito**:
   - Se TUDO estiver OK → **"🚀 PRONTO PARA CONCLUIR"**
   - Se algo falhar → lista bloqueadores e a tarefa fica em "In Progress"
   - Sugerir commit message com `PWA-XX` para atualizar o Linear automaticamente

## Regra de Ouro

- **OUTPUT NO CHAT**: Apresentar SEMPRE o resultado diretamente no chat como texto. NUNCA criar ficheiros .md ou gravar em disco. O utilizador vai copiar do chat para o Linear manualmente.
- Sem checklist de testes = **NÃO PODE SER DONE**
- "Parece funcionar" NÃO é critério suficiente — tem de estar testado
- **NUNCA** marcar diretamente como Done — só via commit com `PWA-XX` ou manualmente pelo utilizador
