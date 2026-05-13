import React, { useState, useMemo, useEffect } from 'react';
import {
  LayoutDashboard, Truck, Users, Clock, Wrench, BarChart3,
  FileText, Settings, ChevronDown, Wallet, LogOut,
  Activity, Building2, Shield, ChevronLeft, ChevronRight, Warehouse,
} from 'lucide-react';
import useStore from '../../store/useStore';
import useAuthStore from '../../store/useAuthStore';

const navigation = [
  { id: 'dashboard',   label: 'Dashboard',     icon: LayoutDashboard },
  { id: 'obras',       label: 'Obras',          icon: Building2,
    submenu: [
      { id: 'obras-todas',      label: 'Todas' },
      { id: 'obras-em-curso',   label: 'Em Curso' },
      { id: 'obras-planeadas',  label: 'Planeadas' },
      { id: 'obras-concluidas', label: 'Concluídas' },
    ],
  },
  { id: 'maquinas',    label: 'Equipamentos',   icon: Truck },
  { id: 'estaleiro',   label: 'Estaleiro',      icon: Warehouse },
  { id: 'operadores',  label: 'Operadores',     icon: Users },
  { id: 'sessoes',     label: 'Sessões',        icon: Clock,
    submenu: [
      { id: 'sessoes-ativas',     label: 'Sessões Ativas' },
      { id: 'sessoes-historico',  label: 'Histórico' },
      { id: 'sessoes-validacoes', label: 'Validações' },
      { id: 'sessoes-corrigidas', label: 'Corrigidas' },
    ],
  },
  { id: 'manutencao',  label: 'Manutenção',    icon: Wrench,
    submenu: [
      { id: 'manutencao-alertas',   label: 'Alertas' },
      { id: 'manutencao-historico', label: 'Histórico' },
      { id: 'manutencao-avarias',   label: 'Avarias' },
    ],
  },
  { id: 'financeiro',  label: 'Financeiro',    icon: Wallet,
    submenu: [
      { id: 'financeiro-tarifarios', label: 'Tarifários' },
      { id: 'financeiro-custos',     label: 'Custos' },
    ],
  },
  { id: 'analises',    label: 'Análises',      icon: BarChart3 },
  { id: 'relatorios',  label: 'Relatórios',    icon: FileText },
  { id: 'configuracoes', label: 'Configurações', icon: Settings },
];

