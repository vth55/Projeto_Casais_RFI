/**
 * Sistema de Permissões e Perfis de Acesso
 * CASAIS Fleet Intelligence
 */

// Definição de todas as permissões do sistema
export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: 'dashboard:view',
  DASHBOARD_EXPORT: 'dashboard:export',

  // Obras
  OBRAS_VIEW: 'obras:view',
  OBRAS_CREATE: 'obras:create',
  OBRAS_EDIT: 'obras:edit',
  OBRAS_DELETE: 'obras:delete',

  // Equipamentos/Máquinas
  MACHINES_VIEW: 'machines:view',
  MACHINES_CREATE: 'machines:create',
  MACHINES_EDIT: 'machines:edit',
  MACHINES_DELETE: 'machines:delete',
  MACHINES_MOVE: 'machines:move', // Mudar localização

  // Operadores
  OPERATORS_VIEW: 'operators:view',
  OPERATORS_CREATE: 'operators:create',
  OPERATORS_EDIT: 'operators:edit',
  OPERATORS_DELETE: 'operators:delete',
  OPERATORS_ASSIGN_ROLE: 'operators:assign_role',

  // Sessões
  SESSIONS_VIEW: 'sessions:view',
  SESSIONS_VIEW_ALL: 'sessions:view_all', // Ver todas as obras
  SESSIONS_EXPORT: 'sessions:export',

  // Manutenção
  MAINTENANCE_VIEW: 'maintenance:view',
  MAINTENANCE_CREATE: 'maintenance:create',
  MAINTENANCE_EDIT: 'maintenance:edit',

  // Financeiro
  FINANCIAL_VIEW: 'financial:view',
  FINANCIAL_TARIFFS: 'financial:tariffs',
  FINANCIAL_COSTS: 'financial:costs',
  FINANCIAL_EXPORT: 'financial:export',

  // Qualidade
  QUALITY_VIEW: 'quality:view',
  QUALITY_VALIDATE: 'quality:validate',

  // Análises
  ANALYTICS_VIEW: 'analytics:view',
  ANALYTICS_EXPORT: 'analytics:export',

  // Sustentabilidade / ESG
  ESG_VIEW: 'esg:view',
  ESG_REPORTS: 'esg:reports',
  ESG_EXPORT: 'esg:export',

  // Relatórios
  REPORTS_VIEW: 'reports:view',
  REPORTS_GENERATE: 'reports:generate',
  REPORTS_EXECUTIVE: 'reports:executive',

  // Configurações
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_GENERAL: 'settings:general',
  SETTINGS_ROLES: 'settings:roles', // Gerir perfis
  SETTINGS_USERS: 'settings:users', // Gerir utilizadores
  SETTINGS_SYSTEM: 'settings:system',

  // Auditoria (ISO)
  AUDIT_VIEW: 'audit:view',
  AUDIT_EXPORT: 'audit:export',
};

/**
 * Níveis hierárquicos de acesso ao PWA (menor = mais privilégios)
 *
 * NOTA IMPORTANTE:
 * Os operadores de máquinas NÃO acedem ao PWA desktop.
 * Eles usam o Mobile Hub (scan RFID/NFC) e reportam avarias.
 * O PWA desktop é usado por gestores, supervisores, técnicos e IT.
 */
export const ROLE_LEVELS = {
  ADMIN: 0,        // Acesso total - Administração de sistemas
  IT: 0,           // Acesso total + DevTools, integrações, logs
  GESTOR: 1,       // Gestores de área (frota, financeiro, sustentabilidade)
  SUPERVISOR: 2,   // Encarregados / Supervisores de obra / Técnicos manutenção
  OPERADOR: 3,     // Operador de campo (Mobile Hub, reportar avarias, validar anomalias)
  VISUALIZADOR: 4, // Apenas consulta de dados (sem edição)
};

