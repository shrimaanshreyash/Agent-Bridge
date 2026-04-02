import { describe, it, expect } from 'vitest';
import { agentConfigSchema, type AgentConfig } from '../agent/agent-config.js';

describe('AgentConfig', () => {
  it('validates a correct config', () => {
    const config: AgentConfig = {
      name: 'test-agent',
      description: 'A test agent',
      version: '1.0.0',
      capabilities: ['testing'],
      inputs: {
        query: { type: 'string', required: true, description: 'Search query' },
      },
      outputs: {
        result: { type: 'string', description: 'Search result' },
      },
    };
    const result = agentConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('rejects config with missing name', () => {
    const config = {
      description: 'A test agent',
      version: '1.0.0',
      capabilities: ['testing'],
      inputs: {},
      outputs: {},
    };
    const result = agentConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('rejects config with invalid input type', () => {
    const config = {
      name: 'test-agent',
      description: 'A test agent',
      version: '1.0.0',
      capabilities: ['testing'],
      inputs: {
        query: { type: 'invalid', required: true },
      },
      outputs: {},
    };
    const result = agentConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('accepts config with optional fields', () => {
    const config: AgentConfig = {
      name: 'test-agent',
      description: 'A test agent',
      version: '1.0.0',
      capabilities: [],
      inputs: {},
      outputs: {},
      rateLimit: { maxRequests: 100, windowMs: 60000 },
    };
    const result = agentConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });
});
