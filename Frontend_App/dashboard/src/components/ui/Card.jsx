import React from 'react';

const Card = ({
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
    bg-white rounded-xl border border-slate-200/60
    ${hover ? 'hover:shadow-lg hover:border-slate-300/60 transition-all duration-300 cursor-pointer' : 'shadow-sm'}
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
};

// Card Header
Card.Header = ({ children, className = '', action }) => (
  <div className={`flex items-center justify-between mb-6 ${className}`}>
    <div>{children}</div>
    {action && <div>{action}</div>}
  </div>
);

// Card Title
Card.Title = ({ children, className = '' }) => (
  <h3 className={`text-lg font-semibold text-slate-900 ${className}`}>
    {children}
  </h3>
);

// Card Description
Card.Description = ({ children, className = '' }) => (
  <p className={`text-sm text-slate-500 mt-1 ${className}`}>
    {children}
  </p>
);

// Card Content
Card.Content = ({ children, className = '' }) => (
  <div className={className}>{children}</div>
);

// Card Footer
Card.Footer = ({ children, className = '' }) => (
  <div className={`mt-6 pt-4 border-t border-slate-100 ${className}`}>
    {children}
  </div>
);

export default Card;
