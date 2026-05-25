import React, { useState } from 'react';
import { ChevronDown, GitCompare } from 'lucide-react';

const PRESETS = [
  { id: 'today',   label: 'Hoje' },
  { id: 'week',    label: 'Semana' },
  { id: 'month',   label: 'Mês' },
  { id: 'quarter', label: 'Trimestre' },
  { id: 'custom',  label: 'Personalizado' },
];

const PeriodHeader = ({
  preset = 'month',
  onPresetChange,
  customRange = null,
  onCustomRangeChange,
  showComparison = false,
  onToggleComparison,
}) => {
  const [showCustom, setShowCustom] = useState(preset === 'custom');

  const handlePreset = (id) => {
    onPresetChange?.(id);
    setShowCustom(id === 'custom');
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-4 py-2.5 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-1 flex-wrap">
        {PRESETS.map(p => (
          <button
            key={p.id}
            onClick={() => handlePreset(p.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
              preset === p.id
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            {p.label}
          </button>
        ))}

        {showCustom && (
          <div className="flex items-center gap-1.5 ml-1">
            <input
              type="date"
              value={customRange?.start || ''}
              onChange={e => onCustomRangeChange?.({ ...customRange, start: e.target.value })}
              className="text-xs border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
            <span className="text-xs text-slate-400">→</span>
            <input
              type="date"
              value={customRange?.end || ''}
              onChange={e => onCustomRangeChange?.({ ...customRange, end: e.target.value })}
              className="text-xs border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
        )}
      </div>

      {onToggleComparison && (
        <button
          onClick={onToggleComparison}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
            showComparison
              ? 'bg-primary-50 text-primary-700 border border-primary-200 dark:bg-primary-900/30 dark:text-primary-400 dark:border-primary-700'
              : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
          }`}
        >
          <GitCompare className="w-3.5 h-3.5" />
          vs período anterior
        </button>
      )}
    </div>
  );
};

export default PeriodHeader;
