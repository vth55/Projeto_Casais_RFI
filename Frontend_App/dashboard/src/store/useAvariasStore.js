/**
 * Avarias Store - Reporte e gestão de avarias por QR Code
 * CASAIS Fleet Intelligence
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAvariasStore = create(
  persist(
    (set, get) => ({
      avarias: [],

      // Submeter nova avaria (chamado pelo operador via QR Code)
      submitAvaria: (avaria) => {
        const id = `avaria_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const novaAvaria = {
          id,
          ...avaria,
          status: 'pendente',
          notas: [],
          createdAt: new Date().toISOString(),
          resolvedAt: null,
          resolvedBy: null,
        };

        set((state) => ({
          avarias: [novaAvaria, ...state.avarias],
        }));

        return { success: true, id };
      },

      // Adicionar nota interna (comunicação técnico sobre a avaria)
      addNota: (avariaId, texto, autor) => {
        const nota = {
          id: `nota_${Date.now()}`,
          texto: texto.trim(),
          autor: autor || 'Gestor',
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          avarias: state.avarias.map((a) =>
            a.id === avariaId
              ? { ...a, notas: [...(a.notas || []), nota] }
              : a
          ),
        }));
      },

      // Marcar avaria como resolvida (chamado pelo gestor na dashboard)
      resolverAvaria: (avariaId) => {
        set((state) => ({
          avarias: state.avarias.map((a) =>
            a.id === avariaId
              ? {
                  ...a,
                  status: 'resolvida',
                  resolvedAt: new Date().toISOString(),
                  resolvedBy: 'Gestor',
                }
              : a
          ),
        }));
      },

      // Getters
      getAvariasPendentes: () => {
        return get().avarias.filter((a) => a.status === 'pendente');
      },

      getAvariasResolvidas: () => {
        return get().avarias.filter((a) => a.status === 'resolvida');
      },

      getAvariasByMachine: (machineId) => {
        return get().avarias.filter((a) => a.machineId === machineId);
      },
    }),
    {
      name: 'casais-avarias',
    }
  )
);

export default useAvariasStore;
