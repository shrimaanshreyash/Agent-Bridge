import { describe, it, expect, beforeEach } from 'vitest';
import { AgentStore, type RegisteredAgent } from '../registry/store.js';
import type { A2AAgentCard } from '../a2a/types.js';

const makeCard = (name: string): A2AAgentCard => ({
  name,
  description: `${name} agent`,
  url: `http://localhost:${6100 + Math.floor(Math.random() * 100)}`,
  version: '1.0.0',
  capabilities: ['test'],
  defaultInputModes: ['text'],
  defaultOutputModes: ['text'],
  authentication: { schemes: ['none'] },
  skills: [{ id: 'execute', name, description: `${name} agent` }],
});

describe('AgentStore', () => {
  let store: AgentStore;

  beforeEach(() => {
    store = new AgentStore();
  });

  it('registers and retrieves an agent', () => {
    const card = makeCard('agent-a');
    store.register(card);
    const agent = store.get('agent-a');
    expect(agent).toBeDefined();
    expect(agent!.card.name).toBe('agent-a');
    expect(agent!.status).toBe('unknown');
  });

  it('lists all registered agents', () => {
    store.register(makeCard('agent-a'));
    store.register(makeCard('agent-b'));
    const all = store.list();
    expect(all).toHaveLength(2);
  });

  it('removes an agent', () => {
    store.register(makeCard('agent-a'));
    const removed = store.remove('agent-a');
    expect(removed).toBe(true);
    expect(store.get('agent-a')).toBeUndefined();
  });

  it('discovers agents by capability', () => {
    const cardA = makeCard('agent-a');
    cardA.capabilities = ['code-review', 'testing'];
    const cardB = makeCard('agent-b');
    cardB.capabilities = ['documentation'];
    store.register(cardA);
    store.register(cardB);

    const found = store.discover('code-review');
    expect(found).toHaveLength(1);
    expect(found[0].card.name).toBe('agent-a');
  });

  it('updates health status', () => {
    store.register(makeCard('agent-a'));
    store.updateHealth('agent-a', 'healthy');
    const agent = store.get('agent-a');
    expect(agent!.status).toBe('healthy');
  });

  it('updates metrics', () => {
    store.register(makeCard('agent-a'));
    store.recordTaskResult('agent-a', true, 150);
    const agent = store.get('agent-a');
    expect(agent!.metrics.totalTasks).toBe(1);
    expect(agent!.metrics.successCount).toBe(1);
    expect(agent!.metrics.avgResponseMs).toBe(150);
  });
});
