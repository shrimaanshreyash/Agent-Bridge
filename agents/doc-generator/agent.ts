import { BaseAgent } from '@agentbridge/core';
import type { AgentConfig } from '@agentbridge/core';
import { docPrompt } from './prompts.js';

class DocGeneratorAgent extends BaseAgent {
  config: AgentConfig = {
    name: 'doc-generator',
    description: 'Generates documentation from source code',
    version: '1.0.0',
    capabilities: ['documentation', 'markdown', 'api-docs'],
    inputs: {
      code: { type: 'string', required: true, description: 'Source code to document' },
      format: { type: 'string', description: 'Doc format: readme, jsdoc, api-reference' },
    },
    outputs: {
      documentation: { type: 'string', description: 'Generated markdown' },
      sections: { type: 'array', description: 'Section titles' },
    },
  };

  async execute(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const code = input.code as string;
    const format = (input.format as string) ?? 'readme';
    const response = await this.callLLM(docPrompt(code, format));
    try { return JSON.parse(response); }
    catch { return { documentation: response, sections: [] }; }
  }
}

const agent = new DocGeneratorAgent();
const port = parseInt(process.env.PORT ?? '6103');
const registry = process.env.REGISTRY_URL ?? 'http://localhost:6100';
agent.start(port, registry).then(() => console.log(`doc-generator agent running on port ${port}`));
