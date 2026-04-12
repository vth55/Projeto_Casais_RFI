# CASAIS FLEET INTELLIGENCE - Memória do Projeto

> **Ficheiro único de contexto** - Substitui todos os ficheiros da pasta memoria/

---

## 🚀 PRÓXIMA SESSÃO - INSTRUÇÕES

**Data da última sessão:** 19/12/2025
**Último commit:** `9d919e3` - revert: manter DevTools visível para testes

---

## 🧪 PRÓXIMA SESSÃO - FASE DE TESTES

### Plano de Testes (a fazer):

**1. Testes Web (cada view):**
- [ ] Dashboard - KPIs, gráficos, botão "Ver Todos"
- [ ] Máquinas - CRUD, filtros, mudança bulk localização
- [ ] Operadores - CRUD, licenças, cargos
- [ ] Sessões - Ativas, histórico, validações, exportar CSV
- [ ] Obras - CRUD, mapa Google, cartões RFID localização
- [ ] Manutenção - Alertas, histórico, fotos
- [ ] Financeiro - Tarifários (criar/editar/eliminar), exportar
- [ ] Análises - Comparações, gráficos por hora
- [ ] Configurações - Perfis de acesso, modo demo

**2. Testes RFID + Hardware:**
- [ ] Leitura de cartões RFID
- [ ] Transmissão de dados para Firebase
- [ ] Abertura/fecho de sessões
- [ ] Cartões de localização (LOC_)

**Método:** Testar cada botão e comportamento individualmente

---

### ESTADO ATUAL
✅ **Tudo implementado e funcional:**
- PWA com Service Worker e offline
- Perfis de Acesso com Modo Demo
- RFID de Localização (cartões LOC_)
- Fotos na Manutenção
- Sistema de Email e Validação
- DevTools completo
- **Integração Procore (Fase 2 - Concluída)**: Sync horária + Badges UI + Aba Integrações.
- **Todos os botões do Dashboard com funcionalidades reais** ✅

### O QUE FALTA (Baixa Prioridade)
1. **Notificações Push** - Alertas de manutenção e sessões longas
2. **Remover DevTools** antes de entregar ao cliente (está marcado no código)

### CORRIGIDO NESTA SESSÃO (18/12/2025)
**Auditoria de Botões - Botões que eram apenas visuais agora funcionam:**
1. DashboardView - "Ver Todos" → navega para manutenção
2. SessoesView - "Exportar CSV" → exporta sessões para CSV
3. SessoesView - "Validar" → abre modal de validação com correção de horários
4. FinanceiroView - "Exportar" → exporta relatório financeiro para CSV
5. FinanceiroView - Edit/Delete tarifários → edita/elimina tarifários no Firestore

### PARA TESTAR
```bash
cd Frontend_App/dashboard && npm run dev
```

### PARA FAZER PUSH
```bash
cmd.exe /c "cd /d C:\Users\vitor\OneDrive\Área de Trabalho\Projeto_Casais_RFI && git push origin main"
```

---

## RESUMO RÁPIDO

| Item | Valor |
|------|-------|
| Projeto | PWA Gestão de Frotas Industriais |
| Cliente | Grupo Casais (empresa real) |
| Prazo | Junho 2025 |
| Stack | React 19 + Vite + Firebase + Tailwind |
| 

---

## ARQUITETURA

```
Hardware (Arduino + RFID)
         ↓
Firebase Cloud Functions (handleSessionTrigger)
         ↓
Firestore (operators, machines, sessions)
         ↓
React PWA (Dashboard, Views, Components)
```

---

## ESTRUTURA FIRESTORE

```
artifacts/casais-rfid/public/data/
├── operators/{cardId}     → {name, registeredAt}
├── machines/{machineId}   → {name, status, totalHours, consumptionRate}
├── sessions/{autoId}      → {cardId, machineId, startTime, endTime, status}
├── scan_buffer/latest     → {cardId, timestamp} (auto-fill)
└── unregistered_scans/    → logs de segurança
```

---

## FEATURES IMPLEMENTADAS

