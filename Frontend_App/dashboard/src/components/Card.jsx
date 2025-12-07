import React from 'react';

const Card = ({
  children,
  variant = 'default',
  header,
  footer,
  className = '',
  hover = false,
  ...props
}) => {
  const baseClasses = 'bg-white rounded-xl transition-all duration-200';

  const variants = {
    default: 'shadow-sm border border-slate-200',
    elevated: 'shadow-lg border border-slate-200',
    outlined: 'border-2 border-slate-200 shadow-none',
  };

  const hoverClasses = hover
    ? 'hover:shadow-xl hover:border-primary-200 hover:-translate-y-0.5'
    : '';

  return (
    <div className={`${baseClasses} ${variants[variant]} ${hoverClasses} ${className}`} {...props}>
      {header && (
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          {header}
        </div>
      )}
      <div className={header || footer ? 'px-6 py-6' : 'p-6'}>{children}</div>
      {footer && <div className="px-6 py-4 border-t border-slate-100 bg-slate-50">{footer}</div>}
    </div>
  );
};

export default Card;
