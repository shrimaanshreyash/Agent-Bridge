import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import { A2AClient } from '../a2a/client.js';
import type { A2ATask, JsonRpcRequest } from '../a2a/types.js';

const mockApp = express();
mockApp.use(express.json());

const mockTask: A2ATask = {
  id: 'test-task-1',
  status: 'completed',
  message: { role: 'user', parts: [{ type: 'text', text: 'Hello' }] },
  result: { role: 'agent', parts: [{ type: 'text', text: 'Hi back!' }] },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

mockApp.post('/', (req, res) => {
  const rpc = req.body as JsonRpcRequest;
  if (rpc.method === 'tasks/send') {
    res.json({ jsonrpc: '2.0', id: rpc.id, result: mockTask });
  } else if (rpc.method === 'tasks/get') {
    res.json({ jsonrpc: '2.0', id: rpc.id, result: mockTask });
  } else if (rpc.method === 'tasks/cancel') {
    res.json({ jsonrpc: '2.0', id: rpc.id, result: { ...mockTask, status: 'cancelled' } });
  } else {
    res.json({ jsonrpc: '2.0', id: rpc.id, error: { code: -32601, message: 'Method not found' } });
  }
});

mockApp.get('/.well-known/agent-card.json', (_req, res) => {
  res.json({ name: 'mock-agent', description: 'Mock', url: 'http://localhost:16200' });
});

let mockServer: any;
const MOCK_PORT = 16200;

describe('A2AClient', () => {
  beforeAll(() => { mockServer = mockApp.listen(MOCK_PORT); });
  afterAll(() => { mockServer.close(); });

  it('sends a task and gets result', async () => {
    const client = new A2AClient();
    const result = await client.sendTask(`http://localhost:${MOCK_PORT}`, {
      role: 'user', parts: [{ type: 'text', text: 'Hello' }],
    });
    expect(result.status).toBe('completed');
    expect(result.result?.parts[0].text).toBe('Hi back!');
  });

  it('gets a task by id', async () => {
    const client = new A2AClient();
    const result = await client.getTask(`http://localhost:${MOCK_PORT}`, 'test-task-1');
    expect(result.id).toBe('test-task-1');
  });

  it('cancels a task', async () => {
    const client = new A2AClient();
    const result = await client.cancelTask(`http://localhost:${MOCK_PORT}`, 'test-task-1');
    expect(result.status).toBe('cancelled');
  });

  it('fetches agent card', async () => {
    const client = new A2AClient();
    const card = await client.getAgentCard(`http://localhost:${MOCK_PORT}`);
    expect(card.name).toBe('mock-agent');
  });
});
