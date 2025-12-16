import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import ValidationPage from './pages/ValidationPage.jsx';

// Wrapper para ValidationPage com parâmetro da URL
const ValidationPageWrapper = () => {
  const { token } = useParams();
  return <ValidationPage token={token} />;
};

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
        <BrowserRouter>
          <Routes>
            {/* Página de validação isolada (sem login, sem layout) */}
            <Route path="/validar/:token" element={<ValidationPageWrapper />} />
            {/* App principal com Layout */}
            <Route path="/*" element={<App />} />
          </Routes>
        </BrowserRouter>
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
