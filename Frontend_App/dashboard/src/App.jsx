import React, { useEffect, useState, lazy, Suspense, useCallback, useRef } from 'react';
import { getDocs, collection } from 'firebase/firestore';
import { db, projectId } from './config/firebase';
import { createAllMockData } from './utils/mockData';
import useStore from './store/useStore';
import useThemeStore from './store/useThemeStore';
import { Layout } from './components/layout';
import ErrorBoundary from './components/ErrorBoundary';
import PWAPrompt from './components/PWAPrompt';
import useAuthStore from './store/useAuthStore';
import useAvariasStore from './store/useAvariasStore';
import useNfcStore from './store/useNfcStore';
import NfcOverlay from './components/NfcOverlay';

// Loading fallback para lazy components
const ViewLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-slate-500">A carregar...</p>
    </div>
  </div>
);

// DevTools
const DevTools = lazy(() => import('./dev/DevTools'));

// Página de Login
const LoginPage = lazy(() => import('./pages/LoginPage'));

// Página de Validação (lazy loaded - acesso via link do email)
const ValidationPage = lazy(() => import('./pages/ValidationPage'));

// Reporte de Avaria (standalone mobile - acesso via QR Code)
const ReporteAvariaView = lazy(() => import('./views/ReporteAvariaView'));

// Mobile Hub - Smartphone-as-Machine (standalone fullscreen)
const MobileHubView = lazy(() => import('./views/MobileHubView'));

// Machine QR View - standalone page via QR Code (/m/:machineId)
const MachineQrView = lazy(() => import('./views/MachineQrView'));

// Tool Tag Page - abre quando telemóvel lê tag NFC (/t/:tagId)
const ToolTagPage = lazy(() => import('./pages/ToolTagPage'));

// Views com lazy loading (code splitting)
const DashboardView = lazy(() => import('./views/DashboardView'));
const ObrasView = lazy(() => import('./views/ObrasView'));
// Pivô (2026-05): "Equipamentos" agora trata ferramentas pequenas com NFC em vez de máquinas grandes.
// MaquinasView.jsx mantém-se em disco como referência mas não é mais carregada.
const MaquinasView = lazy(() => import('./views/FerramentasView'));
const OperadoresView = lazy(() => import('./views/OperadoresView'));
const SessoesView = lazy(() => import('./views/SessoesView'));
const ManutencaoView = lazy(() => import('./views/ManutencaoView'));
const FinanceiroView = lazy(() => import('./views/FinanceiroView'));
const AnalisesView = lazy(() => import('./views/AnalisesView'));
const RelatoriosView = lazy(() => import('./views/RelatoriosView'));
const ConfiguracoesView = lazy(() => import('./views/ConfiguracoesView'));
const SessoesCorrigidasView = lazy(() => import('./views/SessoesCorrigidasView'));
const EstaleiroView = lazy(() => import('./views/EstaleiroView'));
const ObraMenuLayout = lazy(() => import('./views/obra/ObraMenuLayout'));

// Dashboard Router (perfis)
import DashboardRouter from './views/dashboards/DashboardRouter';

