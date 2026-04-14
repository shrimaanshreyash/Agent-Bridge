import { useState, useEffect } from 'react';
import { fetchAgents } from '../lib/api.js';

export function useAgents(pollInterval = 5000) {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchAgents();
        setAgents(data);
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

  return { agents, loading, error };
}
