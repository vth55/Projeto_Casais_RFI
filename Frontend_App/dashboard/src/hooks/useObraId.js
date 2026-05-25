import { useState, useEffect } from 'react';

const OBRA_PATTERN = /^\/obras\/([^/]+)/;

export function useObraId() {
  const [obraId, setObraId] = useState(() => {
    const m = window.location.pathname.match(OBRA_PATTERN);
    return m ? m[1] : null;
  });

  useEffect(() => {
    const onPopState = () => {
      const m = window.location.pathname.match(OBRA_PATTERN);
      setObraId(m ? m[1] : null);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  return obraId;
}

export function navigateToObra(obraId, setActiveView) {
  window.history.pushState({}, '', `/obras/${obraId}`);
  setActiveView('obra-detalhe');
}
