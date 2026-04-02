import YAML from 'yaml';
import { z } from 'zod';

const stepSchema = z.object({
  agent: z.string(),
  input: z.unknown(),
  output: z.string().optional(),
  condition: z.string().optional(),
});

const workflowSchema = z.object({
  description: z.string().optional(),
  steps: z.array(stepSchema),
  output: z.record(z.string(), z.unknown()).optional(),
});

const agentSchema = z.object({
  path: z.string(),
  port: z.number().int().optional(),
  env: z.record(z.string(), z.coerce.string()).optional(),
});

const composeSchema = z.object({
  name: z.string().min(1),
  version: z.string().optional(),
  registry: z.object({ port: z.number().int().default(6100) }).default({ port: 6100 }),
  agents: z.record(z.string(), agentSchema),
  workflows: z.record(z.string(), workflowSchema).optional(),
  dashboard: z.object({
    enabled: z.boolean().default(false),
    port: z.number().int().default(6140),
  }).optional(),
  mcp: z.object({
    enabled: z.boolean().default(false),
    transport: z.enum(['stdio', 'http']).default('stdio'),
  }).optional(),
});

export type ComposeConfig = z.infer<typeof composeSchema>;

export function parseComposeFile(yamlContent: string): ComposeConfig {
  const interpolated = yamlContent.replace(/\$\{(\w+)\}/g, (_, key) => process.env[key] ?? '');
  const raw = YAML.parse(interpolated);
  return composeSchema.parse(raw);
}
