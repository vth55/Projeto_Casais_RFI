import React, { useEffect, useState, lazy, Suspense, useCallback } from 'react';
import { signInAnonymously } from 'firebase/auth';
import { getDocs, collection } from 'firebase/firestore';
import { auth, db, projectId } from './config/firebase';
import { createAllMockData } from './utils/mockData';
import useStore from './store/useStore';
import useThemeStore from './store/useThemeStore';
import { Layout } from './components/layout';
import ErrorBoundary from './components/ErrorBoundary';
import PWAPrompt from './components/PWAPrompt';

// Loading fallback para lazy components
const ViewLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-slate-500">A carregar...</p>
    </div>
  </div>
);

// DevTools - Só carrega em desenvolvimento (import.meta.env.DEV)
const DevTools = lazy(() => import('./components/DevTools'));

// Página de Validação (lazy loaded - acesso via link do email)
const ValidationPage = lazy(() => import('./pages/ValidationPage'));

// Views com lazy loading (code splitting)
const DashboardView = lazy(() => import('./views/DashboardView'));
const ObrasView = lazy(() => import('./views/ObrasView'));
const MaquinasView = lazy(() => import('./views/MaquinasView'));
const OperadoresView = lazy(() => import('./views/OperadoresView'));
const SessoesView = lazy(() => import('./views/SessoesView'));
const ManutencaoView = lazy(() => import('./views/ManutencaoView'));
const FinanceiroView = lazy(() => import('./views/FinanceiroView'));
const QualidadeView = lazy(() => import('./views/QualidadeView'));
const AnalisesView = lazy(() => import('./views/AnalisesView'));
const RelatoriosView = lazy(() => import('./views/RelatoriosView'));
const ConfiguracoesView = lazy(() => import('./views/ConfiguracoesView'));
const SessoesCorrigidasView = lazy(() => import('./views/SessoesCorrigidasView'));

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

  // Memoizar renderView para evitar re-renders desnecessários
  const renderView = useCallback(() => {
    // Mapear view para componente
    if (activeView.startsWith('obras')) return <ObrasView />;
    if (activeView.startsWith('maquinas')) return <MaquinasView />;
    if (activeView === 'operadores') return <OperadoresView />;
    // Sessões - verificar submenus específicos primeiro
    if (activeView === 'sessoes-corrigidas') return <SessoesCorrigidasView />;
    if (activeView === 'sessoes-validacoes') return <SessoesCorrigidasView />;
    if (activeView.startsWith('sessoes')) return <SessoesView />;
    if (activeView.startsWith('manutencao')) return <ManutencaoView />;
    if (activeView.startsWith('financeiro')) return <FinanceiroView />;
    if (activeView.startsWith('qualidade')) return <QualidadeView />;
    if (activeView.startsWith('analises')) return <AnalisesView />;
    if (activeView === 'relatorios') return <RelatoriosView />;
    if (activeView === 'configuracoes') return <ConfiguracoesView />;
    return <DashboardView />;
  }, [activeView]);

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
        <Suspense fallback={<ViewLoader />}>
          <ValidationPage token={validationToken} />
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Layout>
        <Suspense fallback={<ViewLoader />}>
          {renderView()}
        </Suspense>
      </Layout>
      {/* DevTools - Só aparece em desenvolvimento (npm run dev) */}
      {import.meta.env.DEV && (
        <Suspense fallback={null}>
          <DevTools />
        </Suspense>
      )}
      {/* PWA - Notificações de instalação e offline */}
      <PWAPrompt />
    </ErrorBoundary>
  );
}
