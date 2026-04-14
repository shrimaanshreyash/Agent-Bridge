import { BaseAgent } from '@agentbridge/core';
import type { AgentConfig } from '@agentbridge/core';
import { SYSTEM_PROMPT, reviewPrompt } from './prompts.js';

class CodeReviewAgent extends BaseAgent {
  config: AgentConfig = {
    name: 'code-review',
    description: 'Reviews code for bugs, security vulnerabilities, performance issues, and best practices. Returns a quality score and detailed issue list.',
    version: '1.0.0',
    capabilities: ['code-review', 'security-scan', 'best-practices'],
    inputs: {
      code: { type: 'string', required: true, description: 'Source code to review' },
      language: { type: 'string', description: 'Programming language (auto-detected if omitted)' },
    },
    outputs: {
      review: { type: 'string', description: 'Executive summary of code quality' },
      score: { type: 'number', description: 'Quality score 0–100' },
      issues: { type: 'array', description: 'Detailed list of issues with severity and suggestions' },
    },
  };

  async execute(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    // Accept structured { code, language } or plain text { input }
    const code = (input.code ?? input.input ?? input.text ?? '') as string;
    if (!code.trim()) {
      return { review: 'No code provided.', score: 0, issues: [] };
    }
    const language = (input.language as string | undefined) ?? detectLanguage(code);

    const raw = await this.callLLM(reviewPrompt(code, language), { system: SYSTEM_PROMPT });
    const parsed = this.parseJSON<{ review?: string; score?: number; issues?: unknown[] }>(raw, {});

    return {
      review: parsed.review ?? 'Review completed.',
      score: typeof parsed.score === 'number' ? Math.max(0, Math.min(100, parsed.score)) : 50,
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      language,
    };
  }
}

function detectLanguage(code: string): string {
  if (/import\s+\w|from\s+['"]|export\s+(default|const|function|class)/.test(code)) return 'typescript';
  if (/def\s+\w+|print\(|import\s+\w/.test(code)) return 'python';
  if (/func\s+\w+|:=|package\s+main/.test(code)) return 'go';
  if (/fn\s+\w+|let\s+mut\s|println!/.test(code)) return 'rust';
  if (/public\s+(class|static)|System\.out/.test(code)) return 'java';
  return 'javascript';
}

const agent = new CodeReviewAgent();
const port = parseInt(process.env.PORT ?? '6101');
const registry = process.env.REGISTRY_URL ?? 'http://localhost:6100';
agent.start(port, registry).then(() => console.log(`code-review agent running on port ${port}`));
