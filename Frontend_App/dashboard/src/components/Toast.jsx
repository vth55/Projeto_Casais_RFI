import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const Toast = ({ type = 'info', message, onClose, duration = 3000 }) => {
  useEffect(() => {
    if (duration && onClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const config = {
    success: {
      icon: CheckCircle,
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-500',
      textColor: 'text-emerald-800',
      iconColor: 'text-emerald-600',
    },
    error: {
      icon: XCircle,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-500',
      textColor: 'text-red-800',
      iconColor: 'text-red-600',
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-500',
      textColor: 'text-orange-800',
      iconColor: 'text-orange-600',
    },
    info: {
      icon: Info,
      bgColor: 'bg-primary-50',
      borderColor: 'border-primary-500',
      textColor: 'text-primary-800',
      iconColor: 'text-primary-500',
    },
  };

  const { icon: Icon, bgColor, borderColor, textColor, iconColor } = config[type];

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 ${bgColor} border-l-4 ${borderColor} p-4 rounded-r-lg shadow-lg max-w-md animate-slide-in`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${iconColor} flex-shrink-0 mt-0.5`} />
        <p className={`${textColor} font-medium flex-1`}>{message}</p>
        {onClose && (
          <button onClick={onClose} className={`${textColor} hover:opacity-70 transition-opacity`}>
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Toast;
