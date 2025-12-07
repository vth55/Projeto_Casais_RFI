import React from 'react';
import { AlertCircle } from 'lucide-react';

const Input = ({
  label,
  error,
  helperText,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  ...props
}) => {
  const baseClasses =
    'w-full px-4 py-2.5 text-sm border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0';

  const stateClasses = error
    ? 'border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50'
    : 'border-slate-300 focus:border-primary-500 focus:ring-primary-500 bg-white hover:border-slate-400';

  const iconPadding = Icon ? (iconPosition === 'left' ? 'pl-10' : 'pr-10') : '';

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
      )}
      <div className="relative">
        {Icon && iconPosition === 'left' && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        )}
        <input
          className={`${baseClasses} ${stateClasses} ${iconPadding} ${className}`}
          {...props}
        />
        {Icon && iconPosition === 'right' && (
          <Icon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        )}
        {error && (
          <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
        )}
      </div>
      {(error || helperText) && (
        <p className={`mt-1.5 text-xs ${error ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
          {error || helperText}
        </p>
      )}
    </div>
  );
};

export default Input;
