/**
 * Auth Store - Gestão de autenticação e permissões
 * CASAIS Fleet Intelligence
 *
 * Usa Firebase Auth (signInWithEmailAndPassword) e Firestore para carregar
 * o perfil de sistema (systemRole) do utilizador autenticado.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
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

/**
 * Caminho base da colecção de utilizadores no Firestore.
 * Estrutura: artifacts/casais-rfid/public/data/users/{uid}
 */
const USERS_COLLECTION = 'artifacts/casais-rfid/public/data/users';

/**
 * Carrega o perfil do utilizador no Firestore e devolve o systemRole.
 * Se o documento não existir, devolve 'operador' como default.
 *
 * @param {string} uid - UID do utilizador Firebase Auth
 * @returns {Promise<{systemRole: string, name: string, email: string}>}
 */
const fetchUserProfile = async (uid) => {
  try {
    const ref = doc(db, USERS_COLLECTION, uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (err) {
    console.warn('useAuthStore: erro ao carregar perfil Firestore:', err.message);
  }
  return { systemRole: 'operador' };
};

const useAuthStore = create(
  persist(
    (set, get) => ({
      // Estado do utilizador atual
      currentUser: null,
      isAuthenticated: false,

      // Estado de inicialização do Firebase Auth
      authLoading: true,

      // Perfis customizados (além dos default)
      customRoles: {},

      /**
       * Inicializa o listener Firebase Auth para persistência de sessão.
       * Deve ser chamado uma única vez na montagem do App.
       * Devolve a função de cleanup para cancelar o listener.
       *
       * @returns {Function} unsubscribe
       */
      initAuth: () => {
        if (!auth) {
          set({ authLoading: false });
          return () => {};
        }

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            // Utilizador já autenticado — carregar perfil do Firestore
            const profile = await fetchUserProfile(firebaseUser.uid);
            const role = get().getRole(profile.systemRole || 'operador');
            set({
              currentUser: {
                id: firebaseUser.uid,
                email: firebaseUser.email,
                name: profile.name || firebaseUser.displayName || firebaseUser.email,
                systemRole: profile.systemRole || 'operador',
                assignedObraId: profile.assignedObraId || null,
                cardId: profile.cardId || null,
                permissions: role?.permissions || [],
              },
              isAuthenticated: true,
              authLoading: false,
            });
          } else {
            // Sem sessão activa
            set({ currentUser: null, isAuthenticated: false, authLoading: false });
          }
        });

        return unsubscribe;
      },

      /**
       * Autentica com email e password via Firebase Auth.
       * Após autenticação, carrega o perfil do Firestore para obter o systemRole.
       *
       * @param {{email: string, password: string}} credentials
       * @throws {FirebaseError} em caso de credenciais inválidas ou erro de rede
       */
      login: async ({ email, password }) => {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        const firebaseUser = credential.user;

        const profile = await fetchUserProfile(firebaseUser.uid);
        const role = get().getRole(profile.systemRole || 'operador');

        set({
          currentUser: {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            name: profile.name || firebaseUser.displayName || firebaseUser.email,
            systemRole: profile.systemRole || 'operador',
            assignedObraId: profile.assignedObraId || null,
            cardId: profile.cardId || null,
            permissions: role?.permissions || [],
          },
          isAuthenticated: true,
        });
      },

      /**
       * Termina a sessão do utilizador via Firebase Auth e limpa o estado local.
       */
      logout: async () => {
        try {
          if (auth) await signOut(auth);
        } catch (err) {
          console.warn('useAuthStore: erro ao terminar sessão:', err.message);
        }
        set({ currentUser: null, isAuthenticated: false });
      },

      /**
       * Troca de perfil sem logout (DevTools / Demo).
       * Apenas altera o estado local; não afecta o Firebase Auth.
       *
       * @param {string} roleId
       */
      switchRole: (roleId) => {
        const { currentUser } = get();
        if (!currentUser) return;

        const role = get().getRole(roleId);
        if (!role) {
          console.warn(`Role "${roleId}" nao encontrado`);
          return;
        }

        console.log(`Perfil alterado: ${currentUser.systemRole} -> ${roleId}`);
        set({
          currentUser: {
            ...currentUser,
            systemRole: roleId,
            permissions: role.permissions || [],
          },
        });
      },

      /**
       * Devolve o dashboard default para o perfil actual.
       * @returns {string}
       */
      getDefaultDashboard: () => {
        const { currentUser } = get();
        if (!currentUser) return 'dashboard';
        const role = get().getRole(currentUser.systemRole);
        return role?.defaultDashboard || 'dashboard';
      },

      /**
       * Define o utilizador actual directamente (usado para sincronização interna).
       * @param {object|null} user
       */
      setCurrentUser: (user) => {
        if (!user) {
          set({ currentUser: null, isAuthenticated: false });
          return;
        }

        const role = get().getRole(user.systemRole || 'operador');
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

        if (existingRole.isSystem && DEFAULT_ROLES[roleId]) {
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
          console.warn('Nao e possivel eliminar perfis de sistema');
          return false;
        }

        set((state) => {
          const { [roleId]: _, ...rest } = state.customRoles;
          return { customRoles: rest };
        });
        return true;
      },

      // Verificar se utilizador actual tem permissão
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

      // Obter nível do utilizador actual
      getUserLevel: () => {
        const { currentUser } = get();
        if (!currentUser) return ROLE_LEVELS.OPERADOR;
        const role = get().getRole(currentUser.systemRole);
        return role?.level ?? ROLE_LEVELS.OPERADOR;
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

export default useAuthStore;
