import { BaseAgent } from '@agentbridge/core';
import type { AgentConfig } from '@agentbridge/core';
import { reviewPrompt } from './prompts.js';

class CodeReviewAgent extends BaseAgent {
  config: AgentConfig = {
    name: 'code-review',
    description: 'Reviews code for bugs, security issues, and best practices',
    version: '1.0.0',
    capabilities: ['code-review', 'security-scan', 'best-practices'],
    inputs: {
      code: { type: 'string', required: true, description: 'Source code to review' },
      language: { type: 'string', description: 'Programming language (default: typescript)' },
    },
    outputs: {
      review: { type: 'string', description: 'Review summary' },
      score: { type: 'number', description: 'Quality score 0-100' },
      issues: { type: 'array', description: 'List of issues found' },
    },
  };

  async execute(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const code = input.code as string;
    const language = (input.language as string) ?? 'typescript';
    const response = await this.callLLM(reviewPrompt(code, language));
    try {
      const parsed = JSON.parse(response);
      return { review: parsed.review ?? 'No review generated', score: parsed.score ?? 50, issues: parsed.issues ?? [] };
    } catch {
      return { review: response, score: 50, issues: [] };
    }
  }
}

const agent = new CodeReviewAgent();
const port = parseInt(process.env.PORT ?? '6101');
const registry = process.env.REGISTRY_URL ?? 'http://localhost:6100';
agent.start(port, registry).then(() => console.log(`code-review agent running on port ${port}`));
