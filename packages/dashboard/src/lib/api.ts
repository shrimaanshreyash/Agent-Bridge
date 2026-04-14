const BASE = '';
export async function fetchAgents() { const res = await fetch(`${BASE}/agents`); return res.json(); }
export async function fetchMetrics() { const res = await fetch(`${BASE}/metrics`); return res.json(); }
export async function fetchWorkflows() { const res = await fetch(`${BASE}/workflows`); return res.json(); }
export async function fetchAgentDetail(name: string) { const res = await fetch(`${BASE}/agents/${name}`); return res.json(); }
export async function invokeAgent(name: string, input: string) {
  const res = await fetch(`${BASE}/agents/${name}/invoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input }),
  });
  return res.json();
}
