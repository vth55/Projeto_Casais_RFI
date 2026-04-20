import React, { useEffect, useState } from 'react';
import { Menu, Bell, Search, Wifi, Download, WifiOff } from 'lucide-react';
import useStore from '../../store/useStore';
import usePWAInstall from '../../hooks/usePWAInstall';
import useOnlineStatus from '../../hooks/useOnlineStatus';

const viewTitles = {
  dashboard: { title: 'Dashboard', description: 'Visão geral do sistema' },
  maquinas: { title: 'Equipamentos', description: 'Gestão de equipamentos' },
  'maquinas-lista': { title: 'Lista de Equipamentos', description: 'Todos os equipamentos registados' },
  'maquinas-categorias': { title: 'Categorias', description: 'Categorias de equipamentos' },
  'maquinas-localizacoes': { title: 'Localizações', description: 'Localização dos equipamentos' },
  operadores: { title: 'Operadores', description: 'Gestão de operadores' },
  sessoes: { title: 'Sessões', description: 'Histórico de sessões' },
  'sessoes-ativas': { title: 'Sessões Ativas', description: 'Sessões em curso' },
  'sessoes-historico': { title: 'Histórico de Sessões', description: 'Todas as sessões' },
  'sessoes-validacoes': { title: 'Validações', description: 'Sessões pendentes de validação' },
  manutencao: { title: 'Manutenção', description: 'Gestão de manutenções' },
  'manutencao-alertas': { title: 'Alertas de Manutenção', description: 'Equipamentos que precisam de atenção' },
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
};

const Header = ({ onMenuClick }) => {
  const { activeView } = useStore();
  const viewInfo = viewTitles[activeView] || { title: 'Dashboard', description: '' };
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
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
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
        <button className="relative p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
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
