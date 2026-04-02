import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createA2AServer } from '../a2a/server.js';
import { A2AClient } from '../a2a/client.js';
import type { A2AAgentCard } from '../a2a/types.js';

const PORT = 16201;
const card: A2AAgentCard = {
  name: 'echo-agent', description: 'Echoes input',
  url: `http://localhost:${PORT}`, version: '1.0.0',
  capabilities: ['echo'], defaultInputModes: ['text'], defaultOutputModes: ['text'],
  authentication: { schemes: ['none'] },
  skills: [{ id: 'execute', name: 'echo-agent', description: 'Echoes input' }],
};

let server: ReturnType<typeof createA2AServer>;
let httpServer: any;

describe('A2A Server', () => {
  beforeAll(() => {
    server = createA2AServer({
      card,
      handler: async (message) => {
        const inputText = message.parts.find((p) => p.type === 'text')?.text ?? '';
        return { role: 'agent', parts: [{ type: 'text', text: `Echo: ${inputText}` }] };
      },
    });
    httpServer = server.app.listen(PORT);
  });

  afterAll(() => { httpServer.close(); });

  it('handles tasks/send and returns completed task', async () => {
    const client = new A2AClient();
    const result = await client.sendTask(`http://localhost:${PORT}`, {
      role: 'user', parts: [{ type: 'text', text: 'Hello World' }],
    });
    expect(result.status).toBe('completed');
    expect(result.result?.parts[0].text).toBe('Echo: Hello World');
  });

  it('serves agent card at /.well-known/agent-card.json', async () => {
    const client = new A2AClient();
    const fetchedCard = await client.getAgentCard(`http://localhost:${PORT}`);
    expect(fetchedCard.name).toBe('echo-agent');
  });

  it('responds to health check', async () => {
    const res = await fetch(`http://localhost:${PORT}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });
});
