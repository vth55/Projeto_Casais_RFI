# CASAIS FLEET INTELLIGENCE - Memória do Projeto

> **Ficheiro único de contexto** - Substitui todos os ficheiros da pasta memoria/

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
Hardware (Arduino/ESP32 + RFID)
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

## REGRAS DE TRABALHO

1. Qualidade > Velocidade (6 meses disponíveis)
2. Código nível enterprise, não protótipo
3. Commits frequentes com mensagens claras
4. Atualizar este ficheiro quando relevante
5. Testes antes de commit

---

## PATHS IMPORTANTES

```
Frontend:     Frontend_App/dashboard/src/
Views:        Frontend_App/dashboard/src/views/
Components:   Frontend_App/dashboard/src/components/
Config:       Frontend_App/dashboard/src/config/
Backend:      Backend_Cloud/functions/index.js
Hardware:     arduino_rfid_simple/, Hardware_ESP32/
```

---

## NOTAS DE SESSÃO

**08 Dezembro 2025 (Sessão 3) - ATUAL:**
- **Bug Fix Crítico**: "Objects are not valid as a React child"
  - Causa: `machine.category` e `machine.location` são objetos no mockData
  - Causa adicional: MachineForm copiava objetos para formData ao editar
  - **Solução definitiva**: Criado `src/utils/safeRender.js` com funções helper:
    - `getCategoryName(category, fallback)` - Extrai nome da categoria
    - `getLocationName(location, fallback)` - Extrai nome da localização
    - `getCategoryId(category)` - Extrai ID para formulários
    - `safeString(value, fallback)` - Converte qualquer valor para string
  - Ficheiros atualizados para usar estas funções:
    - `MaquinasView.jsx`
    - `ManutencaoView.jsx`
- **ErrorBoundary** adicionado em App.jsx (previne tela branca)
- **Sidebar redesenhado** com tema escuro (slate-900)
- **StatCard** com 3 variantes: default, gradient, outline
- **DashboardView** redesenhado com gráficos maiores

**08 Dezembro 2025 (Sessão 2):**
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

### BAIXA PRIORIDADE
1. **Notificações Push** ❌
   - Alertas de manutenção
   - Sessões longas

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

*Última atualização: 17 Dezembro 2025 (Sessão 2) - PWA Completo + Perfis de Acesso + Modo Demo*
