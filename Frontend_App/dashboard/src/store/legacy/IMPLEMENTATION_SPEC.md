# Spec — Integração do legacy/machinesStore + tool_alerts/tool_maintenance/tool_movements

Spec fechada para Codex implementar após acabar Fase A (UI visível).

## 1. Mover machines/sessions para o legacy store

**Em `useStore.js`:**
- Remover do state: `machines: []`, `sessions: []`.
- Remover listeners: `createMachinesListener` e `createSessionsListener` (linhas ~97-104 e ~87-94).
- Remover selectors/actions que operam apenas em machines/sessions e não são chamadas por nenhuma view nova: `getKPIs` (legacy), `getFilteredSessions`, `closeSession`, `createSessionAlert`, `checkAndAutoCloseSessions`, `checkFatigueSessions`, `getOpenSessionsWithDuration`, `updateSession`, `resolveSessionAnomaly`, `addMachine`, `updateMachine`, `deleteMachine`, `setMachineTariff`, `moveMachinesToObra`, `dispatchMachine`.
- **Manter** se forem usadas por DashboardView/ProcoreReconciliationPanel: confirmar com grep antes de remover.

**Em `App.jsx`:**
- Adicionar import: `import useLegacyMachinesStore from './store/legacy/machinesStore';`
- No `useEffect` do bootstrap, chamar:
  ```js
  const cleanupLegacy = useLegacyMachinesStore.getState().initializeLegacyListeners();
  // ...
  return () => { cleanup(); cleanupAvarias(); cleanupLegacy(); };
  ```

**Componentes que ainda precisam de machines/sessions:**
- `DashboardView` → `ProcoreReconciliationPanel`: trocar `useStore` por `useLegacyMachinesStore` apenas neste sub-componente.
- `MachineStoryRings`: idem, OU remover do layout activo.

## 2. Adicionar listeners para as 3 colecções novas

**Em `useStore.js`, dentro de `initializeListeners`:**
```js
const createToolAlertsListener = createCollectionListener(db, `${basePath}/tool_alerts`, {
  orderByField: 'createdAt', orderByDirection: 'desc',
  onError: (msg, error) => console.debug('[tool_alerts] listener off:', error?.code || error?.message),
});
unsubscribers.push(createToolAlertsListener((data) => set({ toolAlerts: data || [] })));

const createToolMaintenanceListener = createCollectionListener(db, `${basePath}/tool_maintenance`, {
  orderByField: 'reportedAt', orderByDirection: 'desc',
  onError: (msg, error) => console.debug('[tool_maintenance] listener off:', error?.code || error?.message),
});
unsubscribers.push(createToolMaintenanceListener((data) => set({ toolMaintenance: data || [] })));

const createToolMovementsListener = createCollectionListener(db, `${basePath}/tool_movements`, {
  orderByField: 'movedAt', orderByDirection: 'desc',
  onError: (msg, error) => console.debug('[tool_movements] listener off:', error?.code || error?.message),
});
unsubscribers.push(createToolMovementsListener((data) => set({ toolMovements: data || [] })));
```

**State a adicionar:** `toolAlerts: []`, `toolMaintenance: []`, `toolMovements: []`.

## 3. Importar constantes do types.js

Onde quer que apareçam literais `'TOOL_OVERDUE'`, `'OPEN'` (em tool_session), `'INSPECTION'`, etc., importar de `src/types.js`:
```js
import { TOOL_ANOMALY_TYPES, TOOL_SESSION_STATUS, TOOL_MAINTENANCE_TYPES, TOOL_THRESHOLDS } from '../types';
```

Substituir hardcoded strings pelos enums. Reduz erros de typo.

## 4. Marcar Procore files como legacy

Adicionar este header em cada um:
- `Backend_Cloud/functions/procore/procoreSessionExporter.js`
- `Backend_Cloud/functions/procore/procoreScheduler.js`
- `Backend_Cloud/functions/procore/procoreDeepIntegration.js`
- `Backend_Cloud/functions/procore/procorePwaProjector.js`

```js
/**
 * LEGACY — heavy machines model (pré-pivot 2026-05).
 * Ver Backend_Cloud/functions/procore/_pivotStrategy.js para a decisão arquitectural.
 * NÃO consumir tool_sessions neste ficheiro. Quando o exporter novo for criado, este é apagado.
 */
```

## 5. UI nova para ManutencaoView e ReporteAvariaView

Reescrever para consumir `toolMaintenance` em vez de `maintenanceRecords` + `avarias`:
- ManutencaoView: tabela de `tool_maintenance` filtrada por tipo (INSPECTION/DAMAGE/REPAIR/CALIBRATION/REPLACEMENT/LOSS), status (OPEN/IN_PROGRESS/DONE).
- ReporteAvariaView: formulário que cria doc em `tool_maintenance` com `type: 'DAMAGE'` (default) ou `type: 'LOSS'` (se selecionado pelo utilizador).
- ManutencaoObraView: filtrar `tool_maintenance` por `obraId` da obra actual.

Schemas exactos no `src/types.js`. Não inventar campos novos sem actualizar primeiro o types.js.

## 6. EstaleiroView → Armazém

Reposicionar como "Inventário do Armazém":
- Listar `tools.filter(t => !t.currentObraId)` (no armazém)
- Total/Disponíveis/Em uso/Em reparação/Perdidas (`tool.status`)
- Click numa ferramenta → drawer com histórico de `tool_movements` + última sessão CLOSED.

## Critérios

- `npm run build` passa
- `npm run test` passa 56/56
- `grep -r "useStore.*sessions\b\|useStore.*machines\b" src/views src/components` devolve só `DashboardView`/`MachineStoryRings` (legacy isolado)
- Demo abre Mapa → Dashboard → Sessões → Obras → Operadores sem nenhum label "Máquina" visível.
