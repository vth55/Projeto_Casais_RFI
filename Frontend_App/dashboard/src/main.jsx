import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// Verificar se o root existe
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Elemento #root não encontrado!');
  document.body.innerHTML =
    '<div style="padding: 20px; color: red;">Erro: Elemento #root não encontrado no HTML!</div>';
} else {
  try {
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  } catch (error) {
    console.error('Erro ao renderizar a aplicação:', error);
    rootElement.innerHTML = `
      <div style="padding: 20px; font-family: sans-serif;">
        <h1 style="color: red;">Erro ao carregar a aplicação</h1>
        <p>${error.message}</p>
        <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto;">${error.stack}</pre>
      </div>
    `;
  }
}