// Perfis de acesso predefinidos
export const DEFAULT_ROLES = {
  admin: {
    id: 'admin',
    name: 'Administrador',
    description: 'Acesso total ao sistema, incluindo configurações e gestão de perfis',
    color: 'red',
    icon: 'Shield',
    level: ROLE_LEVELS.ADMIN,
    permissions: Object.values(PERMISSIONS), // Todas as permissões
    isSystem: true, // Não pode ser eliminado
    canCreateRolesBelow: true, // Pode criar perfis de qualquer nível inferior
  },

  gestor_frota: {
    id: 'gestor_frota',
    name: 'Gestor de Frota',
    description: 'Gestão completa de equipamentos, obras e operadores',
    color: 'blue',
    icon: 'Truck',
    level: ROLE_LEVELS.GESTOR,
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.DASHBOARD_EXPORT,
      PERMISSIONS.OBRAS_VIEW,
      PERMISSIONS.OBRAS_CREATE,
      PERMISSIONS.OBRAS_EDIT,
      PERMISSIONS.MACHINES_VIEW,
      PERMISSIONS.MACHINES_CREATE,
      PERMISSIONS.MACHINES_EDIT,
      PERMISSIONS.MACHINES_MOVE,
      PERMISSIONS.OPERATORS_VIEW,
      PERMISSIONS.OPERATORS_CREATE,
      PERMISSIONS.OPERATORS_EDIT,
      PERMISSIONS.OPERATORS_ASSIGN_ROLE, // Pode atribuir perfis a operadores
      PERMISSIONS.SESSIONS_VIEW,
      PERMISSIONS.SESSIONS_VIEW_ALL,
      PERMISSIONS.SESSIONS_EXPORT,
      PERMISSIONS.MAINTENANCE_VIEW,
      PERMISSIONS.MAINTENANCE_CREATE,
      PERMISSIONS.MAINTENANCE_EDIT,
      PERMISSIONS.ANALYTICS_VIEW,
      PERMISSIONS.ANALYTICS_EXPORT,
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.REPORTS_GENERATE,
      PERMISSIONS.AUDIT_VIEW,
      PERMISSIONS.SETTINGS_VIEW,
      PERMISSIONS.SETTINGS_ROLES, // Pode gerir perfis (de níveis inferiores)
    ],
    isSystem: true,
    canCreateRolesBelow: true,
  },

  gestor_financeiro: {
    id: 'gestor_financeiro',
    name: 'Gestor Financeiro',
    description: 'Acesso a custos, tarifários e relatórios financeiros',
    color: 'emerald',
    icon: 'Wallet',
    level: ROLE_LEVELS.GESTOR,
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.OBRAS_VIEW,
      PERMISSIONS.MACHINES_VIEW,
      PERMISSIONS.SESSIONS_VIEW,
      PERMISSIONS.SESSIONS_VIEW_ALL,
      PERMISSIONS.FINANCIAL_VIEW,
      PERMISSIONS.FINANCIAL_TARIFFS,
      PERMISSIONS.FINANCIAL_COSTS,
      PERMISSIONS.FINANCIAL_EXPORT,
      PERMISSIONS.ANALYTICS_VIEW,
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.REPORTS_GENERATE,
      PERMISSIONS.SETTINGS_VIEW,
    ],
    isSystem: true,
    canCreateRolesBelow: false, // Focado em finanças, não gere pessoas
  },

  gestor_sustentabilidade: {
    id: 'gestor_sustentabilidade',
    name: 'Gestor de Sustentabilidade',
    description: 'Acesso a emissões, relatórios ESG e métricas ambientais',
    color: 'green',
    icon: 'Leaf',
    level: ROLE_LEVELS.GESTOR,
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.OBRAS_VIEW,
      PERMISSIONS.MACHINES_VIEW,
      PERMISSIONS.SESSIONS_VIEW,
      PERMISSIONS.SESSIONS_VIEW_ALL,
      PERMISSIONS.ANALYTICS_VIEW,
      PERMISSIONS.ESG_VIEW,
      PERMISSIONS.ESG_REPORTS,
      PERMISSIONS.ESG_EXPORT,
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.REPORTS_GENERATE,
      PERMISSIONS.SETTINGS_VIEW,
    ],
    isSystem: true,
    canCreateRolesBelow: false, // Focado em ESG, não gere pessoas
  },

  encarregado_obra: {
    id: 'encarregado_obra',
    name: 'Encarregado de Obra',
    description: 'Gestão da sua obra e operadores associados',
    color: 'amber',
    icon: 'HardHat',
    level: ROLE_LEVELS.SUPERVISOR,
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.OBRAS_VIEW, // Só a sua obra (filtrado por assignedObraId)
      PERMISSIONS.MACHINES_VIEW,
      PERMISSIONS.OPERATORS_VIEW,
      PERMISSIONS.OPERATORS_CREATE, // Pode criar operadores na sua obra
      PERMISSIONS.OPERATORS_EDIT,
      PERMISSIONS.OPERATORS_ASSIGN_ROLE, // Pode atribuir perfis (só de nível inferior)
      PERMISSIONS.SESSIONS_VIEW,
      PERMISSIONS.MAINTENANCE_VIEW,
      PERMISSIONS.MAINTENANCE_CREATE,
      PERMISSIONS.QUALITY_VIEW,
      PERMISSIONS.SETTINGS_VIEW,
      PERMISSIONS.SETTINGS_ROLES, // Pode criar perfis customizados para sua equipa
    ],
    isSystem: true,
    restrictedToOwnObra: true, // Flag especial - só vê a sua obra
    canCreateRolesBelow: true, // Pode criar perfis de operadores customizados
  },

  visualizador: {
    id: 'visualizador',
    name: 'Visualizador',
    description: 'Acesso apenas de leitura para consulta de dados',
    color: 'slate',
    icon: 'Eye',
    level: ROLE_LEVELS.VISUALIZADOR,
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.OBRAS_VIEW,
      PERMISSIONS.MACHINES_VIEW,
      PERMISSIONS.SESSIONS_VIEW,
      PERMISSIONS.MAINTENANCE_VIEW,
    ],
    isSystem: true,
    restrictedToOwnObra: true,
    canCreateRolesBelow: false, // Não pode criar perfis
  },

  // === NOVOS PERFIS (Abril 2026) ===

  it: {
    id: 'it',
    name: 'IT / Sistemas',
    description: 'Acesso total + DevTools, integrações (Procore, SAP), logs e gestão técnica',
    color: 'cyan',
    icon: 'Monitor',
    level: ROLE_LEVELS.IT,
    permissions: Object.values(PERMISSIONS), // Acesso total (como admin)
    isSystem: true,
    canCreateRolesBelow: true,
    // Flag especial — DevTools visível
    showDevTools: true,
    // Dashboard: painel de integrações, status APIs, logs
    defaultDashboard: 'it',
  },

  tecnico_manutencao: {
    id: 'tecnico_manutencao',
    name: 'Técnico de Manutenção',
    description: 'Gestão de manutenções, avarias e saúde dos equipamentos',
    color: 'orange',
    icon: 'Wrench',
    level: ROLE_LEVELS.SUPERVISOR,
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.MACHINES_VIEW,
      PERMISSIONS.MACHINES_EDIT,        // Pode atualizar estado da máquina
      PERMISSIONS.SESSIONS_VIEW,
      PERMISSIONS.SESSIONS_VIEW_ALL,
      PERMISSIONS.MAINTENANCE_VIEW,
      PERMISSIONS.MAINTENANCE_CREATE,   // Registar intervenções
      PERMISSIONS.MAINTENANCE_EDIT,     // Atualizar manutenções
      PERMISSIONS.QUALITY_VIEW,
      PERMISSIONS.QUALITY_VALIDATE,
      PERMISSIONS.SETTINGS_VIEW,
    ],
    isSystem: true,
    restrictedToOwnObra: false, // Técnico vai a várias obras
    canCreateRolesBelow: false,
    // Dashboard: painel de saúde de equipamentos, avarias abertas, preventivas
    defaultDashboard: 'manutencao',
  },

  operador: {
    id: 'operador',
    name: 'Operador de Campo',
    description: 'Mobile Hub, scan RFID/NFC, reportar avarias e validar sessões próprias',
    color: 'teal',
    icon: 'Smartphone',
    level: ROLE_LEVELS.OPERADOR,
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.MACHINES_VIEW,
      PERMISSIONS.SESSIONS_VIEW,         // Só as suas (filtrado)
      PERMISSIONS.MAINTENANCE_VIEW,      // Ver estado da máquina que opera
      PERMISSIONS.MAINTENANCE_CREATE,    // Reportar avaria
      PERMISSIONS.QUALITY_VALIDATE,      // Validar anomalias próprias
    ],
    isSystem: true,
    restrictedToOwnObra: true,
    canCreateRolesBelow: false,
    // Dashboard: Mobile Hub (scan, "minha máquina", reportar avaria)
    defaultDashboard: 'operador',
  },
};

