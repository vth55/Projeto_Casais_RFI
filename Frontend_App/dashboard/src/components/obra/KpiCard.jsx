import React, { useEffect, useState, useRef, memo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { calculateRAGStatus } from '../../utils/chartDataHelpers';

const RAG_STYLES = {
  green: { dot: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', title: 'Dentro do objectivo' },
  amber: { dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',         title: 'Abaixo do esperado' },
  red:   { dot: 'bg-red-400',     badge: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',                 title: 'Requer atenção' },
};

const KpiCard = ({
  label,
  value,
  unit = '',
  icon: Icon,
  color = 'slate',
  previousValue,
  ragThresholds,
  ragInvert = false,
  loading = false,
  description,
  className = '',
}) => {
  const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;
  const [displayValue, setDisplayValue] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    if (loading) return;
    if (numericValue === displayValue) { setDisplayValue(numericValue); return; }

    const duration = 600;
    const from = displayValue;
    const diff = numericValue - from;

    const animate = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const t = Math.min((ts - startRef.current) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplayValue(from + diff * ease);
      if (t < 1) rafRef.current = requestAnimationFrame(animate);
      else { setDisplayValue(numericValue); startRef.current = null; }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(rafRef.current); startRef.current = null; };
  }, [numericValue, loading]);

  const fmt = (v) => {
    if (typeof value === 'string' && isNaN(parseFloat(value))) return value;
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
    return String(Math.round(v * 10) / 10);
  };

  const rag = ragThresholds ? calculateRAGStatus(numericValue, ragThresholds, ragInvert) : null;
  const ragStyle = rag ? RAG_STYLES[rag] : null;

  let deltaPercent = null;
  let deltaPositive = null;
  if (previousValue != null && previousValue !== 0) {
    deltaPercent = Math.round(((numericValue - previousValue) / Math.abs(previousValue)) * 100);
    deltaPositive = ragInvert ? deltaPercent < 0 : deltaPercent > 0;
  }

  if (loading) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 md:p-5 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-24" />
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-20" />
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-16" />
        </div>
      </div>
    );
  }

  const iconColorMap = {
    primary: 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
  };

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 md:p-5 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconColorMap[color] || iconColorMap.slate}`}>
              <Icon className="w-4.5 h-4.5 w-[18px] h-[18px]" />
            </div>
          )}
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-tight">{label}</span>
        </div>
        {rag && (
          <div className="flex items-center gap-1.5" title={ragStyle.title}>
            <div className={`w-2 h-2 rounded-full ${ragStyle.dot}`} />
          </div>
        )}
      </div>

      <div className="flex items-end justify-between">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tabular-nums leading-none">
            {fmt(displayValue)}
          </span>
          {unit && <span className="text-sm font-medium text-slate-400 dark:text-slate-500">{unit}</span>}
        </div>

        {deltaPercent !== null && (
          <div className={`flex items-center gap-0.5 px-2 py-1 rounded-full text-xs font-semibold ${
            deltaPositive
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {deltaPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {deltaPercent > 0 ? '+' : ''}{deltaPercent}%
          </div>
        )}
      </div>

      {description && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">{description}</p>
      )}
    </div>
  );
};

export default memo(KpiCard);
