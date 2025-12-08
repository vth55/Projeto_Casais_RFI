import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const colorSchemes = {
  primary: {
    bg: 'bg-primary-50',
    icon: 'text-primary-600',
    accent: 'text-primary-600',
  },
  emerald: {
    bg: 'bg-emerald-50',
    icon: 'text-emerald-600',
    accent: 'text-emerald-600',
  },
  amber: {
    bg: 'bg-amber-50',
    icon: 'text-amber-600',
    accent: 'text-amber-600',
  },
  red: {
    bg: 'bg-red-50',
    icon: 'text-red-600',
    accent: 'text-red-600',
  },
  slate: {
    bg: 'bg-slate-100',
    icon: 'text-slate-600',
    accent: 'text-slate-600',
  },
  violet: {
    bg: 'bg-violet-50',
    icon: 'text-violet-600',
    accent: 'text-violet-600',
  },
};

const StatCard = ({
  title,
  value,
  unit = '',
  icon: Icon,
  color = 'primary',
  trend,
  trendLabel,
  loading = false,
  className = '',
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const scheme = colorSchemes[color] || colorSchemes.primary;
  const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;

  // Animação de contagem
  useEffect(() => {
    if (loading) return;

    const duration = 1000;
    const steps = 30;
    const increment = numericValue / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current += increment;
      if (step >= steps) {
        setDisplayValue(numericValue);
        clearInterval(timer);
      } else {
        setDisplayValue(current);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [numericValue, loading]);

  const formatValue = (val) => {
    if (typeof value === 'string' && isNaN(parseFloat(value))) return value;
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
    return val.toFixed(val % 1 === 0 ? 0 : 1);
  };

  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-red-600' : 'text-slate-400';

  if (loading) {
    return (
      <div className={`bg-white rounded-xl border border-slate-200/60 p-6 shadow-sm ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-slate-200 rounded-lg" />
            <div className="h-4 bg-slate-200 rounded w-24" />
          </div>
          <div className="h-8 bg-slate-200 rounded w-20 mb-2" />
          <div className="h-3 bg-slate-200 rounded w-16" />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl border border-slate-200/60 p-6 shadow-sm hover:shadow-md transition-shadow duration-300 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        {Icon && (
          <div className={`w-10 h-10 ${scheme.bg} rounded-lg flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${scheme.icon}`} />
          </div>
        )}
        <span className="text-sm font-medium text-slate-500">{title}</span>
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-bold text-slate-900 tabular-nums">
          {formatValue(displayValue)}
        </span>
        {unit && (
          <span className="text-sm font-medium text-slate-400">{unit}</span>
        )}
      </div>

      {(trend !== undefined || trendLabel) && (
        <div className="flex items-center gap-1.5 mt-3">
          {trend !== undefined && (
            <div className={`flex items-center gap-0.5 ${trendColor}`}>
              <TrendIcon className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">
                {Math.abs(trend)}%
              </span>
            </div>
          )}
          {trendLabel && (
            <span className="text-xs text-slate-400">{trendLabel}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default StatCard;
