import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { BaseAgent } from '../agent/base-agent.js';
import { A2AClient } from '../a2a/client.js';
import type { AgentConfig } from '../agent/agent-config.js';

class EchoAgent extends BaseAgent {
  config: AgentConfig = {
    name: 'echo-agent',
    description: 'Echoes input text',
    version: '1.0.0',
    capabilities: ['echo'],
    inputs: { text: { type: 'string', required: true, description: 'Text to echo' } },
    outputs: { echo: { type: 'string', description: 'Echoed text' } },
  };

  async execute(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return { echo: `Echo: ${input.text}` };
  }
}

const PORT = 16202;
let agent: EchoAgent;

describe('BaseAgent', () => {
  beforeAll(async () => {
    agent = new EchoAgent();
    await agent.start(PORT);
  });

  afterAll(async () => {
    await agent.stop();
  });

  it('responds to A2A tasks/send', async () => {
    const client = new A2AClient();
    const result = await client.sendTask(`http://localhost:${PORT}`, {
      role: 'user',
      parts: [{ type: 'data', data: { text: 'Hello' } }],
    });
    expect(result.status).toBe('completed');
    expect(result.result?.parts[0].data).toEqual({ echo: 'Echo: Hello' });
  });

  it('serves agent card', async () => {
    const client = new A2AClient();
    const card = await client.getAgentCard(`http://localhost:${PORT}`);
    expect(card.name).toBe('echo-agent');
    expect(card.capabilities).toEqual(['echo']);
  });

  it('responds to health check', async () => {
    const res = await fetch(`http://localhost:${PORT}/health`);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });
});
