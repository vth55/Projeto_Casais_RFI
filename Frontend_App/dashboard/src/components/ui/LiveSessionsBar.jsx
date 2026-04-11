import React, { memo } from 'react';
import { Activity, ChevronRight, WifiOff } from 'lucide-react';
import useStore from '../../store/useStore';
import LiveTimer from './LiveTimer';
import useOnlineStatus from '../../hooks/useOnlineStatus';

/**
 * LiveSessionsBar — barra persistente no topo do conteúdo quando há sessões ativas.
 * Inspirado no mini-player do Spotify / Live Activities iOS.
 * Sempre visível independentemente do tab ativo.
 * Não aparece offline porque os timers não funcionam sem rede.
 */
const LiveSessionsBar = memo(() => {
  const { sessions, machines, operators, setActiveView } = useStore();
  const { isOnline } = useOnlineStatus();

  const activeSessions = sessions.filter(s => s.status === 'OPEN');
  
  if (activeSessions.length === 0 || !isOnline) return null;

  const first = activeSessions[0];
  const firstMachine = machines.find(m => m.id === first.machineId);
  const firstOperator = operators.find(o => o.id === first.cardId || o.cardId === first.cardId);

  return (
    <button
      onClick={() => setActiveView('sessoes-ativas')}
      className="w-full flex items-center gap-3 px-4 py-2.5 bg-emerald-600 text-white transition-all active:bg-emerald-700 md:hidden"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {/* Pulsar indicator */}
      <div className="relative flex-shrink-0">
        <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping absolute inset-0 opacity-75" />
        <div className="w-2.5 h-2.5 rounded-full bg-white relative" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 text-left">
        {activeSessions.length === 1 ? (
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold truncate">
              {firstMachine?.name || first.machineId}
            </span>
            <span className="text-emerald-200 text-xs">•</span>
            <span className="text-emerald-100 text-xs truncate">
              {firstOperator?.name || first.cardId}
            </span>
          </div>
        ) : (
          <span className="text-sm font-semibold">
            {activeSessions.length} sessões ativas
          </span>
        )}
      </div>

      {/* Live timer */}
      {activeSessions.length === 1 && (
        <LiveTimer
          startTime={first.startTime}
          className="text-sm text-white flex-shrink-0"
          warningAfterHours={5}
        />
      )}

      {/* Arrow */}
      <ChevronRight className="w-4 h-4 text-emerald-200 flex-shrink-0" />
    </button>
  );
});

LiveSessionsBar.displayName = 'LiveSessionsBar';
export default LiveSessionsBar;
