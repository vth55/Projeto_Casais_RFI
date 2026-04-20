# Workflow: done-check

Verifica se uma feature cumpre todos os criterios antes de ser concluida.

Este e o "Portao de Seguranca" final antes de uma tarefa ser marcada como concluida.

## Passos

1. **Verificar Checklist de Testes**:
   - Existe checklist de testes para esta feature? Se NAO → gerar com `test-checklist` primeiro.
   - TODOS os itens da checklist foram testados? Se NAO → **BLOQUEADO**.
2. **Auditoria de Criterios**:
   - A issue esta no Linear (`PWA-XX`)?
   - O codigo segue os padroes de clean-code?
   - Sem erros na consola do browser?
   - Sem warnings criticos?
3. **Verificacao Tecnica**:
   - `vite build` corre sem erros?
   - Testes mobile verificados (pelo menos 1 device/tamanho)?
   - Nenhuma regressao identificada?
4. **Verificacao de Dados**:
   - Dados corretos no Firebase (verificar consola)?
   - Sem dados orphan ou duplicados?
5. **Veredito**:
   - Se TUDO estiver OK → **"PRONTO PARA CONCLUIR"**
   - Se algo falhar → lista bloqueadores e a tarefa fica em "In Progress"
   - Sugerir commit message com `PWA-XX` para atualizar o Linear automaticamente

## Regra de Ouro

- Sem checklist de testes = **NAO PODE SER DONE**
- "Parece funcionar" NAO e criterio suficiente — tem de estar testado
- **NUNCA** marcar diretamente como Done — so via commit com `PWA-XX` ou manualmente pelo utilizador
