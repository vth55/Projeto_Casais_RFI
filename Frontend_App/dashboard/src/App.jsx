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
import useNfcStore from './store/useNfcStore';
import NfcOverlay from './components/NfcOverlay';
// Capacitor: import estático para o listener appUrlOpen estar pronto antes de qualquer warm start
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

// Loading fallback para lazy components
const ViewLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-slate-500">A carregar...</p>
    </div>
  </div>
);

// DevTools nunca entram no bundle publicado.
const DevTools = import.meta.env.DEV ? lazy(() => import('./dev/DevTools')) : null;

// Página de Login
const LoginPage = lazy(() => import('./pages/LoginPage'));

// Página de Validação (lazy loaded - acesso via link do email)
const ValidationPage = lazy(() => import('./pages/ValidationPage'));

// Reporte de Avaria (standalone mobile - acesso via QR Code)
const ReporteAvariaView = lazy(() => import('./views/ReporteAvariaView'));

// Tool Tag Page - import estático (cold start NFC: não pode ter lazy loading overhead)
import ToolTagPage from './pages/ToolTagPage';

// Views com lazy loading (code splitting)
const DashboardView = lazy(() => import('./views/DashboardView'));
const ObrasView = lazy(() => import('./views/ObrasView'));
// Pivô (2026-05): "Equipamentos" agora trata ferramentas pequenas com NFC em vez de máquinas grandes.
// MaquinasView.jsx mantém-se em disco como referência mas não é mais carregada.
const MaquinasView = lazy(() => import('./views/FerramentasView'));
const OperadoresView = lazy(() => import('./views/OperadoresView'));
const SessoesView = lazy(() => import('./views/SessoesView'));
const ManutencaoView = lazy(() => import('./views/ManutencaoView'));
const AlertsView = lazy(() => import('./views/AlertsView'));
const GuiasTransferenciaView = lazy(() => import('./views/GuiasTransferenciaView'));
const FinanceiroView = lazy(() => import('./views/FinanceiroView'));
const AnalisesView = lazy(() => import('./views/AnalisesView'));
const RelatoriosView = lazy(() => import('./views/RelatoriosView'));
const ConfiguracoesView = lazy(() => import('./views/ConfiguracoesView'));
const CatalogoModelosView = lazy(() => import('./views/CatalogoModelosView'));
const SessoesCorrigidasView = lazy(() => import('./views/SessoesCorrigidasView'));
const EstaleiroView = lazy(() => import('./views/EstaleiroView'));
const MapaObrasView = lazy(() => import('./views/MapaObrasView'));
const ObraMenuLayout = lazy(() => import('./views/obra/ObraMenuLayout'));

// Dashboard Router (perfis)
import DashboardRouter from './views/dashboards/DashboardRouter';

const getAccessMenuIdForView = (viewId) => {
  if (!viewId) return 'dashboard';
  if (viewId === 'sessoes-validacoes') return 'sessoes-validacoes';
  if (viewId === 'obra-detalhe' || viewId.startsWith('obras')) return 'obras';
  if (viewId.startsWith('maquinas')) return 'maquinas';
  if (viewId.startsWith('sessoes')) return 'sessoes';
  if (viewId === 'alertas' || viewId.startsWith('manutencao')) return 'manutencao';
  if (viewId.startsWith('financeiro')) return 'financeiro';
  if (viewId.startsWith('analises')) return 'analises';
  return viewId;
};

const AccessDeniedView = ({ onNavigateHome }) => (
  <div className="min-h-[55vh] flex items-center justify-center px-4">
    <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-8 text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold mb-4">
        !
      </div>
      <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Acesso sem permissao</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
        O teu perfil nao tem acesso a esta area. Se precisares desta funcao, pede ao administrador para rever as permissoes.
      </p>
      <button
        type="button"
        onClick={onNavigateHome}
        className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
      >
        Voltar aos Equipamentos
      </button>
    </div>
  </div>
);

