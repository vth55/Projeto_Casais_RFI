import React, { useState } from 'react';
import { X } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import BottomNav from './BottomNav';
import LiveSessionsBar from '../ui/LiveSessionsBar';
import useDeviceType from '../../hooks/useDeviceType';
import useNavigationHistory from '../../hooks/useNavigationHistory';

// Drawer mobile — overlay + sidebar full
const MobileSidebar = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <>
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 left-0 w-72 z-50 md:hidden shadow-2xl animate-slide-in">
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <Sidebar className="flex h-full" onNavigate={onClose} collapsed={false} />
      </div>
    </>
  );
};

const Layout = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tabletSidebarCollapsed, setTabletSidebarCollapsed] = useState(true);
  const { isMobile, isTablet } = useDeviceType();

  // Integra botão "voltar" nativo do telemóvel com a navegação por views.
  // Só ativa dentro do shell principal — rotas standalone (validar,
  // mobile-hub, reporte-avaria) não montam o Layout, logo não interferem.
  useNavigationHistory();

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden transition-colors duration-300">

      {/* Desktop Sidebar — lg+ sempre visível e expandida */}
      <div className="hidden lg:flex">
        <Sidebar collapsed={false} />
      </div>

      {/* Tablet Sidebar — md só com ícones, toggle manual */}
      <div className="hidden md:flex lg:hidden">
        <Sidebar
          collapsed={tabletSidebarCollapsed}
          onToggleCollapse={() => setTabletSidebarCollapsed(prev => !prev)}
        />
      </div>

      {/* Mobile Sidebar drawer */}
      <MobileSidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header — no mobile mostra botão hamburguer (fallback) */}
        <Header onMenuClick={() => setMobileMenuOpen(true)} />

        {/* Live Sessions Bar — só mobile, quando há sessões ativas */}
        <LiveSessionsBar />

        {/* Conteúdo da view */}
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
          <div className={`
            max-w-7xl mx-auto transition-all
            ${isMobile
              ? 'p-3 pb-24'          /* mobile: padding compacto + espaço para bottom nav */
              : isTablet
                ? 'p-4 md:p-5'       /* tablet */
                : 'p-4 md:p-6 lg:p-8' /* desktop */
            }
          `}>
            {children}
          </div>
        </main>
      </div>

      {/* Bottom Navigation — apenas mobile */}
      <BottomNav />
    </div>
  );
};

export default Layout;
