import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRegistryServer } from '../registry/server.js';
import type { A2AAgentCard } from '../a2a/types.js';

const PORT = 16100;
let server: ReturnType<typeof createRegistryServer>;
let httpServer: any;

const baseUrl = `http://localhost:${PORT}`;

const testCard: A2AAgentCard = {
  name: 'test-agent',
  description: 'A test agent',
  url: 'http://localhost:16101',
  version: '1.0.0',
  capabilities: ['testing'],
  defaultInputModes: ['text'],
  defaultOutputModes: ['text'],
  authentication: { schemes: ['none'] },
  skills: [{ id: 'execute', name: 'test-agent', description: 'A test agent' }],
};

describe('Registry Server', () => {
  beforeAll(async () => {
    server = createRegistryServer({ healthCheckInterval: 0 });
    httpServer = server.app.listen(PORT);
  });

  afterAll(() => {
    server.stop();
    httpServer.close();
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

  it('DELETE /agents/:name — removes an agent', async () => {
    const res = await fetch(`${baseUrl}/agents/test-agent`, { method: 'DELETE' });
    expect(res.status).toBe(200);
    const list = await fetch(`${baseUrl}/agents`);
    const body = await list.json();
    expect(body).toHaveLength(0);
  });
});
