export const SYSTEM_PROMPT = `You are an expert code reviewer with 15+ years of experience in software engineering.
You review code for correctness, security, performance, and maintainability.
You give direct, actionable feedback — not vague suggestions.
You always respond with valid JSON, never with markdown prose.`;

export function reviewPrompt(code: string, language: string): string {
  return `Review the following ${language} code thoroughly.

Identify ALL of the following:
- Bugs and logic errors (anything that would cause incorrect behavior)
- Security vulnerabilities (injection, XSS, auth bypass, SSRF, insecure defaults, etc.)
- Performance issues (unnecessary loops, blocking I/O, memory leaks, etc.)
- Best practice violations (naming, structure, error handling, etc.)
- Missing edge case handling

Scoring guide:
- 90-100: Production-ready, minor style issues only
- 70-89: Works but has meaningful improvements needed
- 50-69: Has bugs or security issues that must be fixed
- 0-49: Serious problems, needs significant rework

Respond ONLY with this exact JSON structure:
{
  "review": "2-3 sentence executive summary of the code quality",
  "score": <integer 0-100>,
  "issues": [
    {
      "type": "bug" | "security" | "performance" | "style",
      "severity": "critical" | "high" | "medium" | "low",
      "message": "Clear description of the issue",
      "line": <line number or null>,
      "suggestion": "Specific fix or improvement"
    }
  ]
}

Code to review (${language}):
\`\`\`${language}
${code}
\`\`\``;
}
