import { useState, useEffect } from 'react';
import { fetchAgents } from '../lib/api.js';

export function useAgents(pollInterval = 5000) {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try { const data = await fetchAgents(); setAgents(data); } catch {}
      setLoading(false);
    }
    load();
    const interval = setInterval(load, pollInterval);
    return () => clearInterval(interval);
  }, [pollInterval]);

  return { agents, loading };
}
