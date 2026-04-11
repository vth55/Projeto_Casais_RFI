import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

/**
 * Table — responsive data table com scroll horizontal nativo no mobile.
 *
 * No mobile (<768px):
 *  - A tabela não encolhe abaixo de `minWidth` (default 640px)
 *  - Scroll horizontal com indicadores de sombra nas bordas
 *  - Touch scroll suave (momentum-based)
 *  - Primeira coluna pode ficar sticky via `stickyFirst` prop
 *
 * No desktop:
 *  - Tabela ocupa 100% da largura como habitual
 */

const Table = ({ children, className = '', stickyFirst = false, minWidth = 640 }) => {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      ro.disconnect();
    };
  }, [checkScroll]);

  return (
    <div className={`relative rounded-lg border border-slate-200 dark:border-slate-700 ${className}`}>
      {/* Scroll shadow indicators — só visíveis quando há overflow */}
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-6 z-10 pointer-events-none rounded-l-lg bg-gradient-to-r from-slate-100/80 dark:from-slate-800/80 to-transparent" />
      )}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-6 z-10 pointer-events-none rounded-r-lg bg-gradient-to-l from-slate-100/80 dark:from-slate-800/80 to-transparent" />
      )}

      <div
        ref={scrollRef}
        className="overflow-x-auto overscroll-x-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <table
          className={`w-full text-sm ${stickyFirst ? 'table-sticky-first' : ''}`}
          style={{ minWidth: `${minWidth}px` }}
        >
          {children}
        </table>
      </div>
    </div>
  );
};

Table.Head = ({ children }) => (
  <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
    {children}
  </thead>
);

Table.Body = ({ children }) => (
  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
    {children}
  </tbody>
);

Table.Row = ({ children, onClick, className = '' }) => (
  <tr
    className={`
      ${onClick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 active:bg-slate-100 dark:active:bg-slate-700/50' : ''}
      transition-colors
      ${className}
    `}
    onClick={onClick}
  >
    {children}
  </tr>
);

Table.Header = ({
  children,
  sortable = false,
  sorted,
  onSort,
  align = 'left',
  className = '',
}) => {
  const alignStyles = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  const SortIcon = sorted === 'asc' ? ChevronUp : sorted === 'desc' ? ChevronDown : ChevronsUpDown;

  return (
    <th
      className={`
        px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap
        ${alignStyles[align]}
        ${sortable ? 'cursor-pointer select-none hover:text-slate-900 dark:hover:text-white' : ''}
        ${className}
      `}
      onClick={sortable ? onSort : undefined}
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : ''}`}>
        {children}
        {sortable && (
          <SortIcon className={`w-4 h-4 ${sorted ? 'text-primary-500' : 'text-slate-400'}`} />
        )}
      </div>
    </th>
  );
};

Table.Cell = ({ children, align = 'left', className = '' }) => {
  const alignStyles = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <td className={`px-4 py-3 text-slate-700 dark:text-slate-300 ${alignStyles[align]} ${className}`}>
      {children}
    </td>
  );
};

// Empty state para tabela
Table.Empty = ({ message = 'Sem dados para mostrar', icon: Icon }) => (
  <tr>
    <td colSpan={100} className="py-12 text-center">
      <div className="flex flex-col items-center gap-2 text-slate-400">
        {Icon && <Icon className="w-8 h-8" />}
        <p className="text-sm">{message}</p>
      </div>
    </td>
  </tr>
);

export default Table;
