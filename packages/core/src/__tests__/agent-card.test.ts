import { describe, it, expect } from 'vitest';
import { generateAgentCard } from '../agent/agent-card.js';
import type { AgentConfig } from '../agent/agent-config.js';

describe('generateAgentCard', () => {
  it('generates an A2A-compliant agent card from config', () => {
    const config: AgentConfig = {
      name: 'code-review',
      description: 'Reviews code for bugs and security',
      version: '1.0.0',
      capabilities: ['code-review', 'security-scan'],
      inputs: {
        code: { type: 'string', required: true, description: 'Source code to review' },
        language: { type: 'string', description: 'Programming language' },
      },
      outputs: {
        review: { type: 'string', description: 'Review text' },
        score: { type: 'number', description: 'Quality score 0-100' },
      },
    };

    const card = generateAgentCard(config, 'http://localhost:6101');

    expect(card.name).toBe('code-review');
    expect(card.url).toBe('http://localhost:6101');
    expect(card.version).toBe('1.0.0');
    expect(card.capabilities).toEqual(['code-review', 'security-scan']);
    expect(card.defaultInputModes).toEqual(['text']);
    expect(card.defaultOutputModes).toEqual(['text']);
    expect(card.authentication).toEqual({ schemes: ['none'] });
    expect(card.skills).toHaveLength(1);
    expect(card.skills[0].id).toBe('execute');
    expect(card.skills[0].name).toBe('code-review');
  });

  it('uses auth config when provided', () => {
    const config: AgentConfig = {
      name: 'secure-agent',
      description: 'Needs auth',
      version: '1.0.0',
      capabilities: [],
      inputs: {},
      outputs: {},
      authentication: { schemes: ['bearer'] },
    };

    const card = generateAgentCard(config, 'http://localhost:6102');
    expect(card.authentication).toEqual({ schemes: ['bearer'] });
  });
});
