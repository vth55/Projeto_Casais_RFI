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
| Cor Casais | #005EB8 (azul) |

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

## TAREFAS PENDENTES

### ALTA PRIORIDADE
1. **RFID de Localização**
   - Cartões especiais para mudar localização de máquinas
   - Scan = muda máquina para essa obra

### MENUS QUE PRECISAM DIFERENCIAÇÃO
- Manutenção > Alertas vs Histórico (mostram mesmo conteúdo)

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

*Última atualização: 08 Dezembro 2025 - Sessão 3*
