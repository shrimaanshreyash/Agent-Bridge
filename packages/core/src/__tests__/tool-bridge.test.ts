import { describe, it, expect } from 'vitest';
import { agentToMcpTool } from '../mcp/tool-bridge.js';
import type { RegisteredAgent } from '../registry/store.js';

describe('agentToMcpTool', () => {
  it('converts a registered agent to an MCP tool definition', () => {
    const agent: RegisteredAgent = {
      card: {
        name: 'code-review', description: 'Reviews code for bugs',
        url: 'http://localhost:6101', version: '1.0.0',
        capabilities: ['code-review'],
        defaultInputModes: ['text'], defaultOutputModes: ['text'],
        authentication: { schemes: ['none'] },
        skills: [{ id: 'execute', name: 'code-review', description: 'Reviews code' }],
      },
      registeredAt: new Date(), lastHealthCheck: new Date(), status: 'healthy',
      metrics: { totalTasks: 0, successCount: 0, failCount: 0, avgResponseMs: 0, p95ResponseMs: 0, p99ResponseMs: 0 },
    };
    const tool = agentToMcpTool(agent);
    expect(tool.name).toBe('agent_code_review');
    expect(tool.description).toBe('Reviews code for bugs');
    expect(tool.inputSchema).toBeDefined();
    expect(tool.inputSchema.type).toBe('object');
  });

  it('generates input schema with generic input property', () => {
    const agent: RegisteredAgent = {
      card: {
        name: 'test-agent', description: 'Test',
        url: 'http://localhost:6102', version: '1.0.0', capabilities: [],
        defaultInputModes: ['text'], defaultOutputModes: ['text'],
        authentication: { schemes: ['none'] }, skills: [],
      },
      registeredAt: new Date(), lastHealthCheck: new Date(), status: 'healthy',
      metrics: { totalTasks: 0, successCount: 0, failCount: 0, avgResponseMs: 0, p95ResponseMs: 0, p99ResponseMs: 0 },
    };
    const tool = agentToMcpTool(agent);
    expect(tool.inputSchema.properties).toHaveProperty('input');
  });
});
