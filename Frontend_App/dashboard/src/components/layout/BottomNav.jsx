import React, { useState, memo } from 'react';
import {
  Map,
  Package,
  Clock,
  Wrench,
  Grid3x3,
  Building2,
  Users,
  Wallet,
  CheckCircle,
  BarChart3,
  FileText,
  Settings,
  X,
  Warehouse,
  ArrowRightLeft,
} from 'lucide-react';
import useStore from '../../store/useStore';
import useAuthStore from '../../store/useAuthStore';

// Os 4 tabs principais + "Mais"
const PRIMARY_TABS = [
  { id: 'maquinas',     label: 'Equip.',    icon: Package },
  { id: 'sessoes-ativas', label: 'Sessões', icon: Clock },
  { id: 'manutencao-alertas', label: 'Alertas', icon: Wrench },
  { id: 'obras',       label: 'Obras',      icon: Building2 },
];

// Itens no sheet "Mais"
const MORE_ITEMS = [
  { id: 'mapa',        label: 'Onde estão',    icon: Map },
  { id: 'guias',       label: 'Guias',        icon: ArrowRightLeft },
  { id: 'estaleiro',   label: 'Armazém',      icon: Warehouse },
  { id: 'operadores',  label: 'Operadores',     icon: Users },
  { id: 'financeiro-custos', label: 'Financeiro', icon: Wallet },
  { id: 'sessoes-validacoes', label: 'Validações',  icon: CheckCircle },
  { id: 'analises',    label: 'Análises',       icon: BarChart3 },
  { id: 'relatorios',  label: 'Relatórios',     icon: FileText },
  { id: 'configuracoes', label: 'Configurações', icon: Settings },
];

const BottomNav = memo(() => {
  const { activeView, setActiveView, toolSessions = [], toolAlerts = [] } = useStore();
  const { canAccess } = useAuthStore();
  const [showMore, setShowMore] = useState(false);

  const activeSessions = toolSessions.filter(s => s.status === 'OPEN').length;
  const maintenanceAlerts = toolAlerts.filter(alert => alert.status === 'OPEN' || alert.status === 'IN_REVIEW').length;

  const isTabActive = (id) => {
    if (id === 'mapa') return activeView === id;
    return activeView === id || activeView.startsWith(id.split('-')[0] + '-') || activeView === id.split('-')[0];
  };

  const navigate = (id) => {
    setActiveView(id);
    setShowMore(false);
  };

  const getBadge = (id) => {
    if (id === 'sessoes-ativas' && activeSessions > 0) return activeSessions;
    if (id === 'manutencao-alertas' && maintenanceAlerts > 0) return maintenanceAlerts;
    return null;
  };

  const filteredPrimary = PRIMARY_TABS.filter(tab => {
    const base = tab.id.split('-')[0];
    return canAccess(base) || canAccess(tab.id);
  });

  const filteredMore = MORE_ITEMS.filter(item => {
    const base = item.id.split('-')[0];
    return canAccess(base) || canAccess(item.id);
  });

  return (
    <>
      {/* Bottom Sheet "Mais" */}
      {showMore && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-sm"
            onClick={() => setShowMore(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl border-t border-slate-200 dark:border-slate-700 pb-safe">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
            </div>

            {/* Title */}
            <div className="flex items-center justify-between px-5 py-3">
              <span className="text-base font-bold text-slate-900 dark:text-white">Mais opções</span>
              <button
                onClick={() => setShowMore(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </button>
            </div>

            {/* Grid de opções */}
            <div className="grid grid-cols-4 gap-1 px-4 pb-6">
              {filteredMore.map((item) => {
                const active = isTabActive(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.id)}
                    className={`
                      flex flex-col items-center gap-2 p-3 rounded-2xl transition-all active:scale-95
                      ${active
                        ? 'bg-primary-50 dark:bg-primary-900/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                      }
                    `}
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                      active ? 'bg-primary-100 dark:bg-primary-900/50' : 'bg-slate-100 dark:bg-slate-800'
                    }`}>
                      <item.icon className={`w-6 h-6 ${active ? 'text-primary-600' : 'text-slate-500 dark:text-slate-400'}`} />
                    </div>
                    <span className={`text-xs font-medium text-center leading-tight ${
                      active ? 'text-primary-700 dark:text-primary-400' : 'text-slate-600 dark:text-slate-400'
                    }`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Bottom Nav Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-stretch">
          {filteredPrimary.map((tab) => {
            const active = isTabActive(tab.id);
            const badge = getBadge(tab.id);

            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.id)}
                className={`
                  flex-1 flex flex-col items-center justify-center gap-0.5 py-2 relative
                  transition-all duration-150 active:bg-slate-50 dark:active:bg-slate-800
                  min-h-[56px]
                `}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                {/* Active indicator bar */}
                {active && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary-500 rounded-full" />
                )}

                {/* Icon with badge */}
                <div className="relative">
                  <tab.icon className={`w-6 h-6 transition-colors ${
                    active ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400 dark:text-slate-500'
                  }`} />
                  {badge && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>

                {/* Label */}
                <span className={`text-[10px] font-medium transition-colors leading-none ${
                  active ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400 dark:text-slate-500'
                }`}>
                  {tab.label}
                </span>
              </button>
            );
          })}

          {/* Tab "Mais" */}
          <button
            onClick={() => setShowMore(prev => !prev)}
            className={`
              flex-1 flex flex-col items-center justify-center gap-0.5 py-2
              transition-all duration-150 active:bg-slate-50 dark:active:bg-slate-800
              min-h-[56px]
            `}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            {showMore && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary-500 rounded-full" />
            )}
            <Grid3x3 className={`w-6 h-6 ${showMore ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400 dark:text-slate-500'}`} />
            <span className={`text-[10px] font-medium leading-none ${showMore ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400 dark:text-slate-500'}`}>
              Mais
            </span>
          </button>
        </div>

        {/* Safe area para iPhone */}
        <div className="h-safe-area-bottom bg-white dark:bg-slate-900" style={{ height: 'env(safe-area-inset-bottom)' }} />
      </nav>
    </>
  );
});

BottomNav.displayName = 'BottomNav';
export default BottomNav;
