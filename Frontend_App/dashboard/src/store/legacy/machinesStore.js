/**
 * LEGACY — Heavy machines model (pré-pivot 2026-05).
 *
 * Este módulo existe APENAS para:
 * 1. Manter a sincronização Procore actual (exportação de sessions/machines)
 *    a funcionar enquanto o pivot small-tools não tem substituto no backend.
 * 2. Painel de Reconciliação Procore no Dashboard (read-only, mostra estado
 *    de exportação dos documentos sessions legacy).
 *
 * REGRAS:
 * - NÃO consumir este store em fluxo activo do utilizador (Sidebar, BottomNav,
 *   LiveSessionsBar, MapaObrasView, ObraMenuLayout, ToolTagPage, etc.).
 * - QUALQUER nova feature consome `useStore` principal (`tools`, `toolSessions`,
 *   `tool_alerts`, `tool_maintenance`).
 * - Quando o backend Procore for migrado para `tool_sessions`, este módulo
 *   inteiro é apagado.
 *
 * Componentes que ainda podem importar daqui (são as únicas excepções permitidas):
 * - `views/DashboardView.jsx` → `ProcoreReconciliationPanel` (linha ~206)
 * - `components/ui/MachineStoryRings.jsx` (até ser removido / renomeado)
 *
 * Tudo o resto que estiver a importar de `useStore` os arrays `sessions` ou
 * `machines` é dívida técnica do pivot — migrar para `tools`/`toolSessions`.
 */

import { create } from 'zustand';
import { db, projectId } from '../../config/firebase';
import { createCollectionListener } from '../../utils/firestoreListeners';

const basePath = `artifacts/${projectId}/public/data`;

const useLegacyMachinesStore = create((set) => ({
  /** Heavy machines legacy — sincronizadas pelo Procore. NÃO consumir em UI nova. */
  machines: [],
  /** RFID sessions legacy (FATIGUE/AUTO_CLOSE/horas de motor). NÃO consumir em UI nova. */
  sessions: [],

  initializeLegacyListeners: () => {
    const unsubscribers = [];

    const machinesListener = createCollectionListener(db, `${basePath}/machines`, {
      onError: (msg, error) => console.debug('[legacy:machines] listener off:', error?.code || error?.message),
    });
    unsubscribers.push(
      machinesListener((data) => {
        const visible = (data || []).filter(m => !String(m.name || '').startsWith('[REMOVIDO]'));
        set({ machines: visible });
      })
    );

    const sessionsListener = createCollectionListener(db, `${basePath}/sessions`, {
      orderByField: 'startTime',
      orderByDirection: 'desc',
      onError: (msg, error) => console.debug('[legacy:sessions] listener off:', error?.code || error?.message),
    });
    unsubscribers.push(
      sessionsListener((data) => set({ sessions: data || [] }))
    );

    return () => unsubscribers.forEach(unsub => unsub());
  },
}));

export default useLegacyMachinesStore;

/**
 * MIGRATION PATH:
 *
 * 1. Codex/Claude move o estado `machines` + `sessions` + actions relacionadas
 *    do `useStore.js` principal para este módulo (mantendo os listeners
 *    activos para o Procore sync).
 *
 * 2. Em `App.jsx`, chamar `useLegacyMachinesStore.getState().initializeLegacyListeners()`
 *    ao lado do `useStore.initializeListeners()` actual.
 *
 * 3. Componentes que ainda referenciam `machines`/`sessions` recebem-nos via
 *    `useLegacyMachinesStore()` em vez de `useStore()` — torna a dependência
 *    legacy explícita e auditável via grep.
 *
 * 4. Quando o Procore exporter for migrado para `tool_sessions`, apagar este
 *    ficheiro e os imports residuais.
 */
