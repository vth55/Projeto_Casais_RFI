import React, { forwardRef } from 'react';

/**
 * Card - Componente de container profissional
 * Nível: Enterprise
 */
const Card = forwardRef(({
  children,
  variant = 'default',
  header,
  headerAction,
  footer,
  className = '',
  hover = false,
  loading = false,
  noPadding = false,
  onClick,
  as: Component = 'div',
  ...props
}, ref) => {
  const baseClasses = 'bg-white rounded-xl transition-all duration-300';

  const variants = {
    default: 'shadow-sm border border-slate-200',
    elevated: 'shadow-lg border border-slate-100',
    outlined: 'border-2 border-slate-200 shadow-none',
    flat: 'shadow-none border-none bg-slate-50',
    gradient: 'shadow-lg border-0 bg-gradient-to-br from-white to-slate-50',
    glass: 'glass shadow-lg backdrop-blur-sm',
  };

  const hoverClasses = hover
    ? 'hover:shadow-xl hover:border-primary-200 hover:-translate-y-1 cursor-pointer'
    : '';

  const clickableClasses = onClick
    ? 'cursor-pointer active:scale-[0.99]'
    : '';

  if (loading) {
    return (
      <div className={`${baseClasses} ${variants[variant]} ${className} animate-pulse`}>
        <div className="p-6 space-y-4">
          <div className="h-4 bg-slate-200 rounded w-1/3" />
          <div className="space-y-2">
            <div className="h-3 bg-slate-200 rounded w-full" />
            <div className="h-3 bg-slate-200 rounded w-5/6" />
            <div className="h-3 bg-slate-200 rounded w-4/6" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Component
      ref={ref}
      className={`
        ${baseClasses}
        ${variants[variant]}
        ${hoverClasses}
        ${clickableClasses}
        ${className}
      `}
      onClick={onClick}
      {...props}
    >
      {header && (
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/50 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {typeof header === 'string' ? (
                <h3 className="font-semibold text-slate-800">{header}</h3>
              ) : (
                header
              )}
            </div>
            {headerAction && (
              <div className="ml-4 flex-shrink-0">
                {headerAction}
              </div>
            )}
          </div>
        </div>
      )}

      <div className={noPadding ? '' : header || footer ? 'px-6 py-5' : 'p-6'}>
        {children}
      </div>

      {footer && (
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-xl">
          {typeof footer === 'string' ? (
            <p className="text-sm text-slate-500">{footer}</p>
          ) : (
            footer
          )}
        </div>
      )}
    </Component>
  );
});

Card.displayName = 'Card';

// Variantes pré-configuradas
export const ElevatedCard = (props) => <Card variant="elevated" {...props} />;
export const GlassCard = (props) => <Card variant="glass" {...props} />;
export const InteractiveCard = (props) => <Card variant="elevated" hover {...props} />;

export default Card;
