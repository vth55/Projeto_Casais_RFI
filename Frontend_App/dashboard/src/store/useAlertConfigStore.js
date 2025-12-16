/**
 * Alert Configuration Store - Gestão de configurações de alertas
 * CASAIS Fleet Intelligence
 *
 * Permite configurar:
 * - Thresholds de alerta por categoria de máquina
 * - Override de thresholds por máquina específica
 * - Tempo máximo de alerta pendente antes de escalar
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db, projectId } from '../config/firebase';

const basePath = `artifacts/${projectId}/public/data`;

// Thresholds padrão (em horas)
export const DEFAULT_THRESHOLDS = {
  longSessionHours: 5,   // Alerta de sessão longa após X horas
  autoCloseHours: 14,    // Auto-fechar após X horas
  escalationHours: 48,   // Escalar para supervisor após X horas pendente
};

// Categorias de máquinas conhecidas com thresholds sugeridos
export const MACHINE_CATEGORIES = {
  escavadoras: {
    id: 'escavadoras',
    name: 'Escavadoras',
    code: 'ESC',
    suggestedThresholds: { longSessionHours: 6, autoCloseHours: 14 },
  },
  gruas: {
    id: 'gruas',
    name: 'Gruas',
    code: 'GRU',
    suggestedThresholds: { longSessionHours: 4, autoCloseHours: 12 }, // Mais rigoroso
  },
  betoneiras: {
    id: 'betoneiras',
    name: 'Betoneiras',
    code: 'BET',
    suggestedThresholds: { longSessionHours: 5, autoCloseHours: 14 },
  },
  retroescavadoras: {
    id: 'retroescavadoras',
    name: 'Retroescavadoras',
    code: 'RET',
    suggestedThresholds: { longSessionHours: 5, autoCloseHours: 14 },
  },
  camioes: {
    id: 'camioes',
    name: 'Camiões',
    code: 'CAM',
    suggestedThresholds: { longSessionHours: 8, autoCloseHours: 16 }, // Pode trabalhar mais
  },
  empilhadores: {
    id: 'empilhadores',
    name: 'Empilhadores',
    code: 'EMP',
    suggestedThresholds: { longSessionHours: 6, autoCloseHours: 14 },
  },
  compressores: {
    id: 'compressores',
    name: 'Compressores',
    code: 'CMP',
    suggestedThresholds: { longSessionHours: 8, autoCloseHours: 18 }, // Pode correr mais tempo
  },
  geradores: {
    id: 'geradores',
    name: 'Geradores',
    code: 'GER',
    suggestedThresholds: { longSessionHours: 12, autoCloseHours: 24 }, // Podem correr continuamente
  },
};

const useAlertConfigStore = create(
  persist(
    (set, get) => ({
      // Estado
      globalConfig: { ...DEFAULT_THRESHOLDS },
      categoryConfigs: {}, // { categoryId: { fatigueHours, autoCloseHours } }
      machineConfigs: {},  // { machineId: { fatigueHours, autoCloseHours } }
      loading: false,
      error: null,

      // Inicializar listener de configurações
      initializeConfigListener: () => {
        if (!db) {
          set({ error: 'Firestore não inicializado' });
          return () => {};
        }

        const configRef = doc(db, `${basePath}/settings`, 'alertConfig');

        return onSnapshot(
          configRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data();
              set({
                globalConfig: data.globalConfig || DEFAULT_THRESHOLDS,
                categoryConfigs: data.categoryConfigs || {},
                machineConfigs: data.machineConfigs || {},
                loading: false,
              });
            } else {
              // Criar configuração inicial
              get().saveConfig();
            }
          },
          (error) => {
            console.error('Erro alert config:', error);
            set({ error: error.message });
          }
        );
      },

      // Guardar configuração
      saveConfig: async () => {
        if (!db) return { success: false, error: 'DB não inicializado' };

        try {
          const { globalConfig, categoryConfigs, machineConfigs } = get();

          await setDoc(doc(db, `${basePath}/settings`, 'alertConfig'), {
            globalConfig,
            categoryConfigs,
            machineConfigs,
            updatedAt: Timestamp.now(),
          });

          return { success: true };
        } catch (error) {
          console.error('Erro ao guardar config:', error);
          return { success: false, error: error.message };
        }
      },

      // Atualizar configuração global
      updateGlobalConfig: async (updates) => {
        set((state) => ({
          globalConfig: { ...state.globalConfig, ...updates },
        }));
        return get().saveConfig();
      },

      // Atualizar configuração de categoria
      updateCategoryConfig: async (categoryId, thresholds) => {
        set((state) => ({
          categoryConfigs: {
            ...state.categoryConfigs,
            [categoryId]: thresholds,
          },
        }));
        return get().saveConfig();
      },

      // Remover configuração de categoria (usar global)
      removeCategoryConfig: async (categoryId) => {
        set((state) => {
          const { [categoryId]: _, ...rest } = state.categoryConfigs;
          return { categoryConfigs: rest };
        });
        return get().saveConfig();
      },

      // Atualizar configuração de máquina específica
      updateMachineConfig: async (machineId, thresholds) => {
        set((state) => ({
          machineConfigs: {
            ...state.machineConfigs,
            [machineId]: thresholds,
          },
        }));
        return get().saveConfig();
      },

      // Remover configuração de máquina (usar categoria ou global)
      removeMachineConfig: async (machineId) => {
        set((state) => {
          const { [machineId]: _, ...rest } = state.machineConfigs;
          return { machineConfigs: rest };
        });
        return get().saveConfig();
      },

      // Obter thresholds efetivos para uma máquina
      // Prioridade: máquina > categoria > global
      getEffectiveThresholds: (machineId, categoryId) => {
        const { globalConfig, categoryConfigs, machineConfigs } = get();

        // 1. Verificar override de máquina
        if (machineConfigs[machineId]) {
          return {
            ...globalConfig,
            ...machineConfigs[machineId],
            source: 'machine',
          };
        }

        // 2. Verificar configuração de categoria
        if (categoryId && categoryConfigs[categoryId]) {
          return {
            ...globalConfig,
            ...categoryConfigs[categoryId],
            source: 'category',
          };
        }

        // 3. Usar configuração global
        return {
          ...globalConfig,
          source: 'global',
        };
      },

      // Obter todas as categorias com suas configurações
      getCategoriesWithConfig: () => {
        const { globalConfig, categoryConfigs } = get();

        return Object.values(MACHINE_CATEGORIES).map((cat) => ({
          ...cat,
          hasCustomConfig: !!categoryConfigs[cat.id],
          effectiveThresholds: categoryConfigs[cat.id] || globalConfig,
        }));
      },

      // Verificar se máquina tem configuração personalizada
      hasMachineConfig: (machineId) => {
        return !!get().machineConfigs[machineId];
      },

      // Verificar se categoria tem configuração personalizada
      hasCategoryConfig: (categoryId) => {
        return !!get().categoryConfigs[categoryId];
      },
    }),
    {
      name: 'casais-alert-config',
      partialize: (state) => ({
        // Persistir localmente para acesso offline
        globalConfig: state.globalConfig,
        categoryConfigs: state.categoryConfigs,
        machineConfigs: state.machineConfigs,
      }),
    }
  )
);

export default useAlertConfigStore;
