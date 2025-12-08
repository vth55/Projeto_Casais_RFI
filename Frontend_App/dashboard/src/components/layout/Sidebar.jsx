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
      { id: 'maquinas-localizacoes', label: 'Localizações' },
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
      { id: 'sessoes-validacoes', label: 'Validações' },
    ],
  },
  {
    id: 'manutencao',
    label: 'Manutenção',
    icon: Wrench,
    submenu: [
      { id: 'manutencao-alertas', label: 'Alertas' },
      { id: 'manutencao-calendario', label: 'Calendário' },
      { id: 'manutencao-historico', label: 'Histórico' },
    ],
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    icon: Wallet,
    submenu: [
      { id: 'financeiro-tarifarios', label: 'Tarifários' },
      { id: 'financeiro-custos', label: 'Análise de Custos' },
      { id: 'financeiro-rentabilidade', label: 'Rentabilidade' },
    ],
  },
  {
    id: 'qualidade',
    label: 'Qualidade de Dados',
    icon: CheckCircle,
    submenu: [
      { id: 'qualidade-validacoes', label: 'Validações Pendentes' },
      { id: 'qualidade-alertas', label: 'Alertas de Fadiga' },
      { id: 'qualidade-historico', label: 'Histórico' },
    ],
  },
  {
    id: 'analises',
    label: 'Análises',
    icon: BarChart3,
    submenu: [
      { id: 'analises-geral', label: 'Visão Geral' },
      { id: 'analises-emissoes', label: 'Emissões CO₂' },
      { id: 'analises-utilizacao', label: 'Utilização' },
    ],
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
  const { activeView, setActiveView } = useStore();
  const [expandedMenus, setExpandedMenus] = useState(() => {
    // Expandir menu que contém a view ativa
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

  return (
    <aside className="hidden md:flex w-64 flex-col bg-white border-r border-slate-200">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <div>
            <span className="font-bold text-slate-900 text-sm">CASAIS</span>
            <span className="text-slate-500 text-xs block -mt-0.5">Fleet Intelligence</span>
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
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={`w-5 h-5 ${itemActive ? 'text-primary-500' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {hasSubmenu && (
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                        menuExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  )}
                </button>

                {/* Submenu */}
                {hasSubmenu && menuExpanded && (
                  <ul className="mt-1 ml-8 space-y-1">
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
                                ? 'text-primary-600 bg-primary-50/50 font-medium'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
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
      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
            <span className="text-white text-sm font-semibold">VH</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">Vitor Hugo</p>
            <p className="text-xs text-slate-500">Gestor</p>
          </div>
          <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
