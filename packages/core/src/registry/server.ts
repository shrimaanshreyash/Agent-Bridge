import express, { type Request, type Response, type NextFunction } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AgentStore } from './store.js';
import { HealthCheckManager } from './health.js';
import type { A2AAgentCard } from '../a2a/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── SSRF protection — block cloud metadata endpoints ──────────────────────
// AgentBridge is a local dev tool so localhost/private IPs are valid agent addresses.
// We specifically block cloud metadata endpoints which are the real SSRF risk.
const BLOCKED_HOSTNAMES = new Set([
  'metadata.google.internal',       // GCP metadata
  '169.254.169.254',                 // AWS/Azure/GCP metadata IP
  'fd00:ec2::254',                   // AWS metadata IPv6
]);

function isSafeAgentUrl(raw: string): { safe: boolean; reason?: string } {
  let u: URL;
  try { u = new URL(raw); } catch { return { safe: false, reason: 'Invalid URL' }; }
  if (!['http:', 'https:'].includes(u.protocol)) return { safe: false, reason: 'URL must use http or https' };
  const host = u.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(host)) return { safe: false, reason: `Hostname "${host}" is not allowed` };
  return { safe: true };
}

// ── Simple in-memory rate limiter ──────────────────────────────────────────
const rateLimitWindows = new Map<string, { count: number; resetAt: number }>();
function rateLimit(maxReq: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip ?? 'unknown';
    const now = Date.now();
    const entry = rateLimitWindows.get(key);
    if (!entry || entry.resetAt < now) {
      rateLimitWindows.set(key, { count: 1, resetAt: now + windowMs });
      next();
    } else if (entry.count >= maxReq) {
      res.status(429).json({ error: 'Too many requests. Please slow down.' });
    } else {
      entry.count++;
      next();
    }
  };
}
// Clean up stale entries every 5 minutes to avoid memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitWindows) {
    if (entry.resetAt < now) rateLimitWindows.delete(key);
  }
}, 5 * 60 * 1000).unref();

export interface RegistryOptions {
  healthCheckInterval?: number;
}

export function createRegistryServer(options: RegistryOptions = {}) {
  const app = express();
  app.disable('x-powered-by');

  // CORS — allow any origin for GET requests; restrict mutations to same-origin or localhost
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin ?? '';
    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    if (isLocalhost || !origin) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    } else {
      // External origins: allow GET only (read-only)
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
    if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
    next();
  });

  app.use(express.json({ limit: '1mb' }));
  // Rate limit: 120 requests per minute per IP on write endpoints
  app.use('/agents', rateLimit(120, 60_000));
  app.use('/discover', rateLimit(60, 60_000));

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
    if (!card.name || !/^[a-z0-9-]+$/.test(card.name)) {
      res.status(400).json({ error: 'Agent name must be kebab-case (a-z, 0-9, hyphens)' });
      return;
    }
    if (card.url) {
      const { safe, reason } = isSafeAgentUrl(card.url);
      if (!safe) { res.status(400).json({ error: reason }); return; }
    }
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

  app.post('/agents/:name/tasks', (req, res) => {
    const { name } = req.params;
    const agent = store.get(name);
    if (!agent) { res.status(404).json({ error: 'Agent not found' }); return; }
    const { success, responseMs, taskId } = req.body as { success: boolean; responseMs: number; taskId?: string };
    store.recordTaskResult(name, success, responseMs);
    broadcast({
      type: 'task_completed', name, success, responseMs, taskId,
      timestamp: new Date().toISOString(),
    });
    res.json({ recorded: true });
  });

  app.post('/agents/:name/invoke', async (req, res) => {
    const agent = store.get(req.params.name);
    if (!agent) { res.status(404).json({ error: 'Agent not found' }); return; }
    if (!agent.card.url) { res.status(400).json({ error: 'Agent has no URL' }); return; }

    const { input } = req.body as { input?: string };
    if (typeof input !== 'string' || !input.trim()) {
      res.status(400).json({ error: 'input must be a non-empty string' }); return;
    }
    if (input.length > 32_000) {
      res.status(400).json({ error: 'input exceeds 32,000 character limit' }); return;
    }

    const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const startTime = Date.now();
    const controller = new AbortController();
    const invokeTimeout = setTimeout(() => controller.abort(), 60_000); // 60s hard timeout
    try {
      const response = await fetch(agent.card.url, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', id: taskId, method: 'tasks/send',
          params: { message: { role: 'user', parts: [{ type: 'text', text: input }] } },
        }),
      });
      const body = (await response.json()) as { result?: { status: string; result?: { parts: { type: string; text?: string; data?: unknown }[] }; error?: { message: string } }; error?: { code: number; message: string } };
      const responseMs = Date.now() - startTime;

      if (body.error) {
        store.recordTaskResult(req.params.name, false, responseMs);
        res.status(502).json({ error: body.error.message, responseMs }); return;
      }

      const task = body.result;
      const success = task?.status !== 'failed';
      store.recordTaskResult(req.params.name, success, responseMs);
      broadcast({ type: 'task_completed', name: req.params.name, success, responseMs, taskId, timestamp: new Date().toISOString() });

      const textPart = task?.result?.parts.find((p) => p.type === 'text');
      const dataPart = task?.result?.parts.find((p) => p.type === 'data');
      res.json({
        success,
        output: textPart?.text ?? (dataPart ? JSON.stringify(dataPart.data, null, 2) : null) ?? task?.error?.message ?? 'No output',
        taskId,
        responseMs,
      });
    } catch (err) {
      const responseMs = Date.now() - startTime;
      store.recordTaskResult(req.params.name, false, responseMs);
      broadcast({ type: 'task_completed', name: req.params.name, success: false, responseMs, taskId, timestamp: new Date().toISOString() });
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      res.status(isTimeout ? 504 : 502).json({
        error: isTimeout ? 'Agent timed out after 60s' : (err instanceof Error ? err.message : String(err)),
        responseMs,
      });
    } finally {
      clearTimeout(invokeTimeout);
    }
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

  // ── Production dashboard (served from built dist folder) ──────────────────
  const dashboardDist = resolve(__dirname, '../../../dashboard/dist');
  if (existsSync(dashboardDist)) {
    app.use(express.static(dashboardDist));
    // SPA catch-all: serve index.html for any non-API route
    app.get('*', (req, res, next) => {
      const isApiRoute = /^\/(agents|metrics|health|workflows|discover)/.test(req.path);
      if (isApiRoute) return next();
      res.sendFile('index.html', { root: dashboardDist });
    });
  }

  function start(port: number) {
    const httpServer = app.listen(port, () => {
      const hasDashboard = existsSync(dashboardDist);
      console.log(`AgentBridge Registry running on http://localhost:${port}`);
      if (hasDashboard) console.log(`Dashboard:             http://localhost:${port}/`);
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
