import React from 'react';
import {
  Inbox,
  Search,
  FileQuestion,
  AlertCircle,
  Plus,
  RefreshCw
} from 'lucide-react';
import Button from './Button';

/**
 * EmptyState - Componente para estados vazios/sem dados
 * Nível: Enterprise
 */
const EmptyState = ({
  variant = 'default',
  title,
  description,
  icon: CustomIcon,
  action,
  actionLabel,
  secondaryAction,
  secondaryLabel,
  className = '',
}) => {
  const variants = {
    default: {
      icon: Inbox,
      title: 'Sem dados',
      description: 'Não há informações para mostrar de momento.',
      color: 'slate',
    },
    search: {
      icon: Search,
      title: 'Sem resultados',
      description: 'Não foram encontrados resultados para a sua pesquisa.',
      color: 'slate',
    },
    error: {
      icon: AlertCircle,
      title: 'Erro ao carregar',
      description: 'Ocorreu um erro ao carregar os dados. Tente novamente.',
      color: 'red',
    },
    noData: {
      icon: FileQuestion,
      title: 'Ainda não há dados',
      description: 'Comece por adicionar o primeiro registo.',
      color: 'primary',
    },
  };

  const config = variants[variant] || variants.default;
  const Icon = CustomIcon || config.icon;

  const colorClasses = {
    slate: {
      bg: 'bg-slate-100',
      icon: 'text-slate-400',
      ring: 'ring-slate-200',
    },
    primary: {
      bg: 'bg-primary-50',
      icon: 'text-primary-400',
      ring: 'ring-primary-200',
    },
    red: {
      bg: 'bg-red-50',
      icon: 'text-red-400',
      ring: 'ring-red-200',
    },
  };

  const colors = colorClasses[config.color] || colorClasses.slate;

  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 ${className}`}>
      {/* Ícone com animação */}
      <div
        className={`
          relative w-20 h-20 rounded-full ${colors.bg}
          flex items-center justify-center
          ring-8 ${colors.ring} ring-opacity-50
          mb-6 animate-fade-in
        `}
      >
        <Icon className={`w-10 h-10 ${colors.icon}`} />

        {/* Círculos decorativos */}
        <div className="absolute -inset-4 rounded-full border border-dashed border-slate-200 animate-spin-slow" />
      </div>

      {/* Texto */}
      <h3 className="text-xl font-bold text-slate-800 mb-2 text-center">
        {title || config.title}
      </h3>
      <p className="text-slate-500 text-center max-w-sm mb-6">
        {description || config.description}
      </p>

      {/* Ações */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {action && (
          <Button
            variant="primary"
            onClick={action}
            icon={Plus}
          >
            {actionLabel || 'Adicionar'}
          </Button>
        )}
        {secondaryAction && (
          <Button
            variant="secondary"
            onClick={secondaryAction}
            icon={RefreshCw}
          >
            {secondaryLabel || 'Atualizar'}
          </Button>
        )}
      </div>
    </div>
  );
};

// Variantes pré-configuradas para uso rápido
export const NoDataState = (props) => <EmptyState variant="noData" {...props} />;
export const SearchEmptyState = (props) => <EmptyState variant="search" {...props} />;
export const ErrorState = (props) => <EmptyState variant="error" {...props} />;

export default EmptyState;
