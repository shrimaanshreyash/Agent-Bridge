export const SYSTEM_PROMPT = `You are a senior software engineer specializing in test-driven development.
You write comprehensive, readable tests that cover happy paths, edge cases, and error conditions.
Your tests are executable — they use real framework syntax, not pseudocode.
You always respond with valid JSON, never with markdown prose.`;

export function testPrompt(code: string, framework: string, issues?: unknown[]): string {
  const issuesSection = issues?.length
    ? `\n\nKnown issues to specifically test for:\n${JSON.stringify(issues, null, 2)}\n`
    : '';

  const frameworkHints: Record<string, string> = {
    vitest: 'import { describe, it, expect, vi } from "vitest"',
    jest: 'import { describe, it, expect, jest } from "@jest/globals"',
    mocha: 'import { describe, it } from "mocha"; import { expect } from "chai"',
  };
  const importHint = frameworkHints[framework] ?? `// ${framework} test framework`;

  return `Generate comprehensive ${framework} unit tests for the following code.${issuesSection}

Requirements:
- Cover ALL public functions and methods
- Include at least 3 test cases per function: happy path, edge case, and error case
- Test boundary conditions (empty strings, null, undefined, zero, negative numbers, very large values)
- Mock external dependencies (I/O, network calls, timers) where needed
- Use descriptive test names that explain what is being tested
- Tests must be complete and runnable — no placeholders or TODOs
- Import hint: ${importHint}

Respond ONLY with this exact JSON structure:
{
  "tests": "<complete runnable test file as a string>",
  "testCount": <exact number of it() blocks>,
  "coverage": ["functionName1", "functionName2"]
}

Code to test:
\`\`\`
${code}
\`\`\``;
}
