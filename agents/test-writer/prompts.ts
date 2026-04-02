export function testPrompt(code: string, framework: string, issues?: unknown[]): string {
  const issuesSection = issues?.length
    ? `\n\nPay special attention to these known issues:\n${JSON.stringify(issues, null, 2)}`
    : '';
  return `You are a testing expert. Generate ${framework} unit tests for the following code.${issuesSection}

Return your response as JSON:
{
  "tests": "<full test file code as a string>",
  "testCount": <number of test cases>,
  "coverage": ["list", "of", "function", "names", "tested"]
}

Code:
\`\`\`
${code}
\`\`\`

Respond ONLY with valid JSON.`;
}
