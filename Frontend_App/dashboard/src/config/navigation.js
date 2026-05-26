/**
 * NAVEGACAO - CASAIS FLEET INTELLIGENCE
 *
 * Estrutura criada do zero - Organizacao propria
 */

import {
  Map,
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
    id: 'mapa',
    label: 'Mapa',
    icon: Map,
    path: '/mapa',
    description: 'Vista geografica principal da operacao',
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/',
    description: 'Visao geral e metricas principais',
  },
  {
    id: 'obras',
    label: 'Obras',
    icon: Building2,
    path: '/obras',
    description: 'Gestao de obras e localizacoes',
    submenu: [
      {
        id: 'obras-todas',
        label: 'Todas',
        icon: List,
        path: '/obras',
        description: 'Todas as obras',
      },
      {
        id: 'obras-em-curso',
        label: 'Em Curso',
        icon: Activity,
        path: '/obras',
        description: 'Obras atualmente ativas',
      },
      {
        id: 'obras-planeadas',
        label: 'Planeadas',
        icon: Calendar,
        path: '/obras',
        description: 'Obras em planeamento',
      },
      {
        id: 'obras-concluidas',
        label: 'Concluidas',
        icon: ClipboardList,
        path: '/obras',
        description: 'Obras finalizadas',
      },
    ],
  },
  {
    id: 'maquinas',
    label: 'Equipamentos',
    icon: Truck,
    path: '/maquinas',
    description: 'Inventario e gestao de equipamentos NFC',
    submenu: [
      {
        id: 'maquinas-lista',
        label: 'Inventario',
        icon: List,
        path: '/maquinas',
        description: 'Todos os equipamentos',
      },
      {
        id: 'maquinas-categorias',
        label: 'Por Tipo',
        icon: Building2,
        path: '/maquinas/categorias',
        description: 'Por tipo de equipamento',
      },
      {
        id: 'maquinas-localizacoes',
        label: 'Localizacoes',
        icon: MapPin,
        path: '/maquinas/localizacoes',
        description: 'Por obra ou armazem',
      },
    ],
  },
  {
    id: 'sessoes',
    label: 'Sessoes',
    icon: ClipboardList,
    path: '/sessoes',
    description: 'Historico de operacao',
    submenu: [
      {
        id: 'sessoes-ativas',
        label: 'Sessoes Ativas',
        icon: Activity,
        path: '/sessoes/ativas',
        description: 'Em curso agora',
      },
      {
        id: 'sessoes-historico',
        label: 'Historico',
        icon: Calendar,
        path: '/sessoes',
        description: 'Todas as sessoes',
      },
      {
        id: 'sessoes-validacoes',
        label: 'Validacoes',
        icon: AlertTriangle,
        path: '/sessoes/validacoes',
        description: 'Pendentes',
      },
    ],
  },
  {
    id: 'operadores',
    label: 'Operadores',
    icon: Users,
    path: '/operadores',
    description: 'Gestao de operadores',
  },
  {
    id: 'manutencao',
    label: 'Manutencao',
    icon: Wrench,
    path: '/manutencao',
    description: 'Alertas e gestao de equipamentos',
    submenu: [
      {
        id: 'manutencao-alertas',
        label: 'Alertas',
        icon: AlertTriangle,
        path: '/manutencao',
        description: 'Inspecoes e alertas pendentes',
      },
      {
        id: 'manutencao-calendario',
        label: 'Calendario',
        icon: Calendar,
        path: '/manutencao/calendario',
        description: 'Agendamentos',
      },
      {
        id: 'manutencao-avarias',
        label: 'Avarias',
        icon: AlertTriangle,
        path: '/manutencao/avarias',
        description: 'Avarias reportadas',
      },
    ],
  },
  {
    id: 'analises',
    label: 'Analises',
    icon: BarChart3,
    path: '/analises',
    description: 'Graficos e metricas',
    submenu: [
      {
        id: 'analises-geral',
        label: 'Visao Geral',
        icon: TrendingUp,
        path: '/analises',
        description: 'KPIs principais',
      },
      {
        id: 'analises-emissoes',
        label: 'Emissoes CO2',
        icon: Gauge,
        path: '/analises/emissoes',
        description: 'Analise ambiental',
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
    label: 'Relatorios',
    icon: FileText,
    path: '/relatorios',
    description: 'Exportacoes e documentos',
  },
  {
    id: 'configuracoes',
    label: 'Configuracoes',
    icon: Settings,
    path: '/configuracoes',
    description: 'Sistema e preferencias',
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
