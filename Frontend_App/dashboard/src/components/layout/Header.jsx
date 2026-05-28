import React, { useEffect, useState } from 'react';
import { Bell, Search, Wifi, Download, WifiOff } from 'lucide-react';
import useStore from '../../store/useStore';
import usePWAInstall from '../../hooks/usePWAInstall';
import useOnlineStatus from '../../hooks/useOnlineStatus';

const viewTitles = {
  dashboard: { title: 'Visão Geral', description: 'Métricas e análises do sistema' },
  maquinas: { title: 'Equipamentos', description: 'Gestão de equipamentos' },
  'maquinas-lista': { title: 'Equipamentos', description: 'Inventário, estado e última leitura NFC' },
  'maquinas-categorias': { title: 'Categorias', description: 'Categorias de equipamentos' },
  'maquinas-localizacoes': { title: 'Localizações', description: 'Localização dos equipamentos' },
  operadores: { title: 'Operadores', description: 'Gestão de operadores' },
  obras: { title: 'Obras', description: 'Gestão de obras e localizações' },
  'obras-todas': { title: 'Obras', description: 'Gestão de obras e localizações' },
  'obras-em-curso': { title: 'Obras Em Curso', description: 'Obras atualmente ativas' },
  'obras-planeadas': { title: 'Obras Planeadas', description: 'Obras em planeamento' },
  'obras-concluidas': { title: 'Obras Concluídas', description: 'Obras finalizadas' },
  'obras-mapa': { title: 'Mapa de Obras', description: 'Localização geográfica das obras' },
  mapa: { title: 'Onde estão', description: 'Mapa por obra baseado na última leitura NFC' },
  sessoes: { title: 'Sessões', description: 'Histórico de sessões' },
  'sessoes-ativas': { title: 'Sessões Ativas', description: 'Sessões em curso' },
  'sessoes-historico': { title: 'Histórico de Sessões', description: 'Todas as sessões' },
  'sessoes-validacoes': { title: 'Validações', description: 'Sessões pendentes de validação' },
  'sessoes-corrigidas': { title: 'Sessões Corrigidas', description: 'Sessões com correção manual' },
  alertas: { title: 'Alertas', description: 'Anomalias detectadas — gestão operacional' },
  avarias: { title: 'Avarias', description: 'Avarias reportadas em equipamentos' },
  estaleiro: { title: 'Armazém', description: 'Inventário de equipamentos no armazém' },
  armazem: { title: 'Armazém', description: 'Inventário de equipamentos no armazém' },
  'obra-detalhe': { title: 'Detalhe da Obra', description: 'Equipamentos, sessões e avarias da obra' },
  manutencao: { title: 'Manutenção', description: 'Gestão de manutenções' },
  'manutencao-alertas': { title: 'Alertas', description: 'Anomalias detectadas — gestão operacional' },
  'manutencao-calendario': { title: 'Calendário', description: 'Manutenções programadas' },
  'manutencao-historico': { title: 'Histórico de Manutenção', description: 'Manutenções realizadas' },
  financeiro: { title: 'Financeiro', description: 'Gestão financeira' },
  'financeiro-tarifarios': { title: 'Tarifários', description: 'Configuração de preços' },
  'financeiro-custos': { title: 'Análise de Custos', description: 'Custos operacionais' },
  'financeiro-rentabilidade': { title: 'Rentabilidade', description: 'Análise de rentabilidade' },
  analises: { title: 'Análises', description: 'Análises e estatísticas' },
  'analises-geral': { title: 'Análise Geral', description: 'Visão geral das operações' },
  'analises-emissoes': { title: 'Emissões CO₂', description: 'Análise de emissões' },
  'analises-utilizacao': { title: 'Utilização', description: 'Taxa de utilização' },
  relatorios: { title: 'Relatórios', description: 'Exportação de relatórios' },
  configuracoes: { title: 'Configurações', description: 'Configurações do sistema' },
  catalogo: { title: 'Catálogo de Modelos', description: 'Gestão do catálogo (admin)' },
};

const Header = ({ onMenuClick }) => {
  const { activeView, setActiveView, toolAlerts = [] } = useStore();
  const viewInfo = viewTitles[activeView] || { title: 'Painel', description: '' };
  const alertCount = toolAlerts.filter(a => a.status === 'OPEN' || a.status === 'IN_REVIEW').length;
  const { isInstalled, isInstallable, install } = usePWAInstall();
  const [isStandalone, setIsStandalone] = useState(false);
  const { isOnline } = useOnlineStatus();

  useEffect(() => {
    const checkStandalone = () => {
      setIsStandalone(
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true
      );
    };
    checkStandalone();
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', checkStandalone);
    return () => mediaQuery.removeEventListener('change', checkStandalone);
  }, []);

  return (
    <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 md:px-6 transition-colors">
      {/* Left side */}
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">{viewInfo.title}</h1>
          {viewInfo.description && (
            <p className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">{viewInfo.description}</p>
          )}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Connection status */}
        <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 border rounded-full transition-colors ${
          isOnline 
            ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800' 
            : 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800'
        }`}>
          {isOnline ? (
            <Wifi className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-amber-500" />
          )}
          <span className={`text-xs font-medium ${isOnline ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* Search */}
        <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
          <Search className="w-5 h-5" />
        </button>

        {/* Notifications */}
        <button
          onClick={() => setActiveView('manutencao-alertas')}
          className="relative p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          aria-label="Alertas"
        >
          <Bell className="w-5 h-5" />
          {alertCount > 0 ? (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {alertCount > 99 ? '99+' : alertCount}
            </span>
          ) : (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
          )}
        </button>

        {/* PWA Install Button */}
        {isInstallable && !isInstalled && (
          <button
            onClick={install}
            className="p-2 text-slate-400 hover:text-[#005EB8] hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
            title="Instalar aplicação"
          >
            <Download className="w-5 h-5" />
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
