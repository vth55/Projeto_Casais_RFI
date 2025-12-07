import React from 'react';
import { Loader2 } from 'lucide-react';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  className = '',
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary:
      'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 focus:ring-primary-500 shadow-md hover:shadow-lg',
    secondary:
      'bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300 focus:ring-slate-500 border border-slate-300',
    danger:
      'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 focus:ring-red-500 shadow-md hover:shadow-lg',
    ghost:
      'bg-transparent text-slate-600 hover:bg-slate-100 active:bg-slate-200 focus:ring-slate-500',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className={`${iconSizes[size]} animate-spin`} />
          <span>A carregar...</span>
        </>
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className={iconSizes[size]} />}
          {children}
          {Icon && iconPosition === 'right' && <Icon className={iconSizes[size]} />}
        </>
      )}
    </button>
  );
};

export default Button;
