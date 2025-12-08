import React, { useState } from 'react';
import {
  LayoutDashboard,
  Truck,
  Users,
  Clock,
  Wrench,
  BarChart3,
  FileText,
  Settings,
  ChevronDown,
  Wallet,
  CheckCircle,
  LogOut,
  Activity,
} from 'lucide-react';
import useStore from '../../store/useStore';

const navigation = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'maquinas',
    label: 'Equipamentos',
    icon: Truck,
    submenu: [
      { id: 'maquinas-lista', label: 'Lista de Equipamentos' },
      { id: 'maquinas-categorias', label: 'Categorias' },
    ],
  },
  {
    id: 'operadores',
    label: 'Operadores',
    icon: Users,
  },
  {
    id: 'sessoes',
    label: 'Sessões',
    icon: Clock,
    submenu: [
      { id: 'sessoes-ativas', label: 'Sessões Ativas' },
      { id: 'sessoes-historico', label: 'Histórico' },
    ],
  },
  {
    id: 'manutencao',
    label: 'Manutenção',
    icon: Wrench,
    submenu: [
      { id: 'manutencao-alertas', label: 'Alertas' },
      { id: 'manutencao-historico', label: 'Histórico' },
    ],
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    icon: Wallet,
    submenu: [
      { id: 'financeiro-tarifarios', label: 'Tarifários' },
      { id: 'financeiro-custos', label: 'Custos' },
    ],
  },
  {
    id: 'qualidade',
    label: 'Qualidade',
    icon: CheckCircle,
  },
  {
    id: 'analises',
    label: 'Análises',
    icon: BarChart3,
  },
  {
    id: 'relatorios',
    label: 'Relatórios',
    icon: FileText,
  },
  {
    id: 'configuracoes',
    label: 'Configurações',
    icon: Settings,
  },
];

const Sidebar = () => {
  const { activeView, setActiveView, machines, sessions } = useStore();
  const [expandedMenus, setExpandedMenus] = useState(() => {
    for (const item of navigation) {
      if (item.submenu?.some(sub => sub.id === activeView)) {
        return [item.id];
      }
    }
    return [];
  });

  const toggleMenu = (menuId) => {
    setExpandedMenus(prev =>
      prev.includes(menuId)
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  };

  const isActive = (id) => activeView === id || activeView.startsWith(id + '-');
  const isExpanded = (id) => expandedMenus.includes(id);

  // KPIs para mostrar na sidebar
  const activeSessions = sessions.filter(s => s.status === 'OPEN').length;
  const totalMachines = machines.length;

  return (
    <aside className="hidden md:flex w-64 flex-col bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800">
      {/* Logo */}
      <div className="h-20 flex items-center px-6 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
            <span className="text-white font-bold text-lg">C</span>
          </div>
          <div>
            <span className="font-bold text-white text-lg tracking-tight">CASAIS</span>
            <span className="text-primary-400 text-xs font-medium block -mt-0.5">Fleet Intelligence</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="px-4 py-4 border-b border-slate-700/50">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-slate-400">Ativas</span>
            </div>
            <p className="text-xl font-bold text-white mt-1">{activeSessions}</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-primary-400" />
              <span className="text-xs text-slate-400">Equip.</span>
            </div>
            <p className="text-xl font-bold text-white mt-1">{totalMachines}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const hasSubmenu = item.submenu && item.submenu.length > 0;
            const itemActive = isActive(item.id);
            const menuExpanded = isExpanded(item.id);

            return (
              <li key={item.id}>
                <button
                  onClick={() => {
                    if (hasSubmenu) {
                      toggleMenu(item.id);
                    } else {
                      setActiveView(item.id);
                    }
                  }}
                  className={`
                    w-full flex items-center justify-between px-3 py-2.5 rounded-lg
                    text-sm font-medium transition-all duration-200
                    ${itemActive
                      ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={`w-5 h-5 ${itemActive ? 'text-primary-400' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {hasSubmenu && (
                    <ChevronDown
                      className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                        menuExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  )}
                </button>

                {/* Submenu */}
                {hasSubmenu && menuExpanded && (
                  <ul className="mt-1 ml-4 pl-4 border-l border-slate-700 space-y-1">
                    {item.submenu.map((subItem) => {
                      const subActive = activeView === subItem.id;
                      return (
                        <li key={subItem.id}>
                          <button
                            onClick={() => setActiveView(subItem.id)}
                            className={`
                              w-full text-left px-3 py-2 rounded-lg text-sm
                              transition-colors duration-200
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
      <div className="p-4 border-t border-slate-700/50">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg">
            <span className="text-white text-sm font-bold">VH</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Vitor Hugo</p>
            <p className="text-xs text-slate-500">Gestor de Frota</p>
          </div>
          <button className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
