import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { AgentStore } from './store.js';
import { HealthCheckManager } from './health.js';
import type { A2AAgentCard } from '../a2a/types.js';

export interface RegistryOptions {
  healthCheckInterval?: number;
}

export function createRegistryServer(options: RegistryOptions = {}) {
  const app = express();
  app.use(express.json());

  const store = new AgentStore();
  const wsClients = new Set<WebSocket>();

  function broadcast(event: Record<string, unknown>) {
    const data = JSON.stringify(event);
    for (const ws of wsClients) {
      if (ws.readyState === WebSocket.OPEN) ws.send(data);
    }
  }

  const healthManager = new HealthCheckManager(
    store,
    options.healthCheckInterval ?? 10_000,
    (name, status) => broadcast({ type: 'health_change', name, status, timestamp: new Date().toISOString() }),
  );

  app.get('/.well-known/agent-card.json', (_req, res) => {
    res.json({
      name: 'agentbridge-registry',
      description: 'AgentBridge Agent Registry — discovers and manages AI agents',
      url: '', version: '0.1.0',
      capabilities: ['registry', 'discovery'],
      defaultInputModes: ['text'], defaultOutputModes: ['text'],
      authentication: { schemes: ['none'] }, skills: [],
    });
  });

  app.post('/agents', (req, res) => {
    const card = req.body as A2AAgentCard;
    if (!card.name) { res.status(400).json({ error: 'Agent card must have a name' }); return; }
    store.register(card);
    broadcast({ type: 'agent_registered', name: card.name, timestamp: new Date().toISOString() });
    res.status(201).json(card);
  });

  app.get('/agents', (_req, res) => { res.json(store.list()); });

  app.get('/agents/:name', (req, res) => {
    const agent = store.get(req.params.name);
    if (!agent) { res.status(404).json({ error: 'Agent not found' }); return; }
    res.json(agent);
  });

  app.delete('/agents/:name', (req, res) => {
    const removed = store.remove(req.params.name);
    if (!removed) { res.status(404).json({ error: 'Agent not found' }); return; }
    broadcast({ type: 'agent_removed', name: req.params.name, timestamp: new Date().toISOString() });
    res.json({ removed: true });
  });

  app.post('/discover', (req, res) => {
    const { capability } = req.body as { capability: string };
    res.json(store.discover(capability));
  });

  app.get('/metrics', (_req, res) => {
    const agents = store.list();
    res.json({
      totalAgents: agents.length,
      healthyAgents: agents.filter((a) => a.status === 'healthy').length,
      unhealthyAgents: agents.filter((a) => a.status === 'unhealthy').length,
      agents: agents.map((a) => ({ name: a.card.name, status: a.status, metrics: a.metrics })),
    });
  });

  app.get('/health', (_req, res) => { res.json({ status: 'ok', uptime: process.uptime() }); });

  let workflows: Record<string, unknown>[] = [];
  app.get('/workflows', (_req, res) => { res.json(workflows); });

  function start(port: number) {
    const httpServer = app.listen(port, () => {
      console.log(`AgentBridge Registry running on http://localhost:${port}`);
    });
    const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
    wss.on('connection', (ws) => {
      wsClients.add(ws);
      ws.on('close', () => wsClients.delete(ws));
    });
    if (options.healthCheckInterval !== 0) healthManager.start();
    return httpServer;
  }

  function stop() { healthManager.stop(); }
  function setWorkflows(w: Record<string, unknown>[]) { workflows = w; }

  return { app, store, start, stop, broadcast, setWorkflows };
}
