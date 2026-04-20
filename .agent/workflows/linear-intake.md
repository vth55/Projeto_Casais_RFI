---
description: Transforma ideias brutas em issues estruturadas para o Linear.
---

# Workflow: /linear-intake 📥

Este workflow é ativado sempre que o utilizador fornece um "dump" de ideias ou requisitos e precisa de os organizar no Linear.

## Passos

1. **Ativação**: O utilizador escreve ideias ou fornece um rascunho.
2. **Análise de Domínio**:
   - Detetar se é Frontend, Backend, DevTools ou Design.
   - Identificar dependências com o Procore ou outras integrações.
   - Analisar código existente para não duplicar funcionalidades.
3. **Estruturação**: Para CADA issue, gerar este formato:

### Formato Obrigatório por Issue

Cada issue deve ser apresentado assim no chat, separado por `---`:

```
---

**TÍTULO (copiar para o campo Title do Linear):**
[LABEL] Verbo + descrição curta (ex: [FE] Implementar Login por PIN)

**DESCRIÇÃO (copiar para o campo Description do Linear):**

**Tipo:** Feature | Bug | Melhoria | Investigação
**Prioridade:** Urgent | High | Medium | Low
**Labels:** frontend, backend, firebase, mobile, ux, infra, docs
**Estimativa:** Small | Medium | Large
**Depende de:** PWA-XX (se aplicável)

## O quê e porquê
Descrição clara do que precisa ser feito.

## Critérios de aceitação
- [ ] Critério 1
- [ ] Critério 2

## Checklist de Testes (OBRIGATÓRIO)

### Funcionais
- [ ] Teste caminho feliz 1
- [ ] Teste caminho feliz 2

### Validação/Input
- [ ] Campos obrigatórios vazios
- [ ] Valores limite

### Mobile/Responsive
- [ ] iPhone SE (320px)
- [ ] iPhone 12/13 (390px)
- [ ] Tablet (768px)

### Dados (Firebase)
- [ ] Dados gravados corretamente
- [ ] Tipos corretos nas collections

### Edge Cases
- [ ] Duplo clique/submit
- [ ] Rede lenta / offline

---
```

O separador `---` marca onde acaba um issue e começa outro. O utilizador copia o TÍTULO para um campo e a DESCRIÇÃO para outro.

4. **Resumo Final**: Após listar todos os issues:
   - Total de issues criados
   - Distribuição por prioridade
   - Ordem sugerida de implementação
   - Dependências entre tasks
5. **Handoff**: Output pronto para copy-paste direto no Linear (site).

## Regras

- **OUTPUT NO CHAT**: Apresentar SEMPRE o resultado diretamente no chat como texto. NUNCA criar ficheiros .md ou gravar em disco. O utilizador vai copiar do chat para o Linear manualmente.
- **NUNCA** criar issues sem checklist de testes — é obrigatório em TODOS os issues
- Cada teste deve ser concreto e verificável (não genérico)
- Priorizar: bugs críticos > funcionalidades core > melhorias > nice-to-have
- Títulos com verbos de ação: Implementar, Corrigir, Adicionar, Refatorar
- Se uma ideia for demasiado grande, partir em sub-tasks
- Contexto do projeto: PWA industrial Casais com RFID, Firebase, React
- **NUNCA** mover issues para Done — máximo "In Review"