- Dashboard com KPIs e 4 gráficos (Recharts)
- Navegação Sidebar com submenus + tabs
- Gestão: Máquinas, Operadores, Sessões
- Scan-to-Register (auto-fill de cartões)
- Alertas de Manutenção (150h threshold)
- Cálculo CO₂ (horas × consumo × 2.68)
- Exportação CSV
- Responsivo (mobile/tablet/desktop)
- Hardware RFID com LEDs feedback

---

## FEATURES EM FALTA (Por Prioridade)

### CRÍTICO
1. **Módulo Financeiro** - Centros custo, tarifários €/h, rentabilidade
2. **Qualidade de Dados** - Alerta 5h, auto-close 14h, validação email

### ALTA
3. Duplo Contador (horas totais + parciais)
4. Histórico Manutenção com fotos

### MÉDIA
5. PWA completo (Service Worker, offline)
6. Perfis de acesso (Operador/Gestor/Financeiro)

### BAIXA
7. Dashboard Executivo, Mapa, Notificações push

---

## DECISÕES TÉCNICAS

| Decisão | Valor | Razão |
|---------|-------|-------|
| Threshold Manutenção | 150h | Baseado em prática industrial |
| Fator CO₂ | 2.68 kg/L | Standard diesel EPA |
| Alerta Fadiga | 5h | Visual apenas |
| Auto-close | 14h | Encerra + email validação |
| Histórico | Original + Corrigido | Auditoria completa |

---

## COMANDOS

```bash
# Frontend
cd Frontend_App/dashboard && npm run dev

# Deploy Backend
cd Backend_Cloud && firebase deploy --only functions

# Python Bridge (Arduino)
python Hardware_Bridge_PC/serial_to_cloud_bridge.py
```

---

## REGRAS DE TRABALHO GERAIS
1. Qualidade > Velocidade (6 meses disponíveis)
2. Código nível enterprise, não protótipo
3. O Gestor de Documentação e GitHub é o Gemini (Não enviar comandos Git)
4. Testes antes de reportar a conclusão da feature.

---

## PATHS IMPORTANTES

```
Frontend:     Frontend_App/dashboard/src/
Views:        Frontend_App/dashboard/src/views/
Components:   Frontend_App/dashboard/src/components/
Config:       Frontend_App/dashboard/src/config/
Backend:      Backend_Cloud/functions/index.js
Hardware:     arduino_rfid_simple/
```

---

## NOTAS DE SESSÃO

**12 Abril 2026 (Fix Crítico do Web NFC & Layout PWA - Gemini & Claude):**
- **Estado**: ✅ CONCLUÍDO e DEPLOYED.
- [x] **Web NFC Engine**: Refatoração profunda na lógica de leitura RFID nativa do browser em `OperadoresView`. Remoção de `AbortController` bloqueadores, padronização idêntica ao `MobileHubView` (event listeners explícitos e referências corretas à `window.NDEFReader`).
- [x] **Tratamento de Permissões**: Componente passa a renderizar os erros localizados (`nfcError`) caso o acesso seja negado nativamente pelo browser / SO Android.
- [x] **Vite PWA SPA Fix**: Descoberto e resolvido bug letal no Service Worker. O `navigateFallback` no `vite.config.js` estava calibrado para o ecrã `offline.html`, capturando e bloqueando todo o routing de deep-links em standalone (ex: `/mobile-hub`). Redirecionado com sucesso para o `index.html`.
- **Próximo Passo**: Iniciar elaboração do sistema de controlo de Anomalias (rota `/validar/:token`) ou sistema de histórico de tarifários.

