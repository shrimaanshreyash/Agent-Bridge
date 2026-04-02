import { z } from 'zod';

const inputSchemaZ = z.object({
  type: z.enum(['string', 'number', 'boolean', 'array', 'object']),
  required: z.boolean().optional(),
  default: z.unknown().optional(),
  description: z.string().optional(),
});

const outputSchemaZ = z.object({
  type: z.enum(['string', 'number', 'boolean', 'array', 'object']),
  description: z.string().optional(),
});

const rateLimitZ = z.object({
  maxRequests: z.number().int().positive(),
  windowMs: z.number().int().positive(),
});

export const agentConfigSchema = z.object({
  name: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Must be kebab-case'),
  description: z.string().min(1),
  version: z.string().min(1),
  capabilities: z.array(z.string()),
  inputs: z.record(z.string(), inputSchemaZ),
  outputs: z.record(z.string(), outputSchemaZ),
  authentication: z.object({ schemes: z.array(z.string()) }).optional(),
  rateLimit: rateLimitZ.optional(),
});

export type AgentConfig = z.infer<typeof agentConfigSchema>;
export type InputSchema = z.infer<typeof inputSchemaZ>;
export type OutputSchema = z.infer<typeof outputSchemaZ>;
