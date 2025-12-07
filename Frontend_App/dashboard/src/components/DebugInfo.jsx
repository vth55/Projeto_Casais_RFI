import React from 'react';
import { auth, db } from '../config/firebase';

/**
 * Componente de Debug - Mostra informações úteis para diagnosticar problemas
 * REMOVER ANTES DA ENTREGA
 */
const DebugInfo = () => {
  return (
    <div className="fixed top-4 right-4 bg-black bg-opacity-75 text-white p-3 rounded-lg text-xs font-mono z-10 max-w-xs pointer-events-none">
      <div className="font-bold mb-1.5">🔍 DEBUG</div>
      <div>Auth: {auth ? '✅' : '❌'}</div>
      <div>DB: {db ? '✅' : '❌'}</div>
      <div className="mt-1.5 text-yellow-300 text-[10px]">
        ⚠️ Remover antes da entrega
      </div>
    </div>
  );
};

export default DebugInfo;
