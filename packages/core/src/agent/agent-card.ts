import type { AgentConfig } from './agent-config.js';
import type { A2AAgentCard } from '../a2a/types.js';

export function generateAgentCard(config: AgentConfig, url: string): A2AAgentCard {
  return {
    name: config.name,
    description: config.description,
    url,
    version: config.version,
    capabilities: config.capabilities,
    defaultInputModes: ['text'],
    defaultOutputModes: ['text'],
    authentication: config.authentication ?? { schemes: ['none'] },
    skills: [
      {
        id: 'execute',
        name: config.name,
        description: config.description,
      },
    ],
  };
}
