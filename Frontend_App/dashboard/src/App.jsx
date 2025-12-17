import React, { useEffect, useState } from 'react';
import { signInAnonymously } from 'firebase/auth';
import { getDocs, collection } from 'firebase/firestore';
import { auth, db, projectId } from './config/firebase';
import { createAllMockData } from './utils/mockData';
import useStore from './store/useStore';
import useThemeStore from './store/useThemeStore';
import { Layout } from './components/layout';
import ErrorBoundary from './components/ErrorBoundary';

// DevTools - REMOVER ANTES DE ENTREGAR PARA PRODUÇÃO
import DevTools from './components/DevTools';

// Página de Validação (acesso via link do email)
import ValidationPage from './pages/ValidationPage';

// Views
import DashboardView from './views/DashboardView';
import ObrasView from './views/ObrasView';
import MaquinasView from './views/MaquinasView';
import OperadoresView from './views/OperadoresView';
import SessoesView from './views/SessoesView';
import ManutencaoView from './views/ManutencaoView';
import FinanceiroView from './views/FinanceiroView';
import QualidadeView from './views/QualidadeView';
import AnalisesView from './views/AnalisesView';
import RelatoriosView from './views/RelatoriosView';
import ConfiguracoesView from './views/ConfiguracoesView';
import SessoesCorrigidasView from './views/SessoesCorrigidasView';

export default function App() {
  const { activeView, loading, setLoading, initializeListeners } = useStore();
  const { initTheme } = useThemeStore();

  // Verificar se é página de validação (link do email)
  const [validationToken, setValidationToken] = useState(null);

  useEffect(() => {
    // Verificar URL para rota de validação
    const path = window.location.pathname;
    const match = path.match(/^\/validar\/(.+)$/);
    if (match) {
      setValidationToken(match[1]);
    }
  }, []);

  // Inicializar tema ao carregar
  useEffect(() => {
    initTheme();
  }, [initTheme]);

  useEffect(() => {
    const initialize = async () => {
      // Auth anónimo
      if (auth) {
        try {
          await signInAnonymously(auth);
        } catch (error) {
          console.warn('Auth error:', error.message);
        }
      }

      // Verificar/criar dados mock
      if (db) {
        try {
          const basePath = `artifacts/${projectId}/public/data`;
          const [machinesSnap, operatorsSnap, sessionsSnap] = await Promise.all([
            getDocs(collection(db, `${basePath}/machines`)),
            getDocs(collection(db, `${basePath}/operators`)),
            getDocs(collection(db, `${basePath}/sessions`)),
          ]);

          if (machinesSnap.empty && operatorsSnap.empty && sessionsSnap.empty) {
            console.log('📊 Criando dados mock...');
            await createAllMockData();
          }
        } catch (error) {
          console.error('Erro ao verificar dados:', error);
        }
      }

      // Inicializar listeners Firestore
      const cleanup = initializeListeners();
      setLoading(false);

      return cleanup;
    };

    let cleanup;
    initialize().then(fn => { cleanup = fn; });

    return () => cleanup?.();
  }, [initializeListeners, setLoading]);

  const renderView = () => {
    // Mapear view para componente
    if (activeView.startsWith('obras')) return <ObrasView />;
    if (activeView.startsWith('maquinas')) return <MaquinasView />;
    if (activeView === 'operadores') return <OperadoresView />;
    // Sessões - verificar submenus específicos primeiro
    if (activeView === 'sessoes-corrigidas') return <SessoesCorrigidasView />;
    if (activeView === 'sessoes-validacoes') return <SessoesCorrigidasView />; // Validações usa mesmo componente
    if (activeView.startsWith('sessoes')) return <SessoesView />;
    if (activeView.startsWith('manutencao')) return <ManutencaoView />;
    if (activeView.startsWith('financeiro')) return <FinanceiroView />;
    if (activeView.startsWith('qualidade')) return <QualidadeView />;
    if (activeView.startsWith('analises')) return <AnalisesView />;
    if (activeView === 'relatorios') return <RelatoriosView />;
    if (activeView === 'configuracoes') return <ConfiguracoesView />;
    return <DashboardView />;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-600 font-medium">A carregar...</p>
        </div>
      </div>
    );
  }

  // Se é página de validação, mostrar apenas essa página (sem layout/menus)
  if (validationToken) {
    return (
      <ErrorBoundary>
        <ValidationPage token={validationToken} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Layout>
        {renderView()}
      </Layout>
      {/* DevTools - REMOVER ANTES DE ENTREGAR PARA PRODUÇÃO */}
      <DevTools />
    </ErrorBoundary>
  );
}
