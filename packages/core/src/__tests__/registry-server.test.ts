import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import { createRegistryServer } from '../registry/server.js';
import type { A2AAgentCard } from '../a2a/types.js';

const PORT = 16100;
const MOCK_AGENT_PORT = 16101;

let server: ReturnType<typeof createRegistryServer>;
let httpServer: any;
let mockAgentServer: any;

const baseUrl = `http://localhost:${PORT}`;

const testCard: A2AAgentCard = {
  name: 'test-agent',
  description: 'A test agent',
  url: `http://localhost:${MOCK_AGENT_PORT}`,
  version: '1.0.0',
  capabilities: ['testing'],
  defaultInputModes: ['text'],
  defaultOutputModes: ['text'],
  authentication: { schemes: ['none'] },
  skills: [{ id: 'execute', name: 'test-agent', description: 'A test agent' }],
};

// Mock A2A agent that the invoke endpoint calls
const mockApp = express();
mockApp.use(express.json());
mockApp.post('/', (req, res) => {
  res.json({
    jsonrpc: '2.0',
    id: req.body.id,
    result: {
      id: req.body.id,
      status: 'completed',
      message: req.body.params.message,
      result: { role: 'agent', parts: [{ type: 'text', text: 'Mock agent response' }] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  });
});

describe('Registry Server', () => {
  beforeAll(async () => {
    mockAgentServer = mockApp.listen(MOCK_AGENT_PORT);
    server = createRegistryServer({ healthCheckInterval: 0 });
    httpServer = server.app.listen(PORT);
  });

  afterAll(() => {
    server.stop();
    httpServer.close();
    mockAgentServer.close();
  });

  it('POST /agents — registers an agent', async () => {
    const res = await fetch(`${baseUrl}/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testCard),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe('test-agent');
  });

  it('POST /agents — rejects invalid agent name', async () => {
    const res = await fetch(`${baseUrl}/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...testCard, name: 'Invalid Name!' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/kebab-case/);
  });

  it('GET /agents — lists registered agents', async () => {
    const res = await fetch(`${baseUrl}/agents`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].card.name).toBe('test-agent');
  });

  it('GET /agents/:name — gets specific agent', async () => {
    const res = await fetch(`${baseUrl}/agents/test-agent`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.card.name).toBe('test-agent');
  });

  it('GET /agents/:name — returns 404 for unknown agent', async () => {
    const res = await fetch(`${baseUrl}/agents/does-not-exist`);
    expect(res.status).toBe(404);
  });

  it('POST /discover — finds agents by capability', async () => {
    const res = await fetch(`${baseUrl}/discover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ capability: 'testing' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
  });

  it('GET /.well-known/agent-card.json — returns registry agent card', async () => {
    const res = await fetch(`${baseUrl}/.well-known/agent-card.json`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('agentbridge-registry');
  });

  it('GET /metrics — returns metrics', async () => {
    const res = await fetch(`${baseUrl}/metrics`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalAgents).toBe(1);
  });

  it('GET /health — returns ok', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  // ── /invoke endpoint ────────────────────────────────────────────────────────

  it('POST /agents/:name/invoke — calls agent and returns output', async () => {
    const res = await fetch(`${baseUrl}/agents/test-agent/invoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'hello world' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.output).toBe('Mock agent response');
    expect(typeof body.responseMs).toBe('number');
    expect(typeof body.taskId).toBe('string');
  });

  it('POST /agents/:name/invoke — returns 404 for unknown agent', async () => {
    const res = await fetch(`${baseUrl}/agents/ghost/invoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'test' }),
    });
    expect(res.status).toBe(404);
  });

  it('POST /agents/:name/invoke — returns 400 for empty input', async () => {
    const res = await fetch(`${baseUrl}/agents/test-agent/invoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: '   ' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/non-empty/);
  });

  it('POST /agents/:name/invoke — updates agent task metrics', async () => {
    const before = await fetch(`${baseUrl}/metrics`).then((r) => r.json());
    const prevTasks = before.agents[0]?.metrics?.totalTasks ?? 0;

    await fetch(`${baseUrl}/agents/test-agent/invoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'metric test' }),
    });

    const after = await fetch(`${baseUrl}/metrics`).then((r) => r.json());
    expect(after.agents[0].metrics.totalTasks).toBe(prevTasks + 1);
  });

  // ── CORS headers ────────────────────────────────────────────────────────────

  it('OPTIONS /agents — returns CORS preflight headers', async () => {
    const res = await fetch(`${baseUrl}/agents`, {
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:3000' },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:3000');
  });

  it('GET /agents — includes CORS header for localhost origin', async () => {
    const res = await fetch(`${baseUrl}/agents`, {
      headers: { Origin: 'http://localhost:3000' },
    });
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:3000');
  });

  it('DELETE /agents/:name — removes an agent', async () => {
    const res = await fetch(`${baseUrl}/agents/test-agent`, { method: 'DELETE' });
    expect(res.status).toBe(200);
    const list = await fetch(`${baseUrl}/agents`);
    const body = await list.json();
    expect(body).toHaveLength(0);
  });
});
