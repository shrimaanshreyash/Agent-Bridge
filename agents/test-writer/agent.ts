import { BaseAgent } from '@agentbridge/core';
import type { AgentConfig } from '@agentbridge/core';
import { SYSTEM_PROMPT, testPrompt } from './prompts.js';

class TestWriterAgent extends BaseAgent {
  config: AgentConfig = {
    name: 'test-writer',
    description: 'Generates comprehensive unit tests from source code. Covers happy paths, edge cases, and error conditions.',
    version: '1.0.0',
    capabilities: ['testing', 'unit-tests', 'test-generation', 'vitest', 'jest'],
    inputs: {
      code: { type: 'string', required: true, description: 'Source code to generate tests for' },
      framework: { type: 'string', description: 'Test framework: vitest | jest | mocha (default: vitest)' },
      issues: { type: 'array', description: 'Known issues from code review to specifically test for' },
    },
    outputs: {
      tests: { type: 'string', description: 'Complete runnable test file' },
      testCount: { type: 'number', description: 'Number of test cases generated' },
      coverage: { type: 'array', description: 'List of function names covered by the tests' },
    },
  };

  async execute(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const code = (input.code ?? input.input ?? input.text ?? '') as string;
    if (!code.trim()) {
      return { tests: '// No code provided', testCount: 0, coverage: [] };
    }
    const framework = (input.framework as string | undefined) ?? 'vitest';
    const issues = Array.isArray(input.issues) ? input.issues : undefined;

    const raw = await this.callLLM(testPrompt(code, framework, issues), { system: SYSTEM_PROMPT });
    const parsed = this.parseJSON<{ tests?: string; testCount?: number; coverage?: string[] }>(raw, {});

    return {
      tests: parsed.tests ?? raw,
      testCount: typeof parsed.testCount === 'number' ? parsed.testCount : 0,
      coverage: Array.isArray(parsed.coverage) ? parsed.coverage : [],
      framework,
    };
  }
}

const agent = new TestWriterAgent();
const port = parseInt(process.env.PORT ?? '6102');
const registry = process.env.REGISTRY_URL ?? 'http://localhost:6100';
agent.start(port, registry).then(() => console.log(`test-writer agent running on port ${port}`));
