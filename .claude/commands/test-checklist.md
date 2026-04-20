# Workflow: test-checklist

Gera uma checklist de testes obrigatoria para uma feature especifica.

Garante que nenhuma feature e enviada para producao sem uma bateria completa de testes.

## Passos

1. **Contexto**: Identificar qual a feature ou issue (`PWA-XX`) a ser testada.
2. **Analise**: Ler o codigo relevante para perceber o que foi implementado.
3. **Geracao de Checklist**: Criar lista dividida pelas 7 categorias abaixo.

## Formato Obrigatorio

```
## Checklist de Testes: [Nome da Feature]

**Issue Linear:** PWA-XX (se aplicavel)
**Data:** YYYY-MM-DD
**Status:** Pendente

### Testes Funcionais (caminho feliz)
- [ ] Teste 1 — descricao concreta
- [ ] Teste 2 — descricao concreta

### Testes de Input/Validacao
- [ ] Campos obrigatorios vazios
- [ ] Valores limite (max/min)
- [ ] Caracteres especiais

### Testes Mobile/Responsive
- [ ] iPhone SE (320px)
- [ ] iPhone 12/13 (390px)
- [ ] Tablet (768px)
- [ ] Landscape mode

### Testes de Dados (Firebase)
- [ ] Dados gravados corretamente na collection
- [ ] Campos com tipos corretos
- [ ] Timestamps atualizados
- [ ] Regras de seguranca respeitadas

### Testes Offline/PWA
- [ ] Funciona sem rede
- [ ] Sync quando volta online
- [ ] Cache atualizado

### Testes de Edge Cases
- [ ] Duplo clique/submit
- [ ] Rede lenta (3G throttle)
- [ ] Sessao expirada

### Testes de Regressao
- [ ] Features adjacentes continuam a funcionar
- [ ] Navegacao nao quebrou
- [ ] Dados existentes nao afetados
```

## Regras

- **NUNCA** gerar testes genericos — cada item deve ser especifico a feature
- Remover seccoes que nao se aplicam a feature em questao
- Adicionar seccoes especificas se necessario (ex: testes RBAC, testes de permissoes)
- Cada teste deve ser verificavel por uma pessoa sem contexto tecnico profundo
- Incluir o "como testar" quando nao for obvio
- Se a feature tiver multiplas user stories, separar checklists por story
- Se houver falha num teste critico, a feature **NAO PODE** avancar para `done-check`