// Mapeamento de menus para permissões
export const MENU_PERMISSIONS = {
  dashboard: [PERMISSIONS.DASHBOARD_VIEW],
  obras: [PERMISSIONS.OBRAS_VIEW],
  maquinas: [PERMISSIONS.MACHINES_VIEW],
  operadores: [PERMISSIONS.OPERATORS_VIEW],
  sessoes: [PERMISSIONS.SESSIONS_VIEW],
  manutencao: [PERMISSIONS.MAINTENANCE_VIEW],
  financeiro: [PERMISSIONS.FINANCIAL_VIEW],
  qualidade: [PERMISSIONS.QUALITY_VIEW],
  analises: [PERMISSIONS.ANALYTICS_VIEW],
  relatorios: [PERMISSIONS.REPORTS_VIEW],
  configuracoes: [PERMISSIONS.SETTINGS_VIEW],
};

// Helpers para verificar permissões
export const hasPermission = (userPermissions, permission) => {
  if (!userPermissions || !Array.isArray(userPermissions)) return false;
  return userPermissions.includes(permission);
};

export const hasAnyPermission = (userPermissions, permissions) => {
  if (!userPermissions || !Array.isArray(userPermissions)) return false;
  return permissions.some(p => userPermissions.includes(p));
};

export const hasAllPermissions = (userPermissions, permissions) => {
  if (!userPermissions || !Array.isArray(userPermissions)) return false;
  return permissions.every(p => userPermissions.includes(p));
};

