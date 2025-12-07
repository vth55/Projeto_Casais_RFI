import React from 'react';

const StatCard = ({ title, value, unit, icon: Icon, colorClass, trend, trendValue }) => {
  const getColorFromClass = (colorClass) => {
    if (colorClass.includes('primary')) return 'primary';
    if (colorClass.includes('emerald')) return 'emerald';
    if (colorClass.includes('orange')) return 'orange';
    if (colorClass.includes('red')) return 'red';
    if (colorClass.includes('slate')) return 'slate';
    return 'primary';
  };

  const color = getColorFromClass(colorClass);
  const colorMap = {
    primary: {
      bg: 'bg-gradient-to-br from-primary-50 to-primary-100',
      icon: 'text-primary-600',
      iconBg: 'bg-primary-500',
      value: 'text-primary-700',
    },
    emerald: {
      bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100',
      icon: 'text-emerald-600',
      iconBg: 'bg-emerald-500',
      value: 'text-emerald-700',
    },
    orange: {
      bg: 'bg-gradient-to-br from-orange-50 to-orange-100',
      icon: 'text-orange-600',
      iconBg: 'bg-orange-500',
      value: 'text-orange-700',
    },
    red: {
      bg: 'bg-gradient-to-br from-red-50 to-red-100',
      icon: 'text-red-600',
      iconBg: 'bg-red-500',
      value: 'text-red-700',
    },
    slate: {
      bg: 'bg-gradient-to-br from-slate-50 to-slate-100',
      icon: 'text-slate-600',
      iconBg: 'bg-slate-500',
      value: 'text-slate-700',
    },
  };

  const colors = colorMap[color] || colorMap.primary;

  return (
    <div className="group relative bg-white p-6 rounded-xl shadow-md border border-slate-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
      <div
        className={`absolute inset-0 ${colors.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
      ></div>

      <div className="relative flex justify-between items-start">
        <div className="flex-1">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">{title}</p>
          <h3 className={`text-3xl font-extrabold ${colors.value} mb-1`}>
            {value} <span className="text-lg text-slate-500 font-semibold">{unit}</span>
          </h3>
          {trend && trendValue && (
            <div
              className={`flex items-center gap-1 mt-2 text-xs font-semibold ${
                trend === 'up'
                  ? 'text-emerald-600'
                  : trend === 'down'
                    ? 'text-red-600'
                    : 'text-slate-500'
              }`}
            >
              <span>{trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}</span>
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div
          className={`p-3.5 rounded-xl ${colors.iconBg} bg-opacity-10 group-hover:bg-opacity-20 transition-all duration-300`}
        >
          <Icon
            className={`w-7 h-7 ${colors.icon} group-hover:scale-110 transition-transform duration-300`}
          />
        </div>
      </div>
    </div>
  );
};

export default StatCard;
