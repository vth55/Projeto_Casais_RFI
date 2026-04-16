import React, { useState, useEffect, memo } from 'react';

/**
 * LiveTimer — conta o tempo desde uma data de início.
 *
 * Props:
 * - startTime: Date | Timestamp | string
 * - tickMs: intervalo de atualização (default 60000 = 1min). Usa 1000 só em
 *   contextos de um único operador (performance: com 500 máquinas na vista
 *   global, 1s causaria re-renders massivos).
 * - showSeconds: se true formato HH:MM:SS, senão HH:MM
 * - warningAfterHours: a partir destas horas pinta em âmbar
 */
const LiveTimer = ({
  startTime,
  tickMs = 60000,
  showSeconds = false,
  warningAfterHours = 5,
  className = '',
}) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = startTime?.toDate?.() || new Date(startTime);
    if (!start || isNaN(start)) return;

    const tick = () => setElapsed(Date.now() - start.getTime());
    tick();
    const id = setInterval(tick, tickMs);
    return () => clearInterval(id);
  }, [startTime, tickMs]);

  const totalSeconds = Math.max(0, Math.floor(elapsed / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  const isWarning = h >= warningAfterHours;

  const formatted = showSeconds
    ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

  return (
    <span className={`tabular-nums font-bold ${isWarning ? 'text-amber-500' : ''} ${className}`}>
      {formatted}
    </span>
  );
};

export default memo(LiveTimer);
