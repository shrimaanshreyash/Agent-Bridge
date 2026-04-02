import { BaseAgent } from '@agentbridge/core';
import type { AgentConfig } from '@agentbridge/core';
import { testPrompt } from './prompts.js';

class TestWriterAgent extends BaseAgent {
  config: AgentConfig = {
    name: 'test-writer',
    description: 'Generates unit tests from source code',
    version: '1.0.0',
    capabilities: ['testing', 'unit-tests', 'test-generation'],
    inputs: {
      code: { type: 'string', required: true, description: 'Source code to test' },
      framework: { type: 'string', description: 'Test framework (default: vitest)' },
      issues: { type: 'array', description: 'Known issues from code review' },
    },
    outputs: {
      tests: { type: 'string', description: 'Generated test code' },
      testCount: { type: 'number', description: 'Number of test cases' },
      coverage: { type: 'array', description: 'Functions covered' },
    },
  };

  async execute(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const code = input.code as string;
    const framework = (input.framework as string) ?? 'vitest';
    const issues = input.issues as unknown[] | undefined;
    const response = await this.callLLM(testPrompt(code, framework, issues));
    try { return JSON.parse(response); }
    catch { return { tests: response, testCount: 0, coverage: [] }; }
  }
}

const agent = new TestWriterAgent();
const port = parseInt(process.env.PORT ?? '6102');
const registry = process.env.REGISTRY_URL ?? 'http://localhost:6100';
agent.start(port, registry).then(() => console.log(`test-writer agent running on port ${port}`));
