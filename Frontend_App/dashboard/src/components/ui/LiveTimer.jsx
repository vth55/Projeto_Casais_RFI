import React, { useState, useEffect, memo } from 'react';

/**
 * LiveTimer — conta o tempo desde uma data de início, atualizando cada segundo.
 * Formato: HH:MM ou HH:MM:SS (prop showSeconds)
 */
const LiveTimer = ({ startTime, showSeconds = false, className = '', warningAfterHours = 5 }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = startTime?.toDate?.() || new Date(startTime);
    if (!start || isNaN(start)) return;

    const tick = () => setElapsed(Date.now() - start.getTime());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime]);

  const totalSeconds = Math.floor(elapsed / 1000);
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