const Sidebar = ({ className = '', onNavigate, collapsed = false, onToggleCollapse }) => {
  const { activeView, setActiveView, machines, sessions } = useStore();
  const { currentUser, canAccess, logout, getRole } = useAuthStore();

  const [expandedMenus, setExpandedMenus] = useState(() => {
    for (const item of navigation) {
      if (item.submenu?.some(sub => sub.id === activeView)) return [item.id];
    }
    return [];
  });

  useEffect(() => {
    for (const item of navigation) {
      if (item.submenu?.some(sub => sub.id === activeView)) {
        setExpandedMenus(prev => prev.includes(item.id) ? prev : [item.id]);
        return;
      }
    }
  }, [activeView]);

  const filteredNavigation = useMemo(() => navigation.filter(item => canAccess(item.id)), [canAccess, currentUser?.permissions, currentUser?.systemRole]);
  const currentRole = useMemo(() => getRole(currentUser?.systemRole), [currentUser, getRole]);

  const toggleMenu = (menuId) => {
    setExpandedMenus(prev => prev.includes(menuId) ? [] : [menuId]);
  };

  const isActive = (id) => activeView === id || activeView.startsWith(id + '-');
  const isExpanded = (id) => expandedMenus.includes(id);

  const activeSessions = sessions.filter(s => s.status === 'OPEN').length;
  const totalMachines = machines.length;
  const estaleiroCount = machines.filter(m => m.obraId === 'estaleiro' || (!m.obraId && !m.location)).length;

  const userInitials = currentUser?.name
    ?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  // ============================================================
  // MODO COLLAPSED (tablet rail — só ícones)
  // ============================================================
  if (collapsed) {
    return (
      <aside className={`${className} w-16 flex-col bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 flex`}>
        {/* Logo compacto */}
        <div className="h-16 flex items-center justify-center border-b border-slate-700/50">
          <div className="w-9 h-9 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
        </div>

        {/* Icons nav */}
        <nav className="flex-1 overflow-y-auto py-3 flex flex-col gap-1 items-center px-2">
          {filteredNavigation.map((item) => {
            const itemActive = isActive(item.id);
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.submenu) {
                    // Em modo collapsed, navega para o primeiro submenu
                    setActiveView(item.submenu[0].id);
                    onNavigate?.();
                  } else {
                    setActiveView(item.id);
                    onNavigate?.();
                  }
                }}
                title={item.label}
                className={`
                  w-10 h-10 rounded-xl flex items-center justify-center transition-all
                  ${itemActive
                    ? 'bg-primary-500/20 text-primary-400'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }
                `}
              >
                <item.icon className="w-5 h-5" />
              </button>
            );
          })}
        </nav>

        {/* Toggle expand button */}
        {onToggleCollapse && (
          <div className="p-2 border-t border-slate-700/50 flex justify-center">
            <button
              onClick={onToggleCollapse}
              title="Expandir menu"
              className="w-10 h-10 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white flex items-center justify-center transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* User avatar */}
        <div className="p-3 border-t border-slate-700/50 flex justify-center">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">{userInitials}</span>
          </div>
        </div>
      </aside>
    );
  }

  // ============================================================
  // MODO EXPANDIDO (completo)
  // ============================================================
  return (
    <aside className={`${className || 'flex'} w-64 flex-col bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800`}>
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-slate-700/50">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-9 h-9 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
            <span className="text-white font-bold">C</span>
          </div>
          <div>
            <span className="font-bold text-white tracking-tight">CASAIS</span>
            <span className="text-primary-400 text-xs font-medium block -mt-0.5">Fleet Intelligence</span>
          </div>
        </div>
        {/* Botão colapsar — só no tablet */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            title="Colapsar menu"
            className="w-7 h-7 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white flex items-center justify-center transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Quick Stats */}
      <div className="px-4 py-3 border-b border-slate-700/50">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/50">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs text-slate-400">Ativas</span>
            </div>
            <p className="text-lg font-bold text-white mt-0.5">{activeSessions}</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/50">
            <div className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-primary-400" />
              <span className="text-xs text-slate-400">Equip.</span>
            </div>
            <p className="text-lg font-bold text-white mt-0.5">{totalMachines}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        <ul className="space-y-0.5">
          {filteredNavigation.map((item) => {
            const hasSubmenu = item.submenu?.length > 0;
            const itemActive = isActive(item.id);
            const menuExpanded = isExpanded(item.id);

            return (
              <li key={item.id}>
                <button
                  onClick={() => {
                    if (hasSubmenu) {
                      toggleMenu(item.id);
                      // Se ainda não está numa sub-view, navega para a primeira do submenu
                      if (!item.submenu.some(s => s.id === activeView)) {
                        setActiveView(item.submenu[0].id);
                        onNavigate?.();
                      }
                    } else {
                      setActiveView(item.id);
                      onNavigate?.();
                    }
                  }}
                  className={`
                    w-full flex items-center justify-between px-3 py-2.5 rounded-xl
                    text-sm font-medium transition-all duration-150
                    ${itemActive
                      ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={`w-4.5 h-4.5 ${itemActive ? 'text-primary-400' : 'text-slate-500'}`} style={{ width: '18px', height: '18px' }} />
                    <span>{item.label}</span>
                    {item.id === 'estaleiro' && estaleiroCount > 0 && (
                      <span className="ml-auto mr-1 min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {estaleiroCount}
                      </span>
                    )}
                  </div>
                  {hasSubmenu && (
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${menuExpanded ? 'rotate-180' : ''}`} />
                  )}
                </button>

                {hasSubmenu && menuExpanded && (
                  <ul className="mt-1 ml-4 pl-4 border-l border-slate-700 space-y-0.5">
                    {item.submenu.map((subItem) => {
                      const subActive = activeView === subItem.id;
                      return (
                        <li key={subItem.id}>
                          <button
                            onClick={() => { setActiveView(subItem.id); onNavigate?.(); }}
                            className={`
                              w-full text-left px-3 py-2 rounded-lg text-sm
                              transition-colors duration-150
                              ${subActive
                                ? 'text-primary-400 bg-primary-500/10 font-medium'
                                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                              }
                            `}
                          >
                            {subItem.label}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User */}
      <div className="p-3 border-t border-slate-700/50">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg flex-shrink-0">
            <span className="text-white text-xs font-bold">{userInitials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{currentUser?.name || 'Utilizador'}</p>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Shield className="w-3 h-3" />
              <span className="truncate">{currentRole?.name || 'Sem perfil'}</span>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Terminar sessão"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