**07 Abril 2026 (Fix Crítico de Persistência & PWA Navigation - Gemini):**
- **Estado**: ✅ DEPLOYED & ESTÁVEL.
- [x] **PWA Navigation History**: Sincronização da `activeView` com a History API do browser, permitindo utilização do botão "voltar" físico do telemóvel e novo botão visual no Header.
- [x] **Firestore Protection**: Implementada função `sanitizeData` no `useStore.js` para filtrar campos de UI (`systemRoleLevel`, `totalHours`, etc.) antes da persistência.
- [x] **PWA Industrial**: Deploy final bem-sucedido via Windows Native, corrigindo bloqueios de cache no hosting.
- [x] **UI/UX Premium**: Validação visual do Dashboard com sistema de design Casais (Gradients/Glassmorphism).
- **Resolução**: Eliminado erro `Unsupported field value: undefined` que bloqueava a edição manual de operadores e cartões RFID.

**07 Abril 2026 (PWA Offline & UI Sync - Minimax):**
- **Estado**: ✅ IMPLEMENTADO.
- [x] **Modo Offline PWA**: `enableIndexedDbPersistence` ativado no Firebase. Cache local automático que permite usar a app sem rede e sincronizar ao voltar a net.
- [x] **Indicador de Conexão**: Novo componente `useOnlineStatus` e indicador visual no `Header.jsx` (Online/Offline).
- [x] **UI Dinâmica**: `LiveSessionsBar` agora oculta-se automaticamente em modo offline para evitar discrepâncias de timers.
- [x] **Assets PWA**: Novo ícone `icon-192.svg` com branding oficial Casais (#005EB8), atualização do `manifest.json` e remoção do botão de "voltar" em modo standalone.

**12 Abril 2026 (Polimento Técnico e JSDoc Fase 5 - Claude Code):**
- **Estado**: ✅ CONCLUÍDO (Higienização de Código Backend/Frontend).
- [x] **Triggers Simplificados**: Em `index.js`, redução maciça de "ruído" (apenas `.catch` fatais se mantêm logados no Procore Push associado a fechamentos).
- [x] **JSDoc Enterprise**: Todas as funções-mestra em `procoreSessionExporter.js` receberam cabeçalhos de documentação detalhados e os logs de debug inúteis foram apagados.
- [x] **Cleanup**: Componente fantasma (`ProcoreSyncCard`) foi apagado e ficheiro de dependências locais temporário (`TAREFAS_PENDENTES.txt`) foi consumido pelo Claude.
- **Conclusão Formal**: O módulo Procore RFI entra agora em estado 'Code Freeze'. Fica apenas a faltar a demonstração real ao cliente Casais.

**11 Abril 2026 (UI/UX Refactoring Procore Fase 4 - Claude & Gemini):**
- **Estado**: ✅ CONCLUÍDO (Frontend Dashboard).
- [x] **Comando Central**: Fiel às guidelines da equipa (`frontend-design`, `frontend-specialist`), foi implementado o `ProcoreReconciliationPanel` no `DashboardView` para desktop, substituindo o anterior `ProcoreSyncCard`.
- [x] **Design Premium Casais**: Respeito integral da paleta HSL brand (#005EB8) com remoção da cor roxa. Elementos com `cubic-bezier` animations perfeitamente coreografados, painéis geométricos *sharp-edge* e design assimétrico.
- [x] **Dados Acionáveis**: Adicionados anéis de SVG dinâmicos para medir a integridade das sessões exportadas e barras duplas de progresso (Procore vs Local) com gap de horas e percentagens reconciliadas em tempo real.
- **Próximo Passo**: Fase 5 - Polimento Final e Documentação Técnica.

**11 Abril 2026 (Automação IoT Procore Fase 3 - Claude & Gemini):**
- **Estado**: ✅ CONCLUÍDO (Backend Cloud Functions).
- [x] **Refatoração do Exportador**: `procoreSessionExporter.js` sofreu um refactor integral para permitir a resolução paralela de entidades, com guardas de idempotência e limpeza de código não utilizado.
- [x] **Gestão Segura de Tokens**: Processo de refresh automático de OAuth injetado transparentemente direto no `procoreFetch`.
- [x] **Motor de Resiliência (Retry)**: Criada nova Cloud Function cron (`procoreExportRetry`) que corre de 30 em 30 min com backoff exponencial (5m → 20m → 60m → cancelamento) para recuperar payloads de Timecards que falhem.
- [x] **Trigger Nativo PWA -> ERP**: O disparo foi agrafado aos fechos reais e `autoCloseStuckSessions` na função principal `handleSessionTrigger` via "fire-and-forget".
- **Próximo Passo**: (Opcional/Fase 4) Dashboards executivos e UI com Budget vs Spend importados.

**07 Abril 2026 (Auditoria Final Fase 2 - Gemini):**
- **Estado**: ✅ CONCLUÍDO (Backend + Frontend).
- [x] **Match de Entidades**: Implementada lógica de normalização e fuzzy match em `useStore.js` para vincular Obras e Operadores locais a Projetos e Users do Procore.
- [x] **Badges Procore**: Adicionados indicadores visuais (`Link2`) no `ObrasView` e `OperadoresView` para identificar registos sincronizados.
- [x] **Aba de Integrações**: Criada nova secção em `ConfiguracoesView` com status da Cloud Cloud, estatísticas de sync e botão de disparo manual.
- [x] **Sincronização de Docs**: `MATRIZ_ACOMPANHAMENTO.md` e `project_procore_status.md` retificados para refletir o progresso real.
- **Fase Seguintes Cumpridas**: FASE 3 (Push IoT).

**0715: | 1.1.0-stable | 07/04/2026 | Purga ESP32 + Fase 1 e 2 Procore (Sync + UI) |
Chunk 1B & 1C - Claude Opus):**
- **Estado**: ✅ DEPLOYED.
- [x] **Backend Sync**: Agendamento horário (v2) funcional para Projetos, Equipamentos e Diretório.
- [x] **Frontend Bridge**: Implementação da Opção B (Enriquecimento) no Dashboard.
- [x] **Industrialização**: Persistência idempotente e sanitização de dados antes do salvamento no Firestore.

**06 Abril 2026 (Noite - A Revelação Procore):**
- **Discovery**: Confirmado que a Casais utiliza **Procore**. O projeto pivota de "App Isolada" para **"IoT Layer for Procore"**.
- **Procore Bridge**: Definido plano de 7 fases para integração total (Timecards, Daily Logs, Budget Sync).
- **Mobile Hub Finalizado**: PWA totalmente funcional com Auto-ID, Auto-Registo e NFC ativado por gesto (Industrial-ready).
- **Roadmap Persistente**: Criado [project_procore_integration.md](file:///c:/Users/vitor/OneDrive/%C3%81rea%20de%20Trabalho/Projeto_Casais_RFI/docs/project_procore_integration.md) com as diretrizes e modelos de IA para cada fase.
- **Próximo Passo**: Iniciar **FASE 0** (Registo no Developer Portal da Procore) amanhã usando o modelo **Sonnet**.

**06 Abril 2026 (Industrialização Mobile - Claude Opus):**
- **Mobile Hub Auto-ID**: Implementada lógica de auto-geração de ID (`M_MOB_...`) persistente.
- **Auto-Registo no Firestore**: O telemóvel regista-se autonomamente como "Máquina" na primeira utilização, seguindo o schema padrão do sistema.
- **Dashboard Full-Sync**: As máquinas mobile aparecem na lista de Equipamentos e podem ser editadas pelo gestor (mudar nome, local, etc).
- **Conectividade `/api/session`**: Migração para endpoints relativos via Firebase Hosting Rewrites (Resiliência de Região).
- **UX "Instant-On"**: Remoção do ecrã de setup; o PWA entra direto no modo de leitura NFC.
- **Documento Atualizado**: 📱 [Hardware Mobile](file:///c:/Users/vitor/OneDrive/%C3%81rea%20de%20Trabalho/Projeto_Casais_RFI/docs/DECISAO_HARDWARE_MOBILE.md) - Marcado como Implementado.

**06 Abril 2026 (Sessão Estratégica - Gemini):**
- **Laboratório Virtual de Braga**: Configurado simulador para testar hardware sem hardware físico em Braga.
- **Debate de Arquitetura V2**: Identificados 4 pontos críticos para scale-up industrial (Segurança, Conectividade, Escalabilidade).
- **Resiliência Híbrida**: Proposta de "BLE Harvesting" para zonas sem rede (AirTag style) e "Human-Relay Mesh".
- **Segurança IoT**: Identificada falta de Auth nos endpoints (Solução: API Keys).
- **Escalabilidade**: Planeamento de Cold Storage no BigQuery para reduzir custos Firestore.
- **Documentos Criados (Ativos de Inovação)**:
  - 🏗️ [Estratégia V2](file:///c:/Users/vitor/OneDrive/%C3%81rea%20de%20Trabalho/Projeto_Casais_RFI/docs/ESTRATEGIA_ARQUITETURA_V2.md) - Visão de Futuro.
  - 🧪 [Plano de Testes V2](file:///c:/Users/vitor/OneDrive/%C3%81rea%20de%20Trabalho/Projeto_Casais_RFI/docs/PLANO_DE_TESTES_V2.md) - Protocolo de Validação.
- **Hardware**: Decisão de focar no Arduino para o produto final.

**08 Dezembro 2025 (Sessão 3):**
- Componentes melhorados para nível enterprise
- Ficheiros antigos arquivados em `memoria/_arquivo/`

**08 Dezembro 2025 (Sessão 1):**
- Leitura completa do projeto
- Estrutura de memória consolidada

---

## TAREFAS CONCLUÍDAS (Sessão 09/12)

1. **Módulo Obras (Sites)** ✅
   - Gestão de obras com nome, endereço, GPS
   - Integração Google Maps (visualização)
   - CRUD completo + estados (ACTIVE, PLANNED, PAUSED, COMPLETED)
   - View: `ObrasView.jsx`

2. **Gráficos Período vs Período** ✅
   - Tab "Comparação" em AnalisesView
   - Selectors para dois períodos
   - ComparisonCard com indicadores de tendência
   - Gráficos de barras e linhas comparativos

3. **Mudança Manual de Localização** ✅
   - Seleção bulk de múltiplas máquinas
   - Modo de seleção com checkboxes
   - BulkLocationModal para escolher obra destino
   - Ação `moveMachinesToObra` no store

4. **Remover referências IA/Gemini** ✅
   - Endpoints removidos de `Backend_Cloud/functions/index.js`
   - Utils Gemini não utilizados (podem ser removidos)

5. **Cargos de Funcionários** ✅
   - 6 tipos de cargos: Operador, Encarregado de Obra, Supervisor, Técnico de Manutenção, Gestor de Frota, Administrativo
   - RoleBadge com cores diferenciadas
   - Filtros por cargo e por obra
   - Edição de operadores
   - Legenda de cargos na UI

6. **Auto-assign funcionários a obras** ✅
   - Sugestões automáticas baseadas no uso de máquinas
   - Analisa sessões e localização das máquinas
   - Card de sugestões com aceitar/dispensar
   - Threshold de 5h mínimas para sugestão

## TAREFAS CONCLUÍDAS (Sessão 17/12)

1. **Sistema de Alertas e Validação** ✅
   - `useAlertsStore.js` - Store para alertas com estados PENDING/VALIDATED/CORRECTED
   - `ValidationPage.jsx` - Página de validação via link do email (sem login)
   - URL pattern: `/validar/:token`
   - Routing simples em `App.jsx` (sem React Router)
   - Flag `alertsLoaded` para evitar loading infinito

2. **Dark Mode** ✅
   - `useThemeStore.js` - Store com persist para tema
   - Toggle em ConfiguracoesView (Aparência)
   - Classes dark mode em Layout, Header, Card
   - `tailwind.config.js` com `darkMode: 'class'`

3. **Sidebar Melhorado** ✅
   - Comportamento accordion (só 1 menu aberto)
   - Submenu "Validações" em Sessões
   - `SessoesCorrigidasView.jsx` para gestão de validações

4. **Operadores - Licenças de Máquinas** ✅
   - Removido campo "Departamento"
   - Adicionado LICENSE_TYPES (Escavadoras, Gruas, Empilhadores, etc.)
   - UI de seleção de licenças no formulário

5. **Gráficos Por Hora** ✅
   - Nova tab "Por Hora" em AnalisesView
   - Distribuição horária (0h-23h)
   - Cards de período (Madrugada, Manhã, Tarde, Noite)
   - Estatísticas (hora de pico, total sessões, média)

6. **DevTools Completo** ✅
   - Tab **Alertas**: Criar alertas de teste com diferentes urgências
   - Tab **Email**: Criar alerta + enviar email real (Cloud Function)
   - Tab **Demo**: Controle de tempo para demonstrações
     - Simular máquina em operação há X horas
     - Criar sessões fechadas com duração específica
   - Tab **QR Code**: Gerar QR para acesso do júri
   - Tab **RFID**: Simular scans
   - Tab **Nav**: Navegação rápida

7. **Cloud Functions v2** ✅
   - Migração para Firebase Functions v2
   - `createTestAlertAndSendEmail` - Cria alerta + envia email num só passo
   - `sendTestEmail` - Enviar email para alerta existente
   - `onAlertCreated` - Trigger automático de email
   - Configuração SMTP via smtpConfig no body

8. **Uniformização de Linguagem** ✅
   - "Auto-Close" → "Auto-Fecho" em todo o sistema

## TAREFAS PENDENTES (Atualizado 17/12/2025)

### 🛠️ TAREFAS PENDENTES (Antes da Entrega - Junho 2025)
1. **Segurança IoT (API Keys)** ❌ - Implementar chave de proteção nos headers (Fácil/Grátis)
2. **Higiene de Pastas** ❌ - Agrupar Hardware e limpar raiz do projeto
3. **Notificações Push** ❌ - Alertas reais de manutenção e sessões longas
4. **Polimento UI/UX** ❌ - Remover DevTools e checklist de design final
5. **Testes de Stress** ❌ - Validar estabilidade básica do sistema

### 🚀 VISÃO ESTRATÉGICA (Futuro Casais / V3)
1. **Human-Relay Mesh (BLE Harvesting)** ❌ - Funcionários como estafetas de dados (M2M)
2. **ESP-NOW Mesh Networking** ❌ - Comunicação direta entre máquinas sem rede
3. **BigQuery & IA Predict** ❌ - Análise de grandes dados e manutenção preditiva avançada
4. **Escudo Digital de Segurança** ❌ - Proximidade BLE para proteção de operadores

### CONCLUÍDO NESTA SESSÃO (17/12/2025 - Sessão 2) ✅

**PWA Completo** ✅ IMPLEMENTADO
- `vite-plugin-pwa` configurado com Workbox
- Service Worker com cache offline
- Manifest.json gerado automaticamente
- Componente `PWAPrompt.jsx` para instalação
- Runtime caching para imagens, fontes e Firebase API
- Página `offline.html` para quando não há internet
- Animações CSS para notificações
- Detecção online/offline em tempo real

**Perfis de Acesso** ✅ IMPLEMENTADO
- 6 perfis de sistema:
  - **Admin**: Acesso total
  - **Gestor de Frota**: Gestão de equipamentos e obras
  - **Gestor Financeiro**: Custos e relatórios financeiros
  - **Gestor de Sustentabilidade**: Emissões e ESG
  - **Encarregado de Obra**: Restrito à sua obra
  - **Visualizador**: Apenas leitura
- Sistema de permissões granular (`config/permissions.js`)
- Hierarquia de níveis (Admin > Gestão > Supervisão > Visualização)
- Sidebar filtra menus por permissões
- **Modo Demo** em Configurações → Trocar perfil para testar
- Perfis customizados podem ser criados
- Persistência de sessão com Zustand persist

**RFID de Localização** ✅ IMPLEMENTADO
- Cartões com prefixo `LOC_` mudam localização de máquinas
- Cloud Function `handleSessionTrigger` atualizada
- Store `useStore.js` com CRUD de locationCards
- **UI em Obras → Detalhes → Cartões RFID de Localização** (permanente)
- DevTools tab "LOC" para testes (será removida)
- Firestore: `location_cards/{cardId}` com obraId, obraName, gps

**Como usar RFID de Localização (produção):**
1. Menu Obras → Clicar numa obra
2. Secção "Cartões RFID de Localização"
3. Escrever ID do cartão (ex: PORTO_01) → Criar
4. O sistema adiciona automaticamente prefixo LOC_
5. Quando o cartão for lido, a máquina move para essa obra

### VERIFICADO E COMPLETO ✅
- Módulo Financeiro (tarifários, custos/hora) ✅
- Duplo Contador (partialHours + totalHours) ✅
- Manutenção Alertas vs Histórico (são tabs diferentes, OK) ✅
- RFID de Localização ✅
- PWA Completo (offline, Service Worker, instalação) ✅
- Perfis de Acesso (6 perfis, permissões granulares, modo demo) ✅

## SISTEMA DE EMAIL E VALIDAÇÃO (FUNCIONANDO ✅)

### Cloud Functions Deployed
- `createTestAlertAndSendEmail` - Cria alerta + envia email num só passo
- `sendTestEmail` - Enviar email para alerta existente
- URL: `https://us-central1-casais-rfid.cloudfunctions.net/`

### Fluxo Completo
1. DevTools → Tab "Email" → Criar Alerta + Enviar Email
2. Email recebido com link `/validar/{token}`
3. Operador abre link → ValidationPage
4. Corrige horários → Dados salvos no Firestore
5. Sessão original também é atualizada

### Como Testar
1. Abrir DevTools (botão roxo canto inferior direito)
2. Tab "Email"
3. Configurar SMTP Gmail:
   - Email: `a33137.ipca@gmail.com`
   - App Password: (configurar no Google)
4. Clicar "Criar Alerta + Enviar Email"
5. Verificar email recebido
6. Clicar no link para testar validação

---

## ESTRUTURA DE DADOS FIRESTORE

```javascript
// MACHINE - category e location são OBJETOS!
{
  id: 'M_ESC_01',
  name: 'Escavadora 01',
  category: {
    id: 'escavadoras',
    name: 'Escavadoras',
    code: 'ESC'
  },
  location: {
    workId: 'obra_porto_2025',
    workName: 'Obra Porto 2025',
    gps: { latitude: 41.1579, longitude: -8.6291 }
  },
  status: 'ACTIVE' | 'IDLE',
  totalHours: 1250.5,
  partialHours: 135.2,
  consumptionRate: 12.5,
  currentTariff: { ... }
}

// OPERATOR
{ id: 'OP_001', name: 'João Silva', email: '...' }

// SESSION
{ cardId, machineId, startTime, endTime, status: 'OPEN'|'CLOSED' }
```

---

## COMPONENTES DISPONÍVEIS

```
src/components/
├── ui/
│   ├── Card.jsx          # default/elevated/glass/gradient
│   ├── Button.jsx        # primary/secondary/danger/ghost
│   ├── StatCard.jsx      # 3 variantes: default/gradient/outline
│   ├── Skeleton.jsx      # Loading states
│   ├── EmptyState.jsx    # Estados vazios
│   ├── Modal.jsx         # Modais
│   ├── Input.jsx         # Campos de formulário
│   ├── Select.jsx        # Dropdowns
│   ├── Badge.jsx         # Labels
│   ├── StatusBadge.jsx   # ACTIVE/IDLE badges
│   └── Table.jsx         # Tabelas
├── layout/
│   └── Sidebar.jsx       # Navegação (tema escuro)
└── ErrorBoundary.jsx     # Catch de erros React
```

---

## COMMITS IMPORTANTES

- `ad4c4d1` - v1.1.0-stable (backup antes de mudanças grandes)
- `d683e50` - componentes UI enterprise + reorganização memória

---

## VALIDAÇÕES DA PÁGINA DE CORREÇÃO

### Validações Implementadas (ValidationPage.jsx)
1. **Hora de fim > Hora de início** - Não permite guardar se fim é antes/igual ao início
2. **Duração mínima** - Pelo menos 1 minuto
3. **Duração máxima** - Aviso se > 24 horas
4. **Hora de início no passado** - Não permite datas futuras
5. **Validação em tempo real** - Mostra erro imediatamente ao editar
6. **Botão desabilitado** - Não deixa clicar se há erro nos horários

### Mensagens de Erro
- "A hora de fim deve ser posterior à hora de início"
- "A sessão deve ter pelo menos 1 minuto de duração"
- "A hora de início não pode ser no futuro"

---

## OTIMIZAÇÕES DE PERFORMANCE (17/12/2025)

### Bundle Size - ANTES vs DEPOIS
| Métrica | Antes | Depois | Redução |
|---------|-------|--------|---------|
| JS Principal (gzip) | 364 KB | 91 KB | **-75%** |
| Carregamento inicial | 1.2 MB | 291 KB | **-77%** |

### Otimizações Implementadas

1. **Lazy Loading (Code Splitting)**
   - Todas as views carregam sob demanda
   - DevTools carrega só quando necessário
   - ValidationPage carrega apenas quando acedida via link

2. **Chunking Otimizado (vite.config.js)**
   - `vendor-react`: React core (11 KB)
   - `vendor-firebase`: Firebase (336 KB)
   - `vendor-charts`: Recharts (387 KB)
   - `vendor-utils`: Zustand + QRCode (17 KB)

3. **Memoização de Componentes**
   - `StatCard` com `React.memo`
   - `Card` com `React.memo`
   - Animação otimizada com `requestAnimationFrame`

4. **Selectors Zustand (`src/store/selectors.js`)**
   - Evita re-renders desnecessários
   - Selectors básicos e derivados
   - Hooks customizados para filtros

### Ficheiros Modificados
- `App.jsx` - Lazy loading
- `vite.config.js` - Chunking manual
- `components/ui/StatCard.jsx` - Memo + animação
- `components/ui/Card.jsx` - Memo
- `store/selectors.js` - NOVO

---

---

## TAREFAS CONCLUÍDAS (Sessão 18/12/2025)

### Auditoria e Correção de Botões ✅
Verificação sistemática de todas as views para garantir que botões têm funcionalidades reais:

1. **DashboardView** ✅
   - Botão "Ver Todos" no banner de manutenção → navega para view de manutenção

2. **SessoesView** ✅
   - Botão "Exportar CSV" → exporta sessões para ficheiro CSV com separador `;`
   - Botão "Validar" → abre `ValidationModal` com:
     - Correção de horários (datetime-local inputs)
     - Notas opcionais
     - Opções: Confirmar Original / Guardar Correção
     - Atualiza `validationStatus` no Firestore

3. **FinanceiroView** ✅
   - Botão "Exportar" → exporta relatório financeiro para CSV
   - Botões Edit/Delete nos tarifários → CRUD completo:
     - `handleEditTariff` → abre modal com dados pré-preenchidos
     - `handleDeleteTariff` → confirma e elimina do Firestore
   - Novas funções no store: `updateTariff`, `deleteTariff`

4. **MaquinasView** ✅ (já funcionava - usa safeRender)
5. **ManutencaoView** ✅ (já funcionava)
6. **OperadoresView** ✅ (já funcionava)
7. **ObrasView** ✅ (já funcionava)
8. **ConfiguracoesView** ✅ (já funcionava)
9. **AnalisesView** ✅ (já funcionava)

### Ficheiros Modificados
- `views/DashboardView.jsx` - onClick no botão Ver Todos
- `views/SessoesView.jsx` - Export CSV + ValidationModal
- `views/FinanceiroView.jsx` - Export + Edit/Delete tarifários
- `store/useStore.js` - updateTariff + deleteTariff

### Build Verificado ✅
```
npm run build - 75 segundos, sem erros
Bundle: ~400KB gzip (otimizado)
```

*Última atualização: 18 Dezembro 2025 (Sessão 3) - Auditoria de Botões + Funcionalidades Reais*
