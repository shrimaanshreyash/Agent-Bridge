export function docPrompt(code: string, format: string): string {
  return `You are a documentation expert. Generate ${format} documentation for the following code.

Return your response as JSON:
{
  "documentation": "<markdown documentation string>",
  "sections": ["list", "of", "section", "titles"]
}

Code:
\`\`\`
${code}
\`\`\`

Respond ONLY with valid JSON.`;
}
