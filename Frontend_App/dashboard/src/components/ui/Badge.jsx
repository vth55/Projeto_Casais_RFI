import React from 'react';

const variants = {
  default: 'bg-slate-100 text-slate-700',
  primary: 'bg-primary-100 text-primary-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-sky-100 text-sky-700',
};

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  icon: Icon,
  className = '',
}) => {
  const dotColors = {
    default: 'bg-slate-400',
    primary: 'bg-primary-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    info: 'bg-sky-500',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium rounded-full
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />
      )}
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
    </span>
  );
};

// Status Badge específico para estados de sessão/máquina
const StatusBadge = ({ status }) => {
  const statusConfig = {
    ACTIVE: { label: 'Ativo', variant: 'success', dot: true },
    OPEN: { label: 'Em curso', variant: 'success', dot: true },
    IDLE: { label: 'Parado', variant: 'default', dot: true },
    CLOSED: { label: 'Fechado', variant: 'default', dot: false },
    MAINTENANCE: { label: 'Manutenção', variant: 'warning', dot: true },
    ERROR: { label: 'Erro', variant: 'danger', dot: true },
    PENDING: { label: 'Pendente', variant: 'warning', dot: true },
    VALIDATED: { label: 'Validado', variant: 'success', dot: false },
  };

  const config = statusConfig[status] || { label: status, variant: 'default', dot: false };

  return (
    <Badge variant={config.variant} dot={config.dot}>
      {config.label}
    </Badge>
  );
};

export { Badge as default, StatusBadge };
