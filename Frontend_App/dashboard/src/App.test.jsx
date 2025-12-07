/**
 * VERSÃO DE TESTE SIMPLES - Para diagnosticar o problema
 * Se isto funcionar, o problema está noutro lugar
 */
import React from 'react';

export default function AppTest() {
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#005EB8' }}>CASAIS Fleet Intelligence</h1>
      <p>Se vês isto, o React está a funcionar!</p>
      <div
        style={{ background: '#f0f0f0', padding: '10px', marginTop: '20px', borderRadius: '4px' }}
      >
        <strong>Debug Info:</strong>
        <ul>
          <li>React Version: {React.version}</li>
          <li>Root Element: {document.getElementById('root') ? '✅ Existe' : '❌ Não existe'}</li>
          <li>Timestamp: {new Date().toLocaleString('pt-PT')}</li>
        </ul>
      </div>
    </div>
  );
}
