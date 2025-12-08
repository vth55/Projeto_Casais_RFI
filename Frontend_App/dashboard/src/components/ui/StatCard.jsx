import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const colorSchemes = {
  primary: {
    gradient: 'from-primary-500 to-primary-600',
    bg: 'bg-primary-500',
    light: 'bg-primary-50',
    text: 'text-primary-600',
    border: 'border-primary-200',
  },
  emerald: {
    gradient: 'from-emerald-500 to-emerald-600',
    bg: 'bg-emerald-500',
    light: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-200',
  },
  amber: {
    gradient: 'from-amber-500 to-amber-600',
    bg: 'bg-amber-500',
    light: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-200',
  },
  red: {
    gradient: 'from-red-500 to-red-600',
    bg: 'bg-red-500',
    light: 'bg-red-50',
    text: 'text-red-600',
    border: 'border-red-200',
  },
  slate: {
    gradient: 'from-slate-600 to-slate-700',
    bg: 'bg-slate-600',
    light: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-200',
  },
  violet: {
    gradient: 'from-violet-500 to-violet-600',
    bg: 'bg-violet-500',
    light: 'bg-violet-50',
    text: 'text-violet-600',
    border: 'border-violet-200',
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
  variant = 'default', // 'default', 'gradient', 'outline'
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const scheme = colorSchemes[color] || colorSchemes.primary;
  const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;

  // Animação de contagem
  useEffect(() => {
    if (loading) return;

    const duration = 800;
    const steps = 20;
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
  const trendColor = trend > 0 ? 'text-emerald-500' : trend < 0 ? 'text-red-500' : 'text-slate-400';

  if (loading) {
    return (
      <div className={`bg-white rounded-2xl border border-slate-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-slate-200 rounded-xl" />
            <div className="h-4 bg-slate-200 rounded w-24" />
          </div>
          <div className="h-10 bg-slate-200 rounded w-24 mb-2" />
          <div className="h-3 bg-slate-200 rounded w-20" />
        </div>
      </div>
    );
  }

  // Variant: Gradient - card with colored gradient background
  if (variant === 'gradient') {
    return (
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${scheme.gradient} p-6 shadow-lg ${className}`}>
        {/* Background pattern */}
        <div className="absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8">
          <div className="absolute inset-0 bg-white/10 rounded-full" />
        </div>
        <div className="absolute bottom-0 left-0 w-24 h-24 transform -translate-x-6 translate-y-6">
          <div className="absolute inset-0 bg-black/5 rounded-full" />
        </div>

        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            {Icon && (
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Icon className="w-6 h-6 text-white" />
              </div>
            )}
            {trend !== undefined && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${trend >= 0 ? 'bg-white/20' : 'bg-red-500/30'}`}>
                <TrendIcon className="w-3.5 h-3.5 text-white" />
                <span className="text-xs font-semibold text-white">
                  {Math.abs(trend)}%
                </span>
              </div>
            )}
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-white tabular-nums">
              {formatValue(displayValue)}
            </span>
            {unit && (
              <span className="text-lg font-medium text-white/70">{unit}</span>
            )}
          </div>

          <p className="text-sm font-medium text-white/80 mt-2">{title}</p>
          {trendLabel && (
            <p className="text-xs text-white/60 mt-1">{trendLabel}</p>
          )}
        </div>
      </div>
    );
  }

  // Variant: Outline - card with colored left border
  if (variant === 'outline') {
    return (
      <div className={`bg-white rounded-2xl border-l-4 ${scheme.border} border border-slate-200 p-6 hover:shadow-lg transition-shadow duration-300 ${className}`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-2">{title}</p>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-3xl font-bold ${scheme.text} tabular-nums`}>
                {formatValue(displayValue)}
              </span>
              {unit && (
                <span className="text-sm font-medium text-slate-400">{unit}</span>
              )}
            </div>
            {(trend !== undefined || trendLabel) && (
              <div className="flex items-center gap-2 mt-3">
                {trend !== undefined && (
                  <div className={`flex items-center gap-0.5 ${trendColor}`}>
                    <TrendIcon className="w-4 h-4" />
                    <span className="text-sm font-semibold">{Math.abs(trend)}%</span>
                  </div>
                )}
                {trendLabel && (
                  <span className="text-xs text-slate-400">{trendLabel}</span>
                )}
              </div>
            )}
          </div>
          {Icon && (
            <div className={`w-14 h-14 ${scheme.light} rounded-2xl flex items-center justify-center`}>
              <Icon className={`w-7 h-7 ${scheme.text}`} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default variant - clean card with icon
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg hover:border-slate-300 transition-all duration-300 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            {Icon && (
              <div className={`w-11 h-11 ${scheme.light} rounded-xl flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${scheme.text}`} />
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
        </div>

        {trend !== undefined && (
          <div className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full ${
            trend > 0 ? 'bg-emerald-50' : trend < 0 ? 'bg-red-50' : 'bg-slate-100'
          }`}>
            <TrendIcon className={`w-3.5 h-3.5 ${trendColor}`} />
            <span className={`text-xs font-semibold ${trendColor}`}>
              {Math.abs(trend)}%
            </span>
          </div>
        )}
      </div>

      {trendLabel && (
        <p className="text-xs text-slate-400 mt-3">{trendLabel}</p>
      )}
    </div>
  );
};

export default StatCard;
