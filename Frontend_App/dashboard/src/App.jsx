import React, { useState, useEffect } from 'react';
import { signInAnonymously } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, getDocs } from 'firebase/firestore';
import { auth, db, projectId } from './config/firebase';
import { getNavPath, findNavItem } from './config/navigation';
import Sidebar from './components/Sidebar';
import AnimatedBackground from './components/AnimatedBackground';
import DebugInfo from './components/DebugInfo';
import { Menu, X } from 'lucide-react';
import { createAllMockData } from './utils/mockData';

// Views
import DashboardView from './views/DashboardView';
import MaquinasView from './views/MaquinasView';
import OperadoresView from './views/OperadoresView';
import SessoesView from './views/SessoesView';
import ManutencaoView from './views/ManutencaoView';
import AnalisesView from './views/AnalisesView';
import RelatoriosView from './views/RelatoriosView';
import ConfiguracoesView from './views/ConfiguracoesView';

export default function App() {
  const [sessions, setSessions] = useState([]);
  const [machines, setMachines] = useState([]);
  const [operators, setOperators] = useState([]);
  const [activeView, setActiveView] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (auth) {
      signInAnonymously(auth).catch((error) => {
        if (error.code === 'auth/configuration-not-found') {
          console.warn('Firebase Auth não está configurado. A aplicação funcionará, mas algumas funcionalidades podem estar limitadas.');
        } else {
          console.warn('Erro ao fazer login anónimo:', error.message);
        }
        setLoading(false);
      });
    } else {
      console.warn('Firebase Auth não inicializado - continuando sem autenticação');
      setLoading(false);
    }

    if (db) {
      const checkAndCreateMockData = async () => {
        try {
          const machinesSnapshot = await getDocs(
            collection(db, `artifacts/${projectId}/public/data/machines`)
          );
          const operatorsSnapshot = await getDocs(
            collection(db, `artifacts/${projectId}/public/data/operators`)
          );
          const sessionsSnapshot = await getDocs(
            collection(db, `artifacts/${projectId}/public/data/sessions`)
          );

          if (
            machinesSnapshot.empty &&
            operatorsSnapshot.empty &&
            sessionsSnapshot.empty
          ) {
            console.log('📊 Não há dados. A criar dados mock...');
            const result = await createAllMockData();
            if (result.success) {
              console.log(`✅ Dados mock criados: ${result.machines} máquinas, ${result.operators} operadores, ${result.sessions} sessões`);
            }
          }
        } catch (error) {
          console.error('Erro ao verificar/criar dados mock:', error);
        }
      };

      checkAndCreateMockData();

      const unsubSessions = onSnapshot(
        query(
          collection(db, `artifacts/${projectId}/public/data/sessions`),
          orderBy('startTime', 'desc')
        ),
        (s) => {
          setSessions(s.docs.map((d) => ({ id: d.id, ...d.data() })));
          setLoading(false);
        },
        (error) => {
          console.error('Erro ao carregar sessões:', error);
          setLoading(false);
        }
      );
      const unsubMachines = onSnapshot(
        collection(db, `artifacts/${projectId}/public/data/machines`),
        (s) => setMachines(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
        (error) => {
          console.error('Erro ao carregar máquinas:', error);
        }
      );
      const unsubOperators = onSnapshot(
        collection(db, `artifacts/${projectId}/public/data/operators`),
        (s) => setOperators(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
        (error) => {
          console.error('Erro ao carregar operadores:', error);
        }
      );

      return () => {
        unsubSessions();
        unsubMachines();
        unsubOperators();
      };
    } else {
      console.warn('Firestore não inicializado');
      setLoading(false);
    }
  }, []);

  const renderContent = () => {
    console.log('Renderizando view:', activeView);
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />;
      case 'maquinas':
      case 'maquinas-lista':
      case 'maquinas-categorias':
      case 'maquinas-localizacoes':
        return <MaquinasView activeView={activeView} />;
      case 'operadores':
        return <OperadoresView />;
      case 'sessoes':
      case 'sessoes-ativas':
      case 'sessoes-historico':
      case 'sessoes-validacoes':
        return <SessoesView activeView={activeView} />;
      case 'manutencao':
      case 'manutencao-alertas':
      case 'manutencao-calendario':
      case 'manutencao-avarias':
        return <ManutencaoView activeView={activeView} />;
      case 'analises':
      case 'analises-geral':
      case 'analises-emissoes':
      case 'analises-custos':
        return <AnalisesView activeView={activeView} />;
      case 'relatorios':
        return <RelatoriosView />;
      case 'configuracoes':
        return <ConfiguracoesView />;
      default:
        return <DashboardView />;
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">A carregar...</p>
        </div>
      </div>
    );

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-100 font-sans text-slate-900 overflow-hidden relative">
      <AnimatedBackground />
      
      {/* Sidebar Desktop - sempre visível */}
      <Sidebar activeView={activeView} onNavigate={setActiveView} />
      
      {/* Sidebar Mobile - overlay quando aberto */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          ></div>
          <div className="fixed inset-y-0 left-0 z-50 md:hidden">
            <Sidebar
              activeView={activeView}
              onNavigate={(view) => {
                setActiveView(view);
                setSidebarOpen(false); // Fechar ao navegar em mobile
              }}
            />
          </div>
        </>
      )}

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-16 glass border-b border-slate-200/50 flex items-center justify-between px-4 md:px-8 sticky top-0 z-10 shadow-lg">
          <div className="flex items-center gap-3">
            {/* Menu Hamburger - apenas mobile */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Abrir menu"
            >
              {sidebarOpen ? (
                <X className="w-6 h-6 text-slate-700" />
              ) : (
                <Menu className="w-6 h-6 text-slate-700" />
              )}
            </button>
            <div>
              <h1 className="font-bold text-lg md:text-xl text-slate-800">
                {findNavItem(activeView)?.label || 'Dashboard'}
              </h1>
              {findNavItem(activeView)?.description && (
                <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
                  {findNavItem(activeView).description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-bold text-emerald-700">LIGAÇÃO ATIVA</span>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto">{renderContent()}</div>
        </div>
      </main>
      <DebugInfo />
    </div>
  );
}
