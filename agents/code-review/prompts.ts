export function reviewPrompt(code: string, language: string): string {
  return `You are a senior code reviewer. Review the following ${language} code for:
1. Bugs and logic errors
2. Security vulnerabilities
3. Best practice violations
4. Performance issues

Return your response as JSON with this exact structure:
{
  "review": "Overall review summary (2-3 sentences)",
  "score": <number 0-100>,
  "issues": [
    { "type": "bug|security|style|performance", "message": "Description", "line": <number or null> }
  ]
}

Code to review:
\`\`\`${language}
${code}
\`\`\`

Respond ONLY with valid JSON, no markdown fencing.`;
}
