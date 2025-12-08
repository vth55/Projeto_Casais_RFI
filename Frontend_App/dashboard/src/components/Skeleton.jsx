import React from 'react';

/**
 * Skeleton - Componente de loading state profissional
 * Usado para mostrar placeholders enquanto dados carregam
 */

const Skeleton = ({
  variant = 'text',
  width,
  height,
  className = '',
  animate = true
}) => {
  const baseClasses = `bg-slate-200 rounded ${animate ? 'animate-pulse' : ''}`;

  const variants = {
    text: 'h-4 w-full rounded',
    title: 'h-6 w-3/4 rounded',
    avatar: 'h-10 w-10 rounded-full',
    thumbnail: 'h-20 w-20 rounded-lg',
    card: 'h-32 w-full rounded-xl',
    button: 'h-10 w-24 rounded-lg',
    stat: 'h-24 w-full rounded-xl',
  };

  const style = {
    width: width || undefined,
    height: height || undefined,
  };

  return (
    <div
      className={`${baseClasses} ${variants[variant]} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
};

// Skeleton para StatCard
export const StatCardSkeleton = () => (
  <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
    <div className="flex justify-between items-start">
      <div className="flex-1 space-y-3">
        <Skeleton variant="text" width="60%" height="12px" />
        <Skeleton variant="title" width="80%" height="32px" />
        <Skeleton variant="text" width="40%" height="14px" />
      </div>
      <Skeleton variant="avatar" width="48px" height="48px" className="rounded-xl" />
    </div>
  </div>
);

// Skeleton para Card genérico
export const CardSkeleton = ({ lines = 3 }) => (
  <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 space-y-4">
    <div className="flex items-center gap-3">
      <Skeleton variant="avatar" />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" width="50%" />
        <Skeleton variant="text" width="30%" />
      </div>
    </div>
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} variant="text" width={i === lines - 1 ? '60%' : '100%'} />
      ))}
    </div>
  </div>
);

// Skeleton para tabela
export const TableRowSkeleton = ({ columns = 5 }) => (
  <tr className="border-b border-slate-100">
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <Skeleton variant="text" width={i === 0 ? '80%' : '60%'} />
      </td>
    ))}
  </tr>
);

// Skeleton para gráfico
export const ChartSkeleton = () => (
  <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton variant="title" width="150px" />
          <Skeleton variant="text" width="100px" />
        </div>
        <Skeleton variant="button" />
      </div>
      <div className="h-64 flex items-end justify-around gap-2 pt-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton
            key={i}
            width="40px"
            height={`${Math.random() * 60 + 40}%`}
            className="rounded-t-lg"
          />
        ))}
      </div>
    </div>
  </div>
);

export default Skeleton;
