# Workflow: linear-intake

Transforma ideias brutas em issues estruturadas para o Linear.

Este comando é ativado sempre que o utilizador fornece um "dump" de ideias ou requisitos e precisa de os organizar no Linear.

## Passos

1. **Ativacao**: O utilizador escreve ideias ou fornece um rascunho.
2. **Analise de Dominio**:
   - Detetar se e Frontend, Backend, DevTools ou Design.
   - Identificar dependencias com o Procore ou outras integracoes.
   - Analisar codigo existente para nao duplicar funcionalidades.
3. **Estruturacao**: Para CADA issue, gerar este formato exato:

### Formato Obrigatorio por Issue

```
### [PRIORIDADE] Titulo com verbo de acao

**Tipo:** Feature | Bug | Melhoria | Investigacao
**Prioridade:** Urgent | High | Medium | Low
**Labels:** frontend, backend, firebase, mobile, ux, infra, docs
**Estimativa:** Small | Medium | Large
**Depende de:** PWA-XX (se aplicavel)

**Descricao:**
O que precisa ser feito e porque.

**Criterios de aceitacao:**
- [ ] Criterio 1
- [ ] Criterio 2

**Checklist de Testes (OBRIGATORIO):**

Testes Funcionais:
- [ ] Teste caminho feliz 1
- [ ] Teste caminho feliz 2

Testes de Validacao/Input:
- [ ] Campos obrigatorios vazios
- [ ] Valores limite

Testes Mobile/Responsive:
- [ ] iPhone SE (320px)
- [ ] iPhone 12/13 (390px)
- [ ] Tablet (768px)

Testes de Dados (Firebase):
- [ ] Dados gravados corretamente
- [ ] Tipos corretos nas collections

Testes Edge Cases:
- [ ] Duplo clique/submit
- [ ] Rede lenta / offline
```

4. **Resumo Final**: Apos listar todos os issues:
   - Total de issues criados
   - Distribuicao por prioridade
   - Ordem sugerida de implementacao
   - Dependencias entre tasks
5. **Handoff**: Output pronto para copy-paste direto no Linear (site).

## Regras

- **NUNCA** criar issues sem checklist de testes — e obrigatorio em TODOS os issues
- Cada teste deve ser concreto e verificavel (nao generico)
- Priorizar: bugs criticos > funcionalidades core > melhorias > nice-to-have
- Titulos com verbos de acao: Implementar, Corrigir, Adicionar, Refatorar
- Se uma ideia for demasiado grande, partir em sub-tasks
- Contexto do projeto: PWA industrial Casais com RFID, Firebase, React
- **NUNCA** mover issues para Done — maximo "In Review"
