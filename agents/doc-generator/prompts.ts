export const SYSTEM_PROMPT = `You are a technical documentation expert who writes clear, accurate, developer-friendly docs.
You understand code deeply and translate it into documentation that helps developers use and understand it quickly.
You always respond with valid JSON, never with markdown prose.`;

export function docPrompt(code: string, format: string): string {
  const formatInstructions: Record<string, string> = {
    readme: 'a README.md covering: what it does, installation, usage with examples, API reference, and configuration',
    jsdoc: 'JSDoc/TSDoc comments for every function, class, and type — ready to paste above each definition',
    'api-reference': 'a complete API reference with function signatures, parameter descriptions, return types, and usage examples',
  };

  const instruction = formatInstructions[format] ?? `${format} documentation`;

  return `Generate ${instruction} for the following code.

Requirements:
- Be specific and accurate — reference actual function names, parameters, and return values from the code
- Include at least one concrete usage example per public function or class
- Use correct technical terminology
- Write for developers who have never seen this code before

Respond ONLY with this exact JSON structure:
{
  "documentation": "<complete markdown documentation as a single string with actual newlines>",
  "sections": ["array", "of", "section", "headings", "in", "order"]
}

Code:
\`\`\`
${code}
\`\`\``;
}
