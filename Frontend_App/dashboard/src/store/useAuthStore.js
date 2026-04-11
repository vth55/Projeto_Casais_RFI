/**
 * Auth Store - Gestão de autenticação e permissões
 * CASAIS Fleet Intelligence
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DEFAULT_ROLES,
  ROLE_LEVELS,
  hasPermission,
  canAccessMenu,
  canManageRole,
  canCreateRoleAtLevel,
  getAvailableLevelsForCreation,
  getAssignableRoles,
} from '../config/permissions';

const useAuthStore = create(
  persist(
    (set, get) => ({
      // Estado do utilizador atual
      currentUser: null,
      isAuthenticated: false,

      // Perfis customizados (além dos default)
      customRoles: {},

      // Simular login (em produção seria com Firebase Auth)
      login: (user) => {
        const role = get().getRole(user.systemRole || 'visualizador');
        set({
          currentUser: {
            ...user,
            permissions: role?.permissions || [],
          },
          isAuthenticated: true,
        });
      },

      // Logout
      logout: () => {
        set({
          currentUser: null,
          isAuthenticated: false,
        });
      },

      // Definir utilizador atual (usado na inicialização)
      setCurrentUser: (user) => {
        if (!user) {
          set({ currentUser: null, isAuthenticated: false });
          return;
        }

        const role = get().getRole(user.systemRole || 'admin'); // Default admin para dev
        set({
          currentUser: {
            ...user,
            permissions: role?.permissions || [],
          },
          isAuthenticated: true,
        });
      },

      // Obter todos os roles (default + custom)
      getAllRoles: () => {
        const { customRoles } = get();
        return { ...DEFAULT_ROLES, ...customRoles };
      },

      // Obter role por ID
      getRole: (roleId) => {
        const allRoles = get().getAllRoles();
        return allRoles[roleId] || null;
      },

      // Adicionar role customizado
      addCustomRole: (role) => {
        set((state) => ({
          customRoles: {
            ...state.customRoles,
            [role.id]: { ...role, isSystem: false },
          },
        }));
      },

      // Atualizar role
      updateRole: (roleId, updates) => {
        const allRoles = get().getAllRoles();
        const existingRole = allRoles[roleId];

        if (!existingRole) return;

        // Não permitir editar roles de sistema (apenas permissões)
        if (existingRole.isSystem && DEFAULT_ROLES[roleId]) {
          // Para roles de sistema, só podemos modificar via customRoles
          set((state) => ({
            customRoles: {
              ...state.customRoles,
              [roleId]: {
                ...DEFAULT_ROLES[roleId],
                ...updates,
                isSystem: true,
              },
            },
          }));
        } else {
          set((state) => ({
            customRoles: {
              ...state.customRoles,
              [roleId]: { ...existingRole, ...updates },
            },
          }));
        }
      },

      // Eliminar role (só customizados)
      deleteRole: (roleId) => {
        const role = get().getRole(roleId);
        if (role?.isSystem && DEFAULT_ROLES[roleId]) {
          console.warn('Não é possível eliminar perfis de sistema');
          return false;
        }

        set((state) => {
          const { [roleId]: _, ...rest } = state.customRoles;
          return { customRoles: rest };
        });
        return true;
      },

      // Verificar se utilizador atual tem permissão
      can: (permission) => {
        const { currentUser } = get();
        if (!currentUser) return false;
        return hasPermission(currentUser.permissions, permission);
      },

      // Verificar se pode aceder a um menu
      canAccess: (menuId) => {
        const { currentUser } = get();
        if (!currentUser) return false;
        return canAccessMenu(currentUser.permissions, menuId);
      },

      // Verificar se é admin
      isAdmin: () => {
        const { currentUser } = get();
        return currentUser?.systemRole === 'admin';
      },

      // Verificar se tem restrição de obra
      isRestrictedToObra: () => {
        const { currentUser } = get();
        if (!currentUser) return true;
        const role = get().getRole(currentUser.systemRole);
        return role?.restrictedToOwnObra || false;
      },

      // Obter obra do utilizador (para roles restritos)
      getUserObra: () => {
        const { currentUser } = get();
        return currentUser?.assignedObraId || null;
      },

      // === HIERARQUIA DE PERFIS ===

      // Obter nível do utilizador atual
      getUserLevel: () => {
        const { currentUser, customRoles = {} } = get();
        if (!currentUser) return ROLE_LEVELS.VISUALIZADOR;
        const role = get().getRole(currentUser.systemRole);
        return role?.level ?? ROLE_LEVELS.VISUALIZADOR;
      },

      // Verificar se pode gerir um role específico
      canManageRole: (targetRoleId) => {
        const { currentUser, customRoles } = get();
        if (!currentUser) return false;
        return canManageRole(currentUser.systemRole, targetRoleId, customRoles);
      },

      // Verificar se pode criar roles de um determinado nível
      canCreateRoleAtLevel: (targetLevel) => {
        const { currentUser, customRoles } = get();
        if (!currentUser) return false;
        return canCreateRoleAtLevel(currentUser.systemRole, targetLevel, customRoles);
      },

      // Obter níveis disponíveis para criar novos roles
      getAvailableLevelsForCreation: () => {
        const { currentUser, customRoles } = get();
        if (!currentUser) return [];
        return getAvailableLevelsForCreation(currentUser.systemRole, customRoles);
      },

      // Obter roles que o utilizador pode atribuir a operadores
      getAssignableRoles: () => {
        const { currentUser, customRoles } = get();
        if (!currentUser) return [];
        return getAssignableRoles(currentUser.systemRole, customRoles);
      },

      // Obter roles visíveis para o utilizador (que pode ver/gerir)
      getVisibleRoles: () => {
        const { currentUser, customRoles } = get();
        const allRoles = { ...DEFAULT_ROLES, ...customRoles };

        if (!currentUser) return [];

        const userRole = get().getRole(currentUser.systemRole);
        if (!userRole) return [];

        // Admin vê todos
        if (userRole.level === ROLE_LEVELS.ADMIN) {
          return Object.values(allRoles);
        }

        // Outros vêem o seu nível e abaixo (para contexto)
        return Object.values(allRoles).filter(role => role.level >= userRole.level);
      },

      // Verificar se pode criar perfis customizados
      canCreateCustomRoles: () => {
        const { currentUser } = get();
        if (!currentUser) return false;
        const role = get().getRole(currentUser.systemRole);
        return role?.canCreateRolesBelow === true;
      },
    }),
    {
      name: 'casais-auth',
      partialize: (state) => ({
        currentUser: state.currentUser,
        customRoles: state.customRoles,
      }),
    }
  )
);

// Inicializar com utilizador admin para desenvolvimento
if (typeof window !== 'undefined') {
  const store = useAuthStore.getState();
  if (!store.currentUser) {
    store.setCurrentUser({
      id: 'dev_admin',
      name: 'Vitor Hugo',
      email: 'vitor@casais.pt',
      systemRole: 'admin',
      assignedObraId: null,
    });
  }
}

export default useAuthStore;