export default function App() {
  const { activeView, loading, setLoading, initializeListeners, setActiveView } = useStore();
  const { initTheme } = useThemeStore();
  const { currentUser, isAuthenticated, authLoading, getRole, initAuth } = useAuthStore();
  const currentRole = getRole(currentUser?.systemRole);
  const { active: nfcActive, supported: nfcSupported, startListening } = useNfcStore();
  const nfcInitRef = useRef(false);

  // Verificar se é página de validação ou reporte avaria (standalone routes)
  const [validationToken, setValidationToken] = useState(null);
  const [isReporteAvaria, setIsReporteAvaria] = useState(false);
  const [isMobileHub, setIsMobileHub] = useState(false);
  const [isMachineQr, setIsMachineQr] = useState(false);
  const [isToolTag, setIsToolTag] = useState(false);

  useEffect(() => {
    const path = window.location.pathname;
    const hash = window.location.hash;

    // Rota de validação (link do email)
    const validationMatch = path.match(/^\/validar\/(.+)$/) || hash.match(/^#\/validar\/(.+)$/);
    if (validationMatch) {
      setValidationToken(validationMatch[1]);
    }

    // Rota de reporte de avaria (QR Code mobile)
    if (window.location.href.includes('/reporte-avaria')) {
      setIsReporteAvaria(true);
    }

    // Rota Mobile Hub - Smartphone-as-Machine
    if (window.location.href.includes('/mobile-hub')) {
      setIsMobileHub(true);
    }

    // Rota Machine QR (/m/:machineId)
    if (/\/m\/[^/]+/.test(path)) {
      setIsMachineQr(true);
    }

    // Rota Tool Tag NFC (/t/:tagId)
    if (/\/t\/[^/]+/.test(path)) {
      setIsToolTag(true);
    }

    // Sincronizar URL com activeView no carregamento inicial (deep links)
    const PATH_TO_VIEW = {
      '/obras': 'obras-todas',
      '/sessoes': 'sessoes-historico',
      '/sessoes/ativas': 'sessoes-ativas',
      '/sessoes/validacoes': 'sessoes-validacoes',
      '/sessoes/corrigidas': 'sessoes-corrigidas',
      '/maquinas': 'maquinas-lista',
      '/operadores': 'operadores',
      '/manutencao': 'manutencao-alertas',
      '/financeiro': 'financeiro-custos',
      '/analises': 'analises-geral',
      '/relatorios': 'relatorios',
      '/configuracoes': 'configuracoes',
    };
    const mappedView = PATH_TO_VIEW[path];
    if (mappedView) {
      setActiveView(mappedView);
    }

    // Rota /obras/:obraId — menu de obra
    if (/^\/obras\/[^/]+/.test(path)) {
      setActiveView('obra-detalhe');
    }
  }, []);

  // Inicializar tema ao carregar
  useEffect(() => {
    initTheme();
  }, [initTheme]);

  // Capacitor: quando o APK é aberto via tag NFC, recebe o URL aqui
  useEffect(() => {
    let listener;
    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;
        const { App } = await import('@capacitor/app');
        listener = await App.addListener('appUrlOpen', ({ url }) => {
          // url ex: "https://casais-rfid.web.app/t/MARTELO_001"
          try {
            const u = new URL(url);
            if (u.pathname.startsWith('/t/')) {
              window.history.replaceState(null, '', u.pathname);
              setIsToolTag(true);
            }
          } catch (_) { /* ignore */ }
        });
      } catch (_) { /* not on Capacitor — ignore */ }
    })();
    return () => { listener?.remove?.(); };
  }, []);

  // NFC global: arranca na primeira interacção do utilizador autenticado (exige gesto)
  useEffect(() => {
    if (!isAuthenticated || !currentUser || !nfcSupported || nfcActive || nfcInitRef.current) return;

    const onFirstGesture = () => {
      if (nfcInitRef.current) return;
      nfcInitRef.current = true;
      startListening(currentUser);
    };

    document.addEventListener('click', onFirstGesture, { once: true });
    document.addEventListener('touchstart', onFirstGesture, { once: true, passive: true });

    return () => {
      document.removeEventListener('click', onFirstGesture);
      document.removeEventListener('touchstart', onFirstGesture);
    };
  }, [isAuthenticated, currentUser, nfcSupported, nfcActive, startListening]);

  // Inicializar Firebase Auth (listener de sessão persistente)
  useEffect(() => {
    const unsubscribe = initAuth();
    return () => unsubscribe?.();
  }, [initAuth]);

  useEffect(() => {
    // Só inicializar dados após o utilizador estar autenticado
    if (!isAuthenticated) return;

    const initialize = async () => {
      // Verificar/criar dados mock
      if (db) {
        try {
          const basePath = `artifacts/${projectId}/public/data`;
          const [machinesSnap, operatorsSnap, sessionsSnap, alertsSnap] = await Promise.all([
            getDocs(collection(db, `${basePath}/machines`)),
            getDocs(collection(db, `${basePath}/operators`)),
            getDocs(collection(db, `${basePath}/sessions`)),
            getDocs(collection(db, `${basePath}/alerts`)),
          ]);

          if (machinesSnap.empty && operatorsSnap.empty && sessionsSnap.empty) {
            console.log('Criando dados mock...');
            await createAllMockData();
          } else if (alertsSnap.empty) {
            console.log('A criar alertas pendentes mock...');
            const { createMockAlerts } = await import('./utils/mockData');
            await createMockAlerts();
          }
        } catch (error) {
          console.error('Erro ao verificar dados:', error);
        }
      }

      // Inicializar listeners Firestore
      const cleanup = initializeListeners();
      const cleanupAvarias = useAvariasStore.getState().initializeListener();
      setLoading(false);

      return () => { cleanup(); cleanupAvarias(); };
    };

    let cleanup;
    initialize().then(fn => { cleanup = fn; });

    return () => cleanup?.();
  }, [isAuthenticated, initializeListeners, setLoading]);

  // Memoizar renderView para evitar re-renders desnecessários
  const renderView = useCallback(() => {
    if (activeView === 'obra-detalhe') return <ObraMenuLayout />;
    if (activeView.startsWith('obras')) return <ObrasView />;
    if (activeView === 'estaleiro') return <EstaleiroView />;
    if (activeView.startsWith('maquinas')) return <MaquinasView />;
    if (activeView === 'operadores') return <OperadoresView />;
    if (activeView === 'sessoes-corrigidas' || activeView === 'sessoes-validacoes') return <SessoesCorrigidasView />;
    if (activeView.startsWith('sessoes')) return <SessoesView />;
    if (activeView.startsWith('manutencao')) return <ManutencaoView />;
    if (activeView.startsWith('financeiro')) return <FinanceiroView />;
    if (activeView.startsWith('analises')) return <AnalisesView />;
    if (activeView === 'relatorios') return <RelatoriosView />;
    if (activeView === 'configuracoes') return <ConfiguracoesView />;
    return <DashboardRouter DefaultDashboard={DashboardView} />;
  }, [activeView, currentUser?.systemRole]);

  // Rotas standalone: acessíveis sem login (Mobile Hub e Reporte de Avaria)
  // IMPORTANTE: verificar ANTES do loading para não bloquear o operador móvel
  if (isMobileHub) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<ViewLoader />}>
          <MobileHubView />
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (isMachineQr) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<ViewLoader />}>
          <MachineQrView />
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (isToolTag) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>}>
          <ToolTagPage />
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (isReporteAvaria) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<ViewLoader />}>
          <ReporteAvariaView />
        </Suspense>
      </ErrorBoundary>
    );
  }

  // Aguardar resolução do estado Firebase Auth antes de decidir o que mostrar
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 font-medium text-sm">A verificar sessao...</p>
        </div>
      </div>
    );
  }

  // Utilizador não autenticado — mostrar página de login
  if (!isAuthenticated) {
    return (
      <ErrorBoundary>
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-slate-900">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <LoginPage />
        </Suspense>
      </ErrorBoundary>
    );
  }

  // Página de validação (link do email) — sem layout/menus
  if (validationToken) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<ViewLoader />}>
          <ValidationPage token={validationToken} />
        </Suspense>
      </ErrorBoundary>
    );
  }

  // Ecrã de loading enquanto os dados do Firestore carregam
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-600 dark:text-slate-400 font-medium">A carregar...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Layout>
        <Suspense fallback={<ViewLoader />}>
          {renderView()}
        </Suspense>
      </Layout>
      {/* NFC global overlay — aparece em qualquer vista quando tag é lida */}
      <NfcOverlay />
      {/* DevTools — apenas para roles com showDevTools: true (admin, it) */}
      {currentRole?.showDevTools && (
        <Suspense fallback={null}>
          <DevTools />
        </Suspense>
      )}
      {/* PWA - Notificações de instalação e offline */}
      <PWAPrompt />
    </ErrorBoundary>
  );
}
