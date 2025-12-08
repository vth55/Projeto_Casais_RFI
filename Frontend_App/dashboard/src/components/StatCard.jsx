import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * StatCard - Componente de estatística com animação de contagem
 * Nível: Enterprise
 */
const StatCard = ({
  title,
  value,
  unit,
  icon: Icon,
  colorClass,
  trend,
  trendValue,
  loading = false,
  animate = true,
  prefix = '',
  suffix = '',
  decimals = 0,
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef(null);

  // Animação de contagem quando o card fica visível
  useEffect(() => {
    if (!animate || loading) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [animate, loading]);

  // Animação de contagem
  useEffect(() => {
    if (!isVisible || loading) return;

    const numValue = parseFloat(value) || 0;
    const duration = 1500;
    const steps = 60;
    const stepDuration = duration / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = numValue * easeOut;

      setDisplayValue(decimals > 0 ? current.toFixed(decimals) : Math.round(current));

      if (currentStep >= steps) {
        clearInterval(timer);
        setDisplayValue(value);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [isVisible, value, loading, decimals]);

  const getColorFromClass = (colorClass) => {
    if (colorClass?.includes('primary')) return 'primary';
    if (colorClass?.includes('emerald')) return 'emerald';
    if (colorClass?.includes('orange')) return 'orange';
    if (colorClass?.includes('red')) return 'red';
    if (colorClass?.includes('slate')) return 'slate';
    return 'primary';
  };

  const color = getColorFromClass(colorClass);

  const colorMap = {
    primary: {
      bg: 'bg-gradient-to-br from-primary-50 to-primary-100',
      border: 'border-primary-200',
      icon: 'text-primary-600',
      iconBg: 'bg-primary-100',
      value: 'text-primary-700',
      glow: 'shadow-primary-500/20',
    },
    emerald: {
      bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100',
      border: 'border-emerald-200',
      icon: 'text-emerald-600',
      iconBg: 'bg-emerald-100',
      value: 'text-emerald-700',
      glow: 'shadow-emerald-500/20',
    },
    orange: {
      bg: 'bg-gradient-to-br from-orange-50 to-orange-100',
      border: 'border-orange-200',
      icon: 'text-orange-600',
      iconBg: 'bg-orange-100',
      value: 'text-orange-700',
      glow: 'shadow-orange-500/20',
    },
    red: {
      bg: 'bg-gradient-to-br from-red-50 to-red-100',
      border: 'border-red-200',
      icon: 'text-red-600',
      iconBg: 'bg-red-100',
      value: 'text-red-700',
      glow: 'shadow-red-500/20',
    },
    slate: {
      bg: 'bg-gradient-to-br from-slate-50 to-slate-100',
      border: 'border-slate-200',
      icon: 'text-slate-600',
      iconBg: 'bg-slate-100',
      value: 'text-slate-700',
      glow: 'shadow-slate-500/20',
    },
  };

  const colors = colorMap[color] || colorMap.primary;

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  // Loading state
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 animate-pulse">
        <div className="flex justify-between items-start">
          <div className="flex-1 space-y-3">
            <div className="h-3 bg-slate-200 rounded w-20" />
            <div className="h-8 bg-slate-200 rounded w-32" />
            <div className="h-3 bg-slate-200 rounded w-16" />
          </div>
          <div className="w-14 h-14 bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className={`
        group relative bg-white p-6 rounded-xl shadow-md border border-slate-200
        hover:shadow-xl hover:${colors.glow} hover:-translate-y-1
        transition-all duration-300 ease-out overflow-hidden
        cursor-default select-none
      `}
    >
      {/* Background gradient on hover */}
      <div
        className={`
          absolute inset-0 ${colors.bg} opacity-0
          group-hover:opacity-100 transition-opacity duration-500
        `}
      />

      {/* Shine effect on hover */}
      <div
        className="
          absolute inset-0 opacity-0 group-hover:opacity-100
          bg-gradient-to-r from-transparent via-white/20 to-transparent
          -translate-x-full group-hover:translate-x-full
          transition-all duration-1000 ease-out
        "
      />

      <div className="relative flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2 truncate">
            {title}
          </p>

          <h3 className={`text-3xl font-extrabold ${colors.value} mb-1 tabular-nums`}>
            {prefix}
            {animate ? displayValue : value}
            {suffix && <span className="text-2xl">{suffix}</span>}
            {unit && (
              <span className="text-base text-slate-500 font-semibold ml-1">{unit}</span>
            )}
          </h3>

          {trend && trendValue && (
            <div
              className={`
                inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-semibold
                ${
                  trend === 'up'
                    ? 'text-emerald-700 bg-emerald-100'
                    : trend === 'down'
                      ? 'text-red-700 bg-red-100'
                      : 'text-slate-600 bg-slate-100'
                }
              `}
            >
              <TrendIcon className="w-3 h-3" />
              <span>{trendValue}</span>
            </div>
          )}
        </div>

        <div
          className={`
            p-3.5 rounded-xl ${colors.iconBg}
            group-hover:scale-110 transition-all duration-300
            shadow-sm
          `}
        >
          <Icon className={`w-7 h-7 ${colors.icon}`} />
        </div>
      </div>
    </div>
  );
};

export default StatCard;
