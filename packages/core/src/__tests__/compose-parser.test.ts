import { describe, it, expect } from 'vitest';
import { parseComposeFile } from '../compose/parser.js';

const validYaml = `
name: test-pipeline
version: 1.0.0

registry:
  port: 6100

agents:
  code-review:
    path: ./agents/code-review
    port: 6101
    env:
      MODEL: deepseek/deepseek-chat

  test-writer:
    path: ./agents/test-writer
    port: 6102

workflows:
  full-review:
    description: "Full code quality pipeline"
    steps:
      - agent: code-review
        input: $input
        output: $review
      - agent: test-writer
        input: $review.code
        output: $tests
        condition: $review.score < 90

dashboard:
  enabled: true
  port: 6140

mcp:
  enabled: true
  transport: stdio
`;

describe('Compose Parser', () => {
  it('parses valid YAML', () => {
    const config = parseComposeFile(validYaml);
    expect(config.name).toBe('test-pipeline');
    expect(config.registry.port).toBe(6100);
    expect(Object.keys(config.agents)).toHaveLength(2);
    expect(config.agents['code-review'].port).toBe(6101);
    expect(config.workflows?.['full-review'].steps).toHaveLength(2);
    expect(config.dashboard?.enabled).toBe(true);
    expect(config.mcp?.enabled).toBe(true);
  });

  it('rejects YAML without name', () => {
    expect(() => parseComposeFile('version: 1.0.0\nagents:\n  a:\n    path: ./a')).toThrow();
  });

  it('interpolates environment variables', () => {
    process.env.TEST_PORT = '9999';
    const yaml = `
name: test
version: 1.0.0
registry:
  port: 6100
agents:
  my-agent:
    path: ./agent
    port: 6101
    env:
      PORT: \${TEST_PORT}
`;
    const config = parseComposeFile(yaml);
    expect(config.agents['my-agent'].env?.PORT).toBe('9999');
    delete process.env.TEST_PORT;
  });
});
