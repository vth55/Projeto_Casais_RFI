import React, { memo } from 'react';

const Card = memo(({
  children,
  className = '',
  padding = 'md',
  hover = false,
  onClick,
  ...props
}) => {
  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const baseStyles = `
    bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/60
    ${hover ? 'hover:shadow-lg hover:border-slate-300/60 dark:hover:border-slate-600 transition-all duration-300 cursor-pointer' : 'shadow-sm'}
  `;

  return (
    <div
      className={`${baseStyles} ${paddingStyles[padding]} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
});

// Card Header
Card.Header = ({ children, className = '', action }) => (
  <div className={`flex items-center justify-between mb-6 ${className}`}>
    <div>{children}</div>
    {action && <div>{action}</div>}
  </div>
);

// Card Title
Card.Title = ({ children, className = '' }) => (
  <h3 className={`text-lg font-semibold text-slate-900 dark:text-white ${className}`}>
    {children}
  </h3>
);

// Card Description
Card.Description = ({ children, className = '' }) => (
  <p className={`text-sm text-slate-500 dark:text-slate-400 mt-1 ${className}`}>
    {children}
  </p>
);

// Card Content
Card.Content = ({ children, className = '' }) => (
  <div className={className}>{children}</div>
);

// Card Footer
Card.Footer = ({ children, className = '' }) => (
  <div className={`mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 ${className}`}>
    {children}
  </div>
);

export default Card;
