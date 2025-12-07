import React from 'react';

/**
 * Componente do Logotipo Casais
 *
 * Usa o logotipo oficial SVG (logotipo_2024_azul.svg)
 * O SVG oficial já inclui o símbolo e o texto "CASAIS"
 *
 * Props:
 * - size: 'sm' | 'md' | 'lg' | 'xl' (tamanho do logotipo)
 * - className: classes CSS adicionais
 * - showSubtitle: boolean (mostrar "Tecnologia de Frota" abaixo)
 */
const CasaisLogo = ({ size = 'md', className = '', showSubtitle = true }) => {
  const sizeClasses = {
    sm: 'h-6 w-auto',
    md: 'h-10 w-auto', // Aumentado para melhor visibilidade
    lg: 'h-14 w-auto',
    xl: 'h-20 w-auto',
  };

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <img
        src="/logotipo_2024_azul.svg"
        alt="Grupo Casais"
        className={sizeClasses[size]}
        onError={(e) => {
          // Fallback se o SVG não existir - mostra texto simples
          console.error('Erro ao carregar logotipo Casais');
          e.target.style.display = 'none';
          // Cria um fallback visual
          const fallback = document.createElement('div');
          fallback.className = `${sizeClasses[size]} flex items-center justify-center bg-primary-500 text-white font-bold text-lg rounded`;
          fallback.textContent = 'CASAIS';
          e.target.parentNode.appendChild(fallback);
        }}
      />
      {showSubtitle && (
        <p className="text-[9px] text-gray-400 font-bold uppercase">Tecnologia de Frota</p>
      )}
    </div>
  );
};

export default CasaisLogo;
