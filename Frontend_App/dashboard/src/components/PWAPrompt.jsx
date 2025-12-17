import { useState, useEffect } from 'react';
import { RefreshCw, Wifi, WifiOff, X, Download } from 'lucide-react';

const PWAPrompt = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineToast, setShowOfflineToast] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // Monitorizar estado da conexão
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineToast(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineToast(true);
      // Auto-hide após 5 segundos
      setTimeout(() => setShowOfflineToast(false), 5000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Capturar evento de instalação
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Verificar se já foi instalado ou se o utilizador já recusou
      const hasDeclined = localStorage.getItem('pwa-install-declined');
      if (!hasDeclined) {
        setShowInstallPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('PWA instalado com sucesso!');
      }
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    }
  };

  const handleDeclineInstall = () => {
    setShowInstallPrompt(false);
    localStorage.setItem('pwa-install-declined', 'true');
  };

  return (
    <>
      {/* Toast de conexão offline */}
      {showOfflineToast && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 animate-slide-up">
          <div className="bg-amber-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <WifiOff className="w-5 h-5" />
            <span className="font-medium">Modo offline - Algumas funcionalidades limitadas</span>
          </div>
        </div>
      )}

      {/* Indicador de conexão na barra superior */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white text-center py-1 text-sm z-50">
          <WifiOff className="w-4 h-4 inline mr-2" />
          Sem conexão à internet
        </div>
      )}

      {/* Prompt de instalação */}
      {showInstallPrompt && (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 max-w-sm">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                <Download className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 dark:text-white">
                  Instalar CASAIS Fleet
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Adicione à sua tela inicial para acesso rápido e experiência offline.
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleInstall}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Instalar
                  </button>
                  <button
                    onClick={handleDeclineInstall}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors"
                  >
                    Agora não
                  </button>
                </div>
              </div>
              <button
                onClick={handleDeclineInstall}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PWAPrompt;
