import React from 'react';
import { Calendar, Clock } from 'lucide-react';

const DateFilter = ({ selectedFilter, onFilterChange }) => {
  const filters = [
    { id: 'all', label: 'Tudo', icon: Clock },
    { id: 'today', label: 'Hoje', icon: Calendar },
    { id: 'week', label: 'Esta Semana', icon: Calendar },
    { id: 'month', label: 'Este Mês', icon: Calendar },
  ];

  return (
    <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
      <span className="text-xs font-bold text-slate-500 uppercase px-2">Período:</span>
      <div className="flex gap-1">
        {filters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => {
              onFilterChange(filter.id);
              console.log(`Filtro alterado: ${filter.id}`);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all ${
              selectedFilter === filter.id
                ? 'bg-primary-500 text-white shadow-md'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <filter.icon className="w-3.5 h-3.5" />
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default DateFilter;
