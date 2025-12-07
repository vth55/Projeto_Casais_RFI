import React from 'react';

/**
 * Componente de Fundo Animado - Cria profundidade visual
 * Usa gradientes animados e formas geométricas
 */
const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Gradiente de fundo animado */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100"></div>

      {/* Formas geométricas flutuantes */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary-200/20 rounded-full blur-3xl animate-pulse"></div>
      <div
        className="absolute bottom-0 right-0 w-96 h-96 bg-accent-300/20 rounded-full blur-3xl animate-pulse"
        style={{ animationDelay: '1s' }}
      ></div>
      <div
        className="absolute top-1/2 left-1/2 w-64 h-64 bg-primary-300/10 rounded-full blur-2xl animate-pulse"
        style={{ animationDelay: '2s' }}
      ></div>

      {/* Grid pattern sutil */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0, 94, 184, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 94, 184, 0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      ></div>
    </div>
  );
};

export default AnimatedBackground;
