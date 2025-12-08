import React from 'react';

const Skeleton = ({ className = '', variant = 'text' }) => {
  const baseStyles = 'animate-pulse bg-slate-200 rounded';

  const variants = {
    text: 'h-4 w-full',
    title: 'h-6 w-3/4',
    avatar: 'h-10 w-10 rounded-full',
    button: 'h-10 w-24 rounded-lg',
    card: 'h-32 w-full rounded-xl',
    stat: 'h-24 w-full rounded-xl',
  };

  return (
    <div className={`${baseStyles} ${variants[variant]} ${className}`} />
  );
};

// Skeleton para StatCard
Skeleton.Stat = ({ className = '' }) => (
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

// Skeleton para Card genérico
Skeleton.Card = ({ lines = 3, className = '' }) => (
  <div className={`bg-white rounded-xl border border-slate-200/60 p-6 shadow-sm ${className}`}>
    <div className="animate-pulse space-y-4">
      <div className="h-5 bg-slate-200 rounded w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-slate-200 rounded"
          style={{ width: `${100 - i * 15}%` }}
        />
      ))}
    </div>
  </div>
);

// Skeleton para Table row
Skeleton.TableRow = ({ columns = 4 }) => (
  <tr className="animate-pulse">
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className="h-4 bg-slate-200 rounded w-full" />
      </td>
    ))}
  </tr>
);

// Skeleton para lista
Skeleton.List = ({ items = 5, className = '' }) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="animate-pulse flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
        <div className="w-10 h-10 bg-slate-200 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-200 rounded w-1/3" />
          <div className="h-3 bg-slate-200 rounded w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

export default Skeleton;
