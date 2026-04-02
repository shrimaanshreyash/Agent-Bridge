import { useState, useEffect } from 'react';
import { fetchMetrics } from '../lib/api.js';

export function useMetrics(pollInterval = 5000) {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try { const data = await fetchMetrics(); setMetrics(data); } catch {}
      setLoading(false);
    }
    load();
    const interval = setInterval(load, pollInterval);
    return () => clearInterval(interval);
  }, [pollInterval]);

  return { metrics, loading };
}
