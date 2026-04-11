import React, { useState, useEffect, useRef } from 'react';
import { Plus, X } from 'lucide-react';

/**
 * FAB — Floating Action Button para mobile.
 * Esconde ao fazer scroll down, reaparece ao fazer scroll up.
 * Suporta ações secundárias via prop `actions`.
 */
const FAB = ({ onClick, actions = [], icon: Icon = Plus, label }) => {
  const [visible, setVisible] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const lastScrollY = useRef(0);
  const scrollContainer = useRef(null);

  useEffect(() => {
    // Encontrar o container de scroll (main)
    const container = document.querySelector('main');
    if (!container) return;
    scrollContainer.current = container;

    const handleScroll = () => {
      const currentY = container.scrollTop;
      if (currentY > lastScrollY.current + 8) {
        setVisible(false);
        setExpanded(false);
      } else if (currentY < lastScrollY.current - 4) {
        setVisible(true);
      }
      lastScrollY.current = currentY;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const handlePrimary = () => {
    if (actions.length > 0) {
      setExpanded(prev => !prev);
    } else {
      onClick?.();
    }
  };

  return (
    <>
      {/* Backdrop quando expandido */}
      {expanded && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setExpanded(false)}
        />
      )}

      <div
        className={`
          fixed bottom-20 right-4 z-50 flex flex-col items-end gap-3
          transition-all duration-300 md:hidden
          ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}
        `}
      >
        {/* Ações secundárias */}
        {expanded && actions.map((action, i) => (
          <div
            key={i}
            className="flex items-center gap-3 animate-fade-in-up"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <span className="bg-slate-900 text-white text-sm font-medium px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap">
              {action.label}
            </span>
            <button
              onClick={() => { action.onClick?.(); setExpanded(false); }}
              className="w-12 h-12 rounded-full bg-white border border-slate-200 shadow-lg flex items-center justify-center text-slate-700 active:scale-90 transition-transform"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {action.icon && <action.icon className="w-5 h-5" />}
            </button>
          </div>
        ))}

        {/* Botão principal */}
        <div className="flex items-center gap-3">
          {label && !expanded && (
            <span className="bg-slate-900 text-white text-sm font-medium px-3 py-1.5 rounded-full shadow-lg">
              {label}
            </span>
          )}
          <button
            onClick={handlePrimary}
            className={`
              w-14 h-14 rounded-full shadow-xl flex items-center justify-center
              transition-all duration-200 active:scale-90
              ${expanded
                ? 'bg-slate-700 text-white'
                : 'bg-primary-600 text-white shadow-primary-500/30'
              }
            `}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            {expanded
              ? <X className="w-6 h-6" />
              : <Icon className="w-6 h-6" />
            }
          </button>
        </div>
      </div>
    </>
  );
};

export default FAB;