export default function App() {
  const { activeView, loading, setLoading, initializeListeners, setActiveView } = useStore();
  const { initTheme } = useThemeStore();
  const { currentUser, isAuthenticated, authLoading, getRole, initAuth, canAccess } = useAuthStore();
  // Scope deps: when these change, Firestore listeners must be rebuilt with new query filters
  const restrictedToOwnObra = currentUser?.restrictedToOwnObra ?? false;
  const assignedObraId = currentUser?.assignedObraId ?? null;
  const currentRole = getRole(currentUser?.systemRole);
  const { active: nfcActive, supported: nfcSupported, startListening } = useNfcStore();
  const nfcInitRef = useRef(false);

  // Verificar se é página de validação ou reporte avaria (standalone routes)
  const [validationToken, setValidationToken] = useState(null);
  const [isReporteAvaria, setIsReporteAvaria] = useState(false);
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

    // Links do protótipo heavy-machine deixam de abrir fluxos RFID antigos.
    // Mantemos um redirect neutro para não expor UI legacy em bookmarks/QRs.
    if (path === '/mobile-hub' || /\/m\/[^/]+/.test(path)) {
      window.history.replaceState({}, '', '/equipamentos');
      setActiveView('maquinas-lista');
    }

    // Rota Tool Tag NFC (/t/:tagId)
    if (/\/t\/[^/]+/.test(path)) {
      setIsToolTag(true);
    }

    // Sincronizar URL com activeView no carregamento inicial (deep links)
    const PATH_TO_VIEW = {
      '/': 'maquinas-lista',
      '/equipamentos': 'maquinas-lista',
      '/equipamentos/categorias': 'maquinas-categorias',
      '/dashboard': 'dashboard',
      '/obras': 'obras-todas',
      '/sessoes': 'sessoes-historico',
      '/sessoes/ativas': 'sessoes-ativas',
      '/sessoes/validacoes': 'sessoes-validacoes',
      '/sessoes/corrigidas': 'sessoes-corrigidas',
      '/maquinas': 'maquinas-lista',
      '/operadores': 'operadores',
      '/manutencao': 'manutencao-alertas',
      '/alertas': 'manutencao-alertas',
      '/manutencao/historico': 'manutencao-historico',
      '/manutencao/calendario': 'manutencao-historico',
      '/manutencao/avarias': 'manutencao-avarias',
      '/estaleiro': 'estaleiro',
      '/financeiro': 'financeiro-custos',
      '/analises': 'analises-geral',
      '/analises/custos': 'analises-custos',
      '/relatorios': 'relatorios',
      '/configuracoes': 'configuracoes',
      '/mapa': 'mapa',
      '/guias': 'guias',
      '/catalogo': 'catalogo',
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

  useEffect(() => {
    const syncToolTagRoute = () => {
      setIsToolTag(/\/t\/[^/]+/.test(window.location.pathname));
    };

    window.addEventListener('popstate', syncToolTagRoute);
    return () => window.removeEventListener('popstate', syncToolTagRoute);
  }, []);

  // Inicializar tema ao carregar
  useEffect(() => {
    initTheme();
  }, [initTheme]);

  // Capacitor: quando o APK é aberto via tag NFC, recebe o URL aqui.
  // Imports estáticos para o listener ficar pronto antes de qualquer warm start.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleUrl = (url) => {
      if (!url) return;
      try {
        const u = new URL(url);
        if (u.pathname.startsWith('/t/')) {
          window.history.replaceState(null, '', u.pathname);
          setIsToolTag(true);
        }
      } catch (_) { /* ignore */ }
    };

    // 1) Cold start: APK aberto via deep link → URL vem por getLaunchUrl
    CapacitorApp.getLaunchUrl().then(launch => {
      if (launch?.url) handleUrl(launch.url);
    }).catch(() => { /* ignore */ });

    // 2) Warm start: APK já estava aberto → URL vem por evento appUrlOpen.
    // Listener registado de forma síncrona (sem await imports) para não perder o evento.
    let handle;
    CapacitorApp.addListener('appUrlOpen', ({ url }) => handleUrl(url))
      .then(h => { handle = h; })
      .catch(() => { /* ignore */ });

    // 3) Fallback warm start: MainActivity.java (override nativo) injecta um evento
    // 'nfcUrl' no WebView quando recebe onNewIntent. Cobre casos em que o bridge
    // do Capacitor não dispara appUrlOpen (ex: NDEF_DISCOVERED).
    const onNfcUrl = (e) => handleUrl(e.detail);
    window.addEventListener('nfcUrl', onNfcUrl);

    return () => {
      handle?.remove?.();
      window.removeEventListener('nfcUrl', onNfcUrl);
    };
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
    if (!isAuthenticated || window.location.pathname !== '/login') return;

    const returnTo = new URLSearchParams(window.location.search).get('returnTo');
    if (returnTo?.startsWith('/') && !returnTo.startsWith('//')) {
      window.location.replace(returnTo);
      return;
    }

    window.history.replaceState({}, '', '/equipamentos');
    setActiveView('maquinas-lista');
  }, [isAuthenticated, setActiveView]);

  useEffect(() => {
    // Só inicializar dados após o utilizador estar autenticado
    if (!isAuthenticated) return;

    let cleanup;
    let cancelled = false;

    const initialize = async () => {
      // Verificar/criar dados mock
      if (db) {
        try {
          const basePath = `artifacts/${projectId}/public/data`;
          const [modelsSnap, toolsSnap, operatorsSnap, toolSessionsSnap, alertsSnap] = await Promise.all([
            getDocs(collection(db, `${basePath}/equipment_models`)),
            getDocs(collection(db, `${basePath}/tools`)),
            getDocs(collection(db, `${basePath}/operators`)),
            getDocs(collection(db, `${basePath}/tool_sessions`)),
            getDocs(collection(db, `${basePath}/tool_alerts`)),
          ]);

          if (modelsSnap.empty && toolsSnap.empty && toolSessionsSnap.empty) {
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

      if (cancelled) return () => {};

      // Inicializar listeners Firestore
      const stopListeners = initializeListeners();
      if (!cancelled) {
        setLoading(false);
      }

      return () => stopListeners();
    };

    initialize().then(fn => {
      if (cancelled) {
        fn?.();
      } else {
        cleanup = fn;
      }
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [isAuthenticated, initializeListeners, setLoading, restrictedToOwnObra, assignedObraId]);

  useEffect(() => {
    if (!isAuthenticated || (activeView !== 'dashboard' && !import.meta.env.DEV)) return;

    // LEGACY — apenas para a reconciliação Procore do dashboard e DevTools local.
    let cleanup;
    let cancelled = false;
    import('./store/legacy/machinesStore').then(({ default: useLegacyMachinesStore }) => {
      const stopListeners = useLegacyMachinesStore.getState().initializeLegacyListeners();
      if (cancelled) stopListeners();
      else cleanup = stopListeners;
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [isAuthenticated, activeView]);

  useEffect(() => {
    if (!isAuthenticated || !import.meta.env.DEV) return;

    // LEGACY — necessário apenas para cenários heavy-machine no DevTools local.
    let cleanup;
    import('./store/useAvariasStore').then(({ default: useAvariasStore }) => {
      cleanup = useAvariasStore.getState().initializeListener();
    });
    return () => cleanup?.();
  }, [isAuthenticated]);

  // Memoizar renderView para evitar re-renders desnecessários
  const renderView = useCallback(() => {
    const accessMenuId = getAccessMenuIdForView(activeView);
    if (!canAccess(accessMenuId)) {
      return <AccessDeniedView onNavigateHome={() => setActiveView('maquinas-lista')} />;
    }

    if (activeView === 'obra-detalhe') return <ObraMenuLayout />;
    if (activeView.startsWith('obras')) return <ObrasView />;
    if (activeView === 'estaleiro') return <EstaleiroView />;
    if (activeView.startsWith('maquinas')) return <MaquinasView />;
    if (activeView === 'operadores') return <OperadoresView />;
    if (activeView === 'sessoes-corrigidas' || activeView === 'sessoes-validacoes') return <SessoesCorrigidasView />;
    if (activeView.startsWith('sessoes')) return <SessoesView />;
    if (activeView === 'manutencao-alertas' || activeView === 'alertas') return <AlertsView />;
    if (activeView === 'guias') return <GuiasTransferenciaView />;
    if (activeView.startsWith('manutencao')) return <ManutencaoView />;
    if (activeView.startsWith('financeiro')) return <FinanceiroView />;
    if (activeView.startsWith('analises')) return <AnalisesView />;
    if (activeView === 'relatorios') return <RelatoriosView />;
    if (activeView === 'configuracoes') return <ConfiguracoesView />;
    if (activeView === 'catalogo') return <CatalogoModelosView />;
    if (activeView === 'mapa') return <MapaObrasView />;
    return <DashboardRouter DefaultDashboard={DashboardView} />;
  }, [activeView, canAccess, setActiveView]);

  // Rotas standalone: acessíveis sem login (tag NFC e reporte de avaria)
  // IMPORTANTE: verificar ANTES do loading para não bloquear o operador móvel
  if (isToolTag) {
    return (
      <ErrorBoundary>
        <ToolTagPage onExit={() => setIsToolTag(false)} />
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
      {/* DevTools ficam disponíveis localmente, mas nunca poluem a PWA publicada. */}
      {import.meta.env.DEV && currentRole?.showDevTools && DevTools && (
        <Suspense fallback={null}>
          <DevTools />
        </Suspense>
      )}
      {/* PWA - Notificações de instalação e offline */}
      <PWAPrompt />
    </ErrorBoundary>
  );
}
