import { useState, useEffect } from 'react';
import { fetchMetrics } from '../lib/api.js';

export function useMetrics(pollInterval = 5000) {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchMetrics();
        setMetrics(data);
        setError(null);
      } catch {
        setError('Cannot reach registry. Is `agentbridge up` running?');
      }
      setLoading(false);
    }
    load();
    const interval = setInterval(load, pollInterval);
    return () => clearInterval(interval);
  }, [pollInterval]);

  return { metrics, loading, error };
}
