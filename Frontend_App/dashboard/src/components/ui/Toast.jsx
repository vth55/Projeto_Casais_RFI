import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const styles = {
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800',
    icon: 'text-emerald-500',
    text: 'text-emerald-800 dark:text-emerald-200',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800',
    icon: 'text-red-500',
    text: 'text-red-800 dark:text-red-200',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800',
    icon: 'text-amber-500',
    text: 'text-amber-800 dark:text-amber-200',
  },
  info: {
    bg: 'bg-sky-50 dark:bg-sky-900/30 border-sky-200 dark:border-sky-800',
    icon: 'text-sky-500',
    text: 'text-sky-800 dark:text-sky-200',
  },
};

const Toast = ({
  type = 'info',
  title,
  message,
  duration = 5000,
  onClose,
  action,
  actionLabel,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);

  const Icon = icons[type];
  const style = styles[type];

  const handleClose = useCallback(() => {
    setIsLeaving(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 200);
  }, [onClose]);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, handleClose]);

  if (!isVisible) return null;

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-xl border shadow-lg
        ${style.bg}
        ${isLeaving ? 'animate-fade-out' : 'animate-slide-in'}
        max-w-md w-full
      `}
    >
      <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${style.icon}`} />
      <div className="flex-1 min-w-0">
        {title && (
          <p className={`font-semibold text-sm ${style.text}`}>{title}</p>
        )}
        {message && (
          <p className={`text-sm mt-0.5 ${style.text} opacity-80`}>{message}</p>
        )}
        {action && (
          <button
            onClick={action}
            className={`text-sm font-medium mt-2 hover:underline ${style.text}`}
          >
            {actionLabel || 'Ver mais'}
          </button>
        )}
      </div>
      <button
        onClick={handleClose}
        className={`p-1 rounded-lg hover:bg-black/5 transition-colors ${style.text} opacity-50 hover:opacity-100`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// Container para toasts
const ToastContainer = ({ children }) => (
  <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
    {children}
  </div>
);

export { Toast as default, ToastContainer };
