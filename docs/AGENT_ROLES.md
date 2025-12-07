# Definição de Papéis dos AI Agents

Este documento define os papéis e responsabilidades de cada AI Agent no projeto CASAIS FLEET INTELLIGENCE.

---

## Agent 1: Consultor (Claude Sonnet / Gemini Pro)

**Modelo Recomendado:** Gemini Pro 2.0 Thinking (contexto 1M tokens, grátis)

### Responsabilidades
- **Discussões de Arquitetura:** Analisar decisões técnicas, propor alternativas
- **Planeamento de Features:** Quebrar features grandes em tarefas menores
- **Code Reviews:** Analisar código existente, sugerir melhorias
- **Análise de Decisões Técnicas:** Avaliar trade-offs (performance vs. simplicidade, etc.)
- **Brainstorming de Soluções:** Gerar ideias, explorar possibilidades
- **Documentação:** Escrever/atualizar documentação técnica

### Restrições
- **READ-ONLY no código:** Não edita ficheiros, apenas analisa
- **Não implementa:** Apenas aconselha, não escreve código
- **Pode analisar ficheiros grandes:** Contexto grande permite análise completa

### Quando Usar
- "Analisa esta decisão técnica..."
- "Como devemos implementar X?"
- "Review este código..."
- "Planeia a feature Y..."
- "Documenta esta funcionalidade..."

### Exemplo de Prompt
```
Analisa a arquitetura atual do sistema de sessões. 
Sugere melhorias para escalabilidade quando tivermos 100+ máquinas.
Considera: performance, custos Firebase, complexidade.
```

---

## Agent 2: Implementador (Claude Sonnet 4.5)

**Modelo Recomendado:** Claude Sonnet 4.5 (tokens pagos - usar sabiamente)

### Responsabilidades
- **Implementação de Código:** Escrever código novo, modificar existente
- **Criação/Edição de Ficheiros:** Criar componentes, views, utils
- **Instalação de Dependências:** Adicionar packages ao package.json
- **Refactoring:** Melhorar código existente sem mudar funcionalidade
- **Correção de Bugs:** Identificar e corrigir erros
- **Integração:** Conectar componentes, fazer tudo funcionar junto

### Restrições
- **Código limpo, "humano":** Não perfeito demais, estilo de estudante
- **Comentários mínimos:** Só quando necessário, não código óbvio
- **Segue decisões do Consultor:** Implementa o que foi decidido
- **Nomes simples:** `authToken` não `userAuthenticationToken`

### Quando Usar
- "Implementa a feature X..."
- "Corrige este bug..."
- "Cria o componente Y..."
- "Refatora este código..."
- "Adiciona a dependência Z..."

### Exemplo de Prompt
```
Implementa o sistema de tarifários versionados.
Cria a view FinanceiroView.jsx com formulário de tarifário.
Adiciona campo costPerHour nas máquinas.
Calcula custos por sessão automaticamente.
```

---

## Agent 3: Testador (Gemini Flash / Claude - Opcional)

**Modelo Recomendado:** Gemini Flash 2.0 (rápido, grátis)

### Responsabilidades
- **Escrever Testes:** Testes unitários, integração, E2E
- **Validar Funcionalidades:** Verificar se features funcionam corretamente
- **Encontrar Edge Cases:** Identificar cenários não testados
- **Testes de Regressão:** Verificar se mudanças quebraram algo
- **Testes de Performance:** Verificar se código é rápido o suficiente

### Restrições
- **Foco em testes:** Não implementa features, só testa
- **Rápido e eficiente:** Usar modelo rápido (Flash) para testes simples

### Quando Usar
- "Escreve testes para X..."
- "Valida se Y funciona..."
- "Encontra edge cases em Z..."
- "Testa regressão após mudança..."

### Exemplo de Prompt
```
Escreve testes para o sistema de sessões.
Testa: cartão válido, cartão inválido, sessão duplicada, timeout.
```

---

## Fluxo de Trabalho Recomendado

### 1. Planeamento (Agent Consultor)
```
Consultor: Analisa requisito → Sugere arquitetura → Define tarefas
```

### 2. Implementação (Agent Implementador)
```
Implementador: Implementa tarefa 1 → Implementa tarefa 2 → ...
```

### 3. Validação (Agent Testador - Opcional)
```
Testador: Escreve testes → Valida funcionalidade → Reporta problemas
```

### 4. Refinamento (Agent Consultor + Implementador)
```
Consultor: Review código → Sugere melhorias
Implementador: Aplica melhorias
```

---

## Regras Gerais para Todos os Agents

1. **Sempre ler CLAUDE.md primeiro** - Contexto completo do projeto
2. **Seguir estilo de código "humano"** - Não perfeito demais
3. **Documentar decisões importantes** - Atualizar CLAUDE.md se necessário
4. **Comunicar problemas** - Se algo não faz sentido, perguntar
5. **Respeitar arquitetura existente** - Não refatorar tudo sem necessidade

---

## Exemplo de Sessão Completa

**Utilizador:** "Preciso de sistema de notificações push"

**Agent Consultor:**
- Analisa requisito
- Sugere: Service Worker + Firebase Cloud Messaging
- Define tarefas: 1) Criar Service Worker, 2) Configurar FCM, 3) Implementar UI

**Agent Implementador:**
- Cria `public/sw.js` (Service Worker)
- Adiciona FCM ao `firebase.js`
- Cria `utils/notifications.js`
- Integra no `App.jsx`

**Agent Testador (opcional):**
- Testa se notificações aparecem
- Testa se funcionam offline
- Valida edge cases

**Resultado:** Sistema de notificações funcional e testado

---

**Última atualização:** 2025-01-XX