export const canAccessMenu = (userPermissions, menuId) => {
  const requiredPermissions = MENU_PERMISSIONS[menuId];
  if (!requiredPermissions) return true; // Menu sem restrições
  return hasAnyPermission(userPermissions, requiredPermissions);
};

// Obter role por ID
export const getRoleById = (roleId, customRoles = {}) => {
  return customRoles[roleId] || DEFAULT_ROLES[roleId] || null;
};

// Obter permissões de um role
export const getRolePermissions = (roleId, customRoles = {}) => {
  const role = getRoleById(roleId, customRoles);
  return role?.permissions || [];
};

// Obter nível de um role
export const getRoleLevel = (roleId, customRoles = {}) => {
  const role = getRoleById(roleId, customRoles);
  return role?.level ?? ROLE_LEVELS.VISUALIZADOR; // Default: nível mais baixo (só leitura)
};

// Verificar se um role pode gerir outro (baseado em hierarquia)
export const canManageRole = (managerRoleId, targetRoleId, customRoles = {}) => {
  const managerRole = getRoleById(managerRoleId, customRoles);
  const targetRole = getRoleById(targetRoleId, customRoles);

  if (!managerRole || !targetRole) return false;
  if (!managerRole.canCreateRolesBelow) return false;

  // Só pode gerir roles de nível inferior
  return managerRole.level < targetRole.level;
};

// Verificar se pode criar roles de um determinado nível
export const canCreateRoleAtLevel = (userRoleId, targetLevel, customRoles = {}) => {
  const userRole = getRoleById(userRoleId, customRoles);

  if (!userRole || !userRole.canCreateRolesBelow) return false;

  // Só pode criar roles de nível inferior ao seu
  return userRole.level < targetLevel;
};

// Obter níveis disponíveis para criar roles
export const getAvailableLevelsForCreation = (userRoleId, customRoles = {}) => {
  const userRole = getRoleById(userRoleId, customRoles);

  if (!userRole || !userRole.canCreateRolesBelow) return [];

  // Retorna apenas níveis inferiores ao do utilizador
  return Object.entries(ROLE_LEVELS)
    .filter(([_key, level]) => level > userRole.level)
    .map(([name, level]) => ({ name, level }));
};

// Obter roles que o utilizador pode atribuir a outros
export const getAssignableRoles = (userRoleId, customRoles = {}) => {
  const userRole = getRoleById(userRoleId, customRoles);
  const allRoles = { ...DEFAULT_ROLES, ...customRoles };

  if (!userRole) return [];

  // Admin pode atribuir qualquer role
  if (userRole.level === ROLE_LEVELS.ADMIN) {
    return Object.values(allRoles);
  }

  // Outros só podem atribuir roles de nível igual ou inferior
  return Object.values(allRoles).filter(role => role.level >= userRole.level);
};

// Obter label amigável para o nível
export const getLevelLabel = (level) => {
  const labels = {
    [ROLE_LEVELS.ADMIN]: 'Administração',
    [ROLE_LEVELS.IT]: 'IT / Sistemas',
    [ROLE_LEVELS.GESTOR]: 'Gestão',
    [ROLE_LEVELS.SUPERVISOR]: 'Supervisão',
    [ROLE_LEVELS.OPERADOR]: 'Operador',
    [ROLE_LEVELS.VISUALIZADOR]: 'Visualização',
  };
  return labels[level] || 'Desconhecido';
};

