import { useState, useCallback, useEffect } from 'react';
import { authFetch } from '../utils/authFetch';

const PROCORE_STATUS_URL = 'https://us-central1-casais-rfid.cloudfunctions.net/procoreStatus';

export const useProcoreStatus = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await authFetch(PROCORE_STATUS_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setStatus(json);
      setError(null);
    } catch (err) {
      setError(err.message || 'Falha a obter estado Procore');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return { status, loading, error, refetch: fetchStatus };
};
