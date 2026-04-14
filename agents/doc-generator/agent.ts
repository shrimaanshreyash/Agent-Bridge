import { BaseAgent } from '@agentbridge/core';
import type { AgentConfig } from '@agentbridge/core';
import { SYSTEM_PROMPT, docPrompt } from './prompts.js';

class DocGeneratorAgent extends BaseAgent {
  config: AgentConfig = {
    name: 'doc-generator',
    description: 'Generates professional documentation from source code. Supports README, JSDoc/TSDoc, and API reference formats.',
    version: '1.0.0',
    capabilities: ['documentation', 'markdown', 'api-docs', 'jsdoc'],
    inputs: {
      code: { type: 'string', required: true, description: 'Source code to document' },
      format: { type: 'string', description: 'Output format: readme | jsdoc | api-reference (default: readme)' },
    },
    outputs: {
      documentation: { type: 'string', description: 'Generated markdown documentation' },
      sections: { type: 'array', description: 'List of section headings in order' },
    },
  };

  async execute(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const code = (input.code ?? input.input ?? input.text ?? '') as string;
    if (!code.trim()) {
      return { documentation: 'No code provided.', sections: [] };
    }
    const format = (input.format as string | undefined) ?? 'readme';

    const raw = await this.callLLM(docPrompt(code, format), { system: SYSTEM_PROMPT });
    const parsed = this.parseJSON<{ documentation?: string; sections?: string[] }>(raw, {});

    return {
      documentation: parsed.documentation ?? raw,
      sections: Array.isArray(parsed.sections) ? parsed.sections : [],
      format,
    };
  }
}

const agent = new DocGeneratorAgent();
const port = parseInt(process.env.PORT ?? '6103');
const registry = process.env.REGISTRY_URL ?? 'http://localhost:6100';
agent.start(port, registry).then(() => console.log(`doc-generator agent running on port ${port}`));