// Categorias de permissões para UI
export const PERMISSION_CATEGORIES = {
  dashboard: {
    label: 'Dashboard',
    permissions: [
      { id: PERMISSIONS.DASHBOARD_VIEW, label: 'Ver Dashboard' },
      { id: PERMISSIONS.DASHBOARD_EXPORT, label: 'Exportar Dashboard' },
    ],
  },
  obras: {
    label: 'Obras',
    permissions: [
      { id: PERMISSIONS.OBRAS_VIEW, label: 'Ver Obras' },
      { id: PERMISSIONS.OBRAS_CREATE, label: 'Criar Obras' },
      { id: PERMISSIONS.OBRAS_EDIT, label: 'Editar Obras' },
      { id: PERMISSIONS.OBRAS_DELETE, label: 'Eliminar Obras' },
    ],
  },
  machines: {
    label: 'Equipamentos',
    permissions: [
      { id: PERMISSIONS.MACHINES_VIEW, label: 'Ver Equipamentos' },
      { id: PERMISSIONS.MACHINES_CREATE, label: 'Criar Equipamentos' },
      { id: PERMISSIONS.MACHINES_EDIT, label: 'Editar Equipamentos' },
      { id: PERMISSIONS.MACHINES_DELETE, label: 'Eliminar Equipamentos' },
      { id: PERMISSIONS.MACHINES_MOVE, label: 'Mudar Localização' },
    ],
  },
  operators: {
    label: 'Operadores',
    permissions: [
      { id: PERMISSIONS.OPERATORS_VIEW, label: 'Ver Operadores' },
      { id: PERMISSIONS.OPERATORS_CREATE, label: 'Criar Operadores' },
      { id: PERMISSIONS.OPERATORS_EDIT, label: 'Editar Operadores' },
      { id: PERMISSIONS.OPERATORS_DELETE, label: 'Eliminar Operadores' },
      { id: PERMISSIONS.OPERATORS_ASSIGN_ROLE, label: 'Atribuir Perfil' },
    ],
  },
  sessions: {
    label: 'Sessões',
    permissions: [
      { id: PERMISSIONS.SESSIONS_VIEW, label: 'Ver Sessões' },
      { id: PERMISSIONS.SESSIONS_VIEW_ALL, label: 'Ver Todas as Obras' },
      { id: PERMISSIONS.SESSIONS_EXPORT, label: 'Exportar Sessões' },
    ],
  },
  maintenance: {
    label: 'Manutenção',
    permissions: [
      { id: PERMISSIONS.MAINTENANCE_VIEW, label: 'Ver Manutenção' },
      { id: PERMISSIONS.MAINTENANCE_CREATE, label: 'Registar Manutenção' },
      { id: PERMISSIONS.MAINTENANCE_EDIT, label: 'Editar Manutenção' },
    ],
  },
  financial: {
    label: 'Financeiro',
    permissions: [
      { id: PERMISSIONS.FINANCIAL_VIEW, label: 'Ver Financeiro' },
      { id: PERMISSIONS.FINANCIAL_TARIFFS, label: 'Gerir Tarifários' },
      { id: PERMISSIONS.FINANCIAL_COSTS, label: 'Ver Custos' },
      { id: PERMISSIONS.FINANCIAL_EXPORT, label: 'Exportar Financeiro' },
    ],
  },
  analytics: {
    label: 'Análises',
    permissions: [
      { id: PERMISSIONS.ANALYTICS_VIEW, label: 'Ver Análises' },
      { id: PERMISSIONS.ANALYTICS_EXPORT, label: 'Exportar Análises' },
    ],
  },
  esg: {
    label: 'Sustentabilidade (ESG)',
    permissions: [
      { id: PERMISSIONS.ESG_VIEW, label: 'Ver ESG' },
      { id: PERMISSIONS.ESG_REPORTS, label: 'Relatórios ESG' },
      { id: PERMISSIONS.ESG_EXPORT, label: 'Exportar ESG' },
    ],
  },
  reports: {
    label: 'Relatórios',
    permissions: [
      { id: PERMISSIONS.REPORTS_VIEW, label: 'Ver Relatórios' },
      { id: PERMISSIONS.REPORTS_GENERATE, label: 'Gerar Relatórios' },
      { id: PERMISSIONS.REPORTS_EXECUTIVE, label: 'Relatórios Executivos' },
    ],
  },
  settings: {
    label: 'Configurações',
    permissions: [
      { id: PERMISSIONS.SETTINGS_VIEW, label: 'Ver Configurações' },
      { id: PERMISSIONS.SETTINGS_GENERAL, label: 'Configurações Gerais' },
      { id: PERMISSIONS.SETTINGS_ROLES, label: 'Gerir Perfis' },
      { id: PERMISSIONS.SETTINGS_USERS, label: 'Gerir Utilizadores' },
      { id: PERMISSIONS.SETTINGS_SYSTEM, label: 'Sistema' },
    ],
  },
  audit: {
    label: 'Auditoria',
    permissions: [
      { id: PERMISSIONS.AUDIT_VIEW, label: 'Ver Logs de Auditoria' },
      { id: PERMISSIONS.AUDIT_EXPORT, label: 'Exportar Auditoria' },
    ],
  },
};
