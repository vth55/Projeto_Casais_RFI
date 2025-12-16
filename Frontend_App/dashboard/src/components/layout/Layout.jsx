import React, { useState } from 'react';
import { X } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import useStore from '../../store/useStore';

const MobileSidebar = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-slate-900/50 z-40 md:hidden"
        onClick={onClose}
      />
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white z-50 md:hidden shadow-xl animate-slide-in">
        <div className="absolute top-4 right-4">
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <SidebarContent onNavigate={onClose} />
      </div>
    </>
  );
};

// Duplicado do Sidebar para mobile (com callback onNavigate)
const SidebarContent = ({ onNavigate }) => {
  const { activeView, setActiveView } = useStore();
  const [expandedMenus, setExpandedMenus] = useState([]);

  const navigation = [
    { id: 'dashboard', label: 'Dashboard', icon: () => <span>📊</span> },
    { id: 'maquinas', label: 'Equipamentos', icon: () => <span>🚜</span> },
    { id: 'operadores', label: 'Operadores', icon: () => <span>👷</span> },
    { id: 'sessoes', label: 'Sessões', icon: () => <span>⏱️</span> },
    { id: 'manutencao', label: 'Manutenção', icon: () => <span>🔧</span> },
    { id: 'financeiro', label: 'Financeiro', icon: () => <span>💰</span> },
    { id: 'qualidade', label: 'Qualidade', icon: () => <span>✅</span> },
    { id: 'analises', label: 'Análises', icon: () => <span>📈</span> },
    { id: 'relatorios', label: 'Relatórios', icon: () => <span>📄</span> },
    { id: 'configuracoes', label: 'Configurações', icon: () => <span>⚙️</span> },
  ];

  return (
    <div className="h-full flex flex-col pt-16">
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {navigation.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => {
                  setActiveView(item.id);
                  onNavigate?.();
                }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                  text-sm font-medium transition-colors
                  ${activeView === item.id
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-slate-600 hover:bg-slate-50'
                  }
                `}
              >
                <item.icon />
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

const Layout = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden transition-colors duration-300">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Sidebar */}
      <MobileSidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
          <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
