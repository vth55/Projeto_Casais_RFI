import React from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

const Table = ({ children, className = '' }) => (
  <div className={`overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 ${className}`}>
    <table className="w-full text-sm">
      {children}
    </table>
  </div>
);

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
      ${onClick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50' : ''}
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
