import React, { memo } from 'react';
import { Truck } from 'lucide-react';
import useStore from '../../store/useStore';

const STATUS_RING = {
  ACTIVE:      'ring-4 ring-emerald-500 ring-offset-2',
  IDLE:        'ring-2 ring-slate-300 ring-offset-1',
  MAINTENANCE: 'ring-4 ring-amber-500 ring-offset-2',
  ALERT:       'ring-4 ring-red-500 ring-offset-2',
};

const STATUS_BG = {
  ACTIVE:      'bg-emerald-100',
  IDLE:        'bg-slate-100',
  MAINTENANCE: 'bg-amber-100',
  ALERT:       'bg-red-100',
};

const STATUS_TEXT = {
  ACTIVE:      'text-emerald-700',
  IDLE:        'text-slate-500',
  MAINTENANCE: 'text-amber-700',
  ALERT:       'text-red-700',
};

const STATUS_DOT = {
  ACTIVE:      'bg-emerald-500 animate-pulse',
  IDLE:        'bg-slate-400',
  MAINTENANCE: 'bg-amber-500 animate-pulse',
  ALERT:       'bg-red-500 animate-pulse',
};

/**
 * MachineStoryRings — scroll horizontal de círculos por máquina, estilo Instagram Stories.
 * Cada anel é colorido pelo estado da máquina.
 */
const MachineStoryRings = memo(() => {
  const { machines, sessions, setActiveView } = useStore();
  if (!machines.length) return null;

  const activeSessions = sessions.filter(s => s.status === 'OPEN');

  const getStatus = (machine) => {
    const hasActiveSession = activeSessions.some(s => s.machineId === machine.id);
    if (hasActiveSession) return 'ACTIVE';
    const status = (machine.status || '').toUpperCase();
    if (status === 'MAINTENANCE') return 'MAINTENANCE';
    if (status === 'ALERT') return 'ALERT';
    return 'IDLE';
  };

  const initials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <div className="md:hidden">
      <div className="flex items-center justify-between px-4 mb-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Frota</span>
        <button
          onClick={() => setActiveView('maquinas')}
          className="text-xs text-primary-600 font-semibold"
        >
          Ver todos
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 px-4 scrollbar-hide snap-x snap-mandatory">
        {machines.slice(0, 10).map((machine) => {
          const status = getStatus(machine);
          const ring = STATUS_RING[status];
          const bg = STATUS_BG[status];
          const textColor = STATUS_TEXT[status];
          const dot = STATUS_DOT[status];

          return (
            <button
              key={machine.id}
              onClick={() => setActiveView('maquinas')}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 snap-start active:scale-95 transition-transform"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {/* Ring circle */}
              <div className={`relative w-14 h-14 rounded-full ${ring} ${bg} flex items-center justify-center`}>
                <span className={`text-sm font-bold ${textColor}`}>{initials(machine.name)}</span>
                {/* Status dot */}
                <div className={`absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 border-white ${dot}`} />
              </div>
              {/* Name */}
              <span className="text-xs text-slate-600 dark:text-slate-300 text-center leading-tight max-w-[56px] truncate">
                {machine.name?.split(' ')[0] || machine.id}
              </span>
            </button>
          );
        })}

        {/* "Ver todos" circle if more than 10 */}
        {machines.length > 10 && (
          <button
            onClick={() => setActiveView('maquinas')}
            className="flex flex-col items-center gap-1.5 flex-shrink-0 snap-start"
          >
            <div className="w-14 h-14 rounded-full ring-2 ring-slate-200 bg-slate-100 flex items-center justify-center">
              <Truck className="w-5 h-5 text-slate-400" />
            </div>
            <span className="text-xs text-slate-400 text-center">+{machines.length - 10}</span>
          </button>
        )}
      </div>
    </div>
  );
});

MachineStoryRings.displayName = 'MachineStoryRings';
export default MachineStoryRings;
