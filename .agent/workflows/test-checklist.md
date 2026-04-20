---
description: Gera uma checklist de testes obrigatória para uma feature específica.
---

# Workflow: /test-checklist 🧪

Garante que nenhuma feature é enviada para produção sem uma bateria completa de testes.

## Passos

1. **Contexto**: Identificar qual a feature ou issue (`PWA-XX`) a ser testada.
2. **Análise**: Ler o código relevante para perceber o que foi implementado.
3. **Geração de Checklist**: Criar lista dividida pelas categorias abaixo.

## Formato Obrigatório

```
## 🧪 Checklist de Testes: [Nome da Feature]

**Issue Linear:** PWA-XX (se aplicável)
**Data:** YYYY-MM-DD
**Status:** ⏳ Pendente

### Testes Funcionais (caminho feliz)
- [ ] Teste 1 — descrição concreta
- [ ] Teste 2 — descrição concreta

### Testes de Input/Validação
- [ ] Campos obrigatórios vazios
- [ ] Valores limite (máx/min)
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
- [ ] Regras de segurança respeitadas

### Testes Offline/PWA
- [ ] Funciona sem rede
- [ ] Sync quando volta online
- [ ] Cache atualizado

### Testes de Edge Cases
- [ ] Duplo clique/submit
- [ ] Rede lenta (3G throttle)
- [ ] Sessão expirada

### Testes de Regressão
- [ ] Features adjacentes continuam a funcionar
- [ ] Navegação não quebrou
- [ ] Dados existentes não afetados
```

## Regras

- **OUTPUT NO CHAT**: Apresentar SEMPRE o resultado diretamente no chat como texto. NUNCA criar ficheiros .md ou gravar em disco. O utilizador vai copiar do chat para o Linear manualmente.
- **NUNCA** gerar testes genéricos — cada item deve ser específico à feature
- Remover secções que não se aplicam à feature em questão
- Adicionar secções específicas se necessário (ex: testes RBAC, testes de permissões)
- Cada teste deve ser verificável por uma pessoa sem contexto técnico profundo
- Incluir o "como testar" quando não for óbvio
- Se a feature tiver múltiplas user stories, separar checklists por story
- Se houver falha num teste crítico, a feature **NÃO PODE** avançar para `/done-check`
