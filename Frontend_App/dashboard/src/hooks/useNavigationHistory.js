import { useEffect, useRef } from 'react';
import useStore from '../store/useStore';

/**
 * useNavigationHistory
 * --------------------------------------------------------------
 * Integra o padrão de navegação por `activeView` (Zustand) com a
 * History API nativa do browser, permitindo que o botão "voltar"
 * físico/gestual do Android (e do iOS PWA) navegue entre as views
 * em vez de fechar a aplicação.
 *
 * Estratégia:
 *  - Sempre que a `activeView` muda (via Sidebar/BottomNav/etc.),
 *    fazemos `history.pushState` com a view marcada no state.
 *  - Quando o utilizador carrega no botão "voltar" do telemóvel,
 *    o browser dispara `popstate` com o state anterior — lemos a
 *    view marcada e chamamos `setActiveView` (com guard para não
 *    voltar a fazer push).
 *  - Se a stack chegar ao fundo (state sem view marcada), e ainda
 *    não estamos no `dashboard`, redirecionamos para lá como
 *    "home". Só pedimos confirmação de saída quando o utilizador
 *    está mesmo na view raiz.
 *
 * Esta abordagem usa a History API como fonte de verdade — não
 * mantemos uma stack paralela, evitando dessincronização entre
 * o histórico do browser e o nosso estado.
 */

const ROOT_VIEW = 'dashboard';
const STATE_KEY = '__casaisView';

export default function useNavigationHistory() {
  const activeView = useStore(s => s.activeView);
  const setActiveView = useStore(s => s.setActiveView);

  // Flag para evitar que uma navegação despoletada por popstate
  // volte a empurrar uma entrada nova no histórico (loop).
  const skipNextPushRef = useRef(false);
  const initializedRef = useRef(false);

  // Marca o estado inicial do histórico com a view atual.
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const current = window.history.state || {};
    if (current[STATE_KEY] !== activeView) {
      window.history.replaceState(
        { ...current, [STATE_KEY]: activeView },
        '',
      );
    }
    // Só corre uma vez no mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Empurra uma nova entrada no histórico sempre que a view muda.
  useEffect(() => {
    if (!initializedRef.current) return;

    if (skipNextPushRef.current) {
      skipNextPushRef.current = false;
      return;
    }

    const current = window.history.state || {};
    if (current[STATE_KEY] === activeView) return;

    window.history.pushState(
      { ...current, [STATE_KEY]: activeView },
      '',
    );
  }, [activeView]);

  // Listener do botão "voltar" físico/gestual.
  useEffect(() => {
    const handlePopState = (event) => {
      const state = event.state;
      const targetView = state && state[STATE_KEY];

      if (targetView) {
        // Voltar para a view marcada no histórico, sem repush.
        skipNextPushRef.current = true;
        setActiveView(targetView);
        return;
      }

      // Sem state marcado: chegámos ao fundo da nossa stack.
      const currentView = useStore.getState().activeView;

      if (currentView !== ROOT_VIEW) {
        // Tratar o dashboard como "home" — uma volta extra para lá
        // antes de oferecer fechar a app.
        skipNextPushRef.current = true;
        setActiveView(ROOT_VIEW);
        window.history.pushState({ [STATE_KEY]: ROOT_VIEW }, '');
        return;
      }

      // Estamos na home: pedir confirmação para sair.
      const shouldExit = window.confirm('Deseja sair da aplicação?');
      if (!shouldExit) {
        // Re-adicionar a entrada para impedir o fecho da app.
        window.history.pushState({ [STATE_KEY]: ROOT_VIEW }, '');
      } else {
        // O utilizador confirmou — deixar o browser sair de facto.
        window.history.back();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setActiveView]);
}
