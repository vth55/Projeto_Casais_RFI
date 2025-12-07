/**
 * NAVEGAÇÃO - CASAIS FLEET INTELLIGENCE
 * 
 * Estrutura criada do zero - Organização própria
 */

import {
  LayoutDashboard,
  Truck,
  Users,
  ClipboardList,
  Wrench,
  BarChart3,
  FileText,
  Settings,
  MapPin,
  AlertTriangle,
  Calendar,
  TrendingUp,
  Activity,
  Gauge,
  DollarSign,
  Building2,
  List,
} from 'lucide-react';

export const navigationStructure = [
  {
    id: 'dashboard',
    label: 'Painel Principal',
    icon: LayoutDashboard,
    path: '/',
    description: 'Visão geral e métricas principais',
  },
  {
    id: 'maquinas',
    label: 'Máquinas',
    icon: Truck,
    path: '/maquinas',
    description: 'Gestão completa da frota',
    submenu: [
      {
        id: 'maquinas-lista',
        label: 'Lista',
        icon: List,
        path: '/maquinas',
        description: 'Todas as máquinas',
      },
      {
        id: 'maquinas-categorias',
        label: 'Categorias',
        icon: Building2,
        path: '/maquinas/categorias',
        description: 'Por tipo de equipamento',
      },
      {
        id: 'maquinas-localizacoes',
        label: 'Localizações',
        icon: MapPin,
        path: '/maquinas/localizacoes',
        description: 'Por obra/estaleiro',
      },
    ],
  },
  {
    id: 'operadores',
    label: 'Operadores',
    icon: Users,
    path: '/operadores',
    description: 'Gestão de operadores',
  },
  {
    id: 'sessoes',
    label: 'Sessões',
    icon: ClipboardList,
    path: '/sessoes',
    description: 'Histórico de operação',
    submenu: [
      {
        id: 'sessoes-ativas',
        label: 'Sessões Ativas',
        icon: Activity,
        path: '/sessoes/ativas',
        description: 'Em curso agora',
      },
      {
        id: 'sessoes-historico',
        label: 'Histórico',
        icon: Calendar,
        path: '/sessoes',
        description: 'Todas as sessões',
      },
      {
        id: 'sessoes-validacoes',
        label: 'Validações',
        icon: AlertTriangle,
        path: '/sessoes/validacoes',
        description: 'Pendentes',
      },
    ],
  },
  {
    id: 'manutencao',
    label: 'Manutenção',
    icon: Wrench,
    path: '/manutencao',
    description: 'Alertas e gestão',
    submenu: [
      {
        id: 'manutencao-alertas',
        label: 'Alertas',
        icon: AlertTriangle,
        path: '/manutencao',
        description: 'Manutenção necessária',
      },
      {
        id: 'manutencao-calendario',
        label: 'Calendário',
        icon: Calendar,
        path: '/manutencao/calendario',
        description: 'Agendamentos',
      },
      {
        id: 'manutencao-avarias',
        label: 'Avarias',
        icon: AlertTriangle,
        path: '/manutencao/avarias',
        description: 'Reportadas',
      },
    ],
  },
  {
    id: 'analises',
    label: 'Análises',
    icon: BarChart3,
    path: '/analises',
    description: 'Gráficos e métricas',
    submenu: [
      {
        id: 'analises-geral',
        label: 'Visão Geral',
        icon: TrendingUp,
        path: '/analises',
        description: 'KPIs principais',
      },
      {
        id: 'analises-emissoes',
        label: 'Emissões CO₂',
        icon: Gauge,
        path: '/analises/emissoes',
        description: 'Análise ambiental',
      },
      {
        id: 'analises-custos',
        label: 'Custos',
        icon: DollarSign,
        path: '/analises/custos',
        description: 'Rentabilidade',
      },
    ],
  },
  {
    id: 'relatorios',
    label: 'Relatórios',
    icon: FileText,
    path: '/relatorios',
    description: 'Exportações e documentos',
  },
  {
    id: 'configuracoes',
    label: 'Configurações',
    icon: Settings,
    path: '/configuracoes',
    description: 'Sistema e preferências',
  },
];

export const findNavItem = (id) => {
  for (const item of navigationStructure) {
    if (item.id === id) return item;
    if (item.submenu) {
      const subItem = item.submenu.find((sub) => sub.id === id);
      if (subItem) return subItem;
    }
  }
  return null;
};

export const getNavPath = (id) => {
  const item = findNavItem(id);
  return item?.path || '/';
};
