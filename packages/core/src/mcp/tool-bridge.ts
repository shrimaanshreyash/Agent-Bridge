import type { RegisteredAgent } from '../registry/store.js';

export interface McpToolDef {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, { type: string; description?: string }>;
    required?: string[];
  };
}

export function agentToMcpTool(agent: RegisteredAgent): McpToolDef {
  const toolName = `agent_${agent.card.name.replace(/-/g, '_')}`;
  return {
    name: toolName,
    description: agent.card.description,
    inputSchema: {
      type: 'object',
      properties: {
        input: { type: 'string', description: 'Input text or JSON string for the agent' },
      },
      required: ['input'],
    },
  };
}
