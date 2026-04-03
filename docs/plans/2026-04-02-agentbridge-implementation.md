# AgentBridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an open-source MCP + A2A framework for building, registering, discovering, and orchestrating AI agents — with CLI, dashboard, and framework adapters.

**Architecture:** TypeScript monorepo (Turborepo + npm workspaces) with 3 main packages (`core`, `cli`, `dashboard`), 3 adapter packages, and 3 demo agents. Core handles agent SDK, A2A protocol, MCP bridging, registry, message bus, and compose engine. Everything communicates via A2A protocol; MCP server auto-exposes agents as tools for Claude Code/Cursor.

**Tech Stack:** TypeScript 5.5+, Express 4, @modelcontextprotocol/sdk, zod, ws, React 19, Vite, Tailwind CSS, Framer Motion, React Flow, commander, Turborepo

**Design Spec:** `C:\AgentBridge\DESIGN.md` — the single source of truth for all architectural decisions.

---

## File Structure

```
C:\AgentBridge\
├── package.json                    Root workspace config (npm workspaces)
├── turbo.json                      Turborepo pipeline config
├── tsconfig.base.json              Shared TypeScript config
├── agentbridge.yaml                Root example compose file
├── .env.example                    Environment variable template
├── .gitignore
├── LICENSE
├── README.md
├── CONTRIBUTING.md
├── DESIGN.md                       (exists)
│
├── packages/
│   ├── core/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsup.config.ts
│   │   ├── vitest.config.ts
│   │   └── src/
│   │       ├── index.ts                Public API exports
│   │       ├── agent/
│   │       │   ├── base-agent.ts       BaseAgent class
│   │       │   ├── agent-config.ts     AgentConfig types + zod schemas
│   │       │   ├── agent-server.ts     HTTP server wrapper for agents
│   │       │   └── agent-card.ts       Auto-generate A2A Agent Card
│   │       ├── registry/
│   │       │   ├── server.ts           Express server with registry endpoints
│   │       │   ├── store.ts            In-memory agent store
│   │       │   ├── discovery.ts        A2A discovery logic
│   │       │   └── health.ts           Health check manager
│   │       ├── a2a/
│   │       │   ├── types.ts            A2A protocol types
│   │       │   ├── client.ts           A2A client (send tasks)
│   │       │   ├── server.ts           A2A server (receive tasks)
│   │       │   └── task-manager.ts     Task state machine
│   │       ├── mcp/
│   │       │   ├── server.ts           MCP server using SDK
│   │       │   ├── tool-bridge.ts      Agent -> MCP tool conversion
│   │       │   └── transport.ts        stdio + HTTP transport
│   │       ├── bus/
│   │       │   ├── bus.ts              In-memory message router
│   │       │   ├── logger.ts           Message logging
│   │       │   └── websocket.ts        WebSocket broadcast
│   │       └── compose/
│   │           ├── parser.ts           YAML parser + zod validation
│   │           ├── executor.ts         Workflow executor
│   │           └── process.ts          Agent process manager
│   │
│   ├── cli/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsup.config.ts
│   │   ├── bin/
│   │   │   └── agentbridge.ts          CLI binary entry
│   │   └── src/
│   │       ├── index.ts                CLI entry (commander)
│   │       ├── commands/
│   │       │   ├── init.ts             Scaffold new agent
│   │       │   ├── up.ts               Start from YAML
│   │       │   ├── dev.ts              Dev mode with hot reload
│   │       │   ├── register.ts         Register agent
│   │       │   ├── list.ts             List agents
│   │       │   ├── test.ts             Test communication
│   │       │   ├── call.ts             Invoke agent
│   │       │   ├── mcp.ts              Start MCP server
│   │       │   └── dashboard.ts        Start dashboard
│   │       ├── templates/
│   │       │   ├── basic/
│   │       │   │   ├── agent.ts.tmpl
│   │       │   │   ├── agent.config.yaml.tmpl
│   │       │   │   └── package.json.tmpl
│   │       │   ├── with-tools/
│   │       │   │   └── agent.ts.tmpl
│   │       │   └── with-memory/
│   │       │       └── agent.ts.tmpl
│   │       └── utils/
│   │           ├── logger.ts           CLI output formatting
│   │           └── table.ts            Table rendering
│   │
│   ├── dashboard/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── postcss.config.js
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx
│   │       ├── lib/
│   │       │   ├── api.ts              REST client for registry
│   │       │   └── theme.ts            Design tokens
│   │       ├── hooks/
│   │       │   ├── useWebSocket.ts     WebSocket connection
│   │       │   ├── useAgents.ts        Agent list fetch
│   │       │   └── useMetrics.ts       Metrics fetch
│   │       ├── components/
│   │       │   ├── Layout.tsx          Sidebar + header
│   │       │   ├── AgentCard.tsx       Agent card component
│   │       │   ├── StatusDot.tsx       Pulsing indicator
│   │       │   ├── MessageRow.tsx      Message in flow
│   │       │   ├── NumberTicker.tsx    Count-up animation
│   │       │   ├── ProgressBar.tsx     Gradient bar
│   │       │   ├── WorkflowNode.tsx    React Flow node
│   │       │   └── WorkflowEdge.tsx    Animated edge
│   │       └── pages/
│   │           ├── Registry.tsx        Agent cards grid
│   │           ├── MessageFlow.tsx     Live message stream
│   │           ├── Workflows.tsx       Workflow visualizer
│   │           └── Health.tsx          Health & metrics
│   │
│   ├── adapter-langchain/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── adapter.ts
│   │       └── index.ts
│   │
│   ├── adapter-crewai/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── adapter.ts
│   │       └── index.ts
│   │
│   └── adapter-openai-agents/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── adapter.ts
│           └── index.ts
│
├── agents/
│   ├── code-review/
│   │   ├── agent.ts
│   │   ├── agent.config.yaml
│   │   ├── prompts.ts
│   │   └── package.json
│   ├── doc-generator/
│   │   ├── agent.ts
│   │   ├── agent.config.yaml
│   │   ├── prompts.ts
│   │   └── package.json
│   └── test-writer/
│       ├── agent.ts
│       ├── agent.config.yaml
│       ├── prompts.ts
│       └── package.json
│
└── examples/
    ├── basic-workflow/
    │   ├── agentbridge.yaml
    │   └── README.md
    └── claude-code-setup/
        ├── README.md
        └── mcp-config.json
```

---

## Day 1: Foundation

---

### Task 1: Monorepo Scaffold

**Files:**
- Create: `package.json`, `turbo.json`, `tsconfig.base.json`, `.gitignore`, `.env.example`
- Create: `packages/core/package.json`, `packages/core/tsconfig.json`, `packages/core/tsup.config.ts`, `packages/core/vitest.config.ts`
- Create: `packages/core/src/index.ts`

- [ ] **Step 1: Initialize git repo and create root package.json**

```bash
cd C:\AgentBridge
git init
```

```json
// package.json
{
  "name": "agentbridge",
  "version": "0.1.0",
  "private": true,
  "description": "MCP + A2A framework for building, registering, discovering, and orchestrating AI agents",
  "workspaces": [
    "packages/*",
    "agents/*"
  ],
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "test": "turbo test",
    "lint": "turbo lint",
    "clean": "turbo clean"
  },
  "devDependencies": {
    "turbo": "^2.3.0",
    "typescript": "^5.5.0"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

- [ ] **Step 2: Create turbo.json**

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

- [ ] **Step 3: Create tsconfig.base.json**

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "outDir": "dist",
    "rootDir": "src"
  }
}
```

- [ ] **Step 4: Create .gitignore and .env.example**

```gitignore
# .gitignore
node_modules/
dist/
.turbo/
*.tsbuildinfo
.env
.DS_Store
```

```bash
# .env.example
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

- [ ] **Step 5: Create core package scaffolding**

```json
// packages/core/package.json
{
  "name": "@agentbridge/core",
  "version": "0.1.0",
  "description": "Core runtime for AgentBridge — agent SDK, registry, A2A, MCP, message bus, compose engine",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "clean": "rm -rf dist .turbo"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.12.0",
    "express": "^4.21.0",
    "ws": "^8.18.0",
    "yaml": "^2.5.0",
    "zod": "^3.23.0",
    "uuid": "^10.0.0",
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/ws": "^8.5.0",
    "@types/uuid": "^10.0.0",
    "tsup": "^8.3.0",
    "vitest": "^2.1.0",
    "typescript": "^5.5.0"
  }
}
```

```json
// packages/core/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
```

```typescript
// packages/core/tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
});
```

```typescript
// packages/core/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
```

```typescript
// packages/core/src/index.ts
// Public API — exports added as modules are built
export {};
```

- [ ] **Step 6: Install dependencies and verify build**

```bash
cd C:\AgentBridge
npm install
npx turbo build
```

Expected: Clean build with `dist/index.js` and `dist/index.d.ts` in `packages/core/dist/`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: monorepo scaffold — turbo, npm workspaces, core package skeleton"
```

---

### Task 2: A2A Types and Agent Config

**Files:**
- Create: `packages/core/src/a2a/types.ts`
- Create: `packages/core/src/agent/agent-config.ts`
- Create: `packages/core/src/__tests__/agent-config.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write the A2A protocol types**

```typescript
// packages/core/src/a2a/types.ts

// ── A2A Protocol Types (spec-compliant) ──

export interface A2AAgentCard {
  name: string;
  description: string;
  url: string;
  version: string;
  capabilities: string[];
  defaultInputModes: string[];
  defaultOutputModes: string[];
  authentication: { schemes: string[] };
  skills: A2ASkill[];
}

export interface A2ASkill {
  id: string;
  name: string;
  description: string;
}

export interface A2ATask {
  id: string;
  status: A2ATaskStatus;
  message: A2AMessage;
  result?: A2AMessage;
  error?: A2AError;
  createdAt: string;
  updatedAt: string;
}

export type A2ATaskStatus = 'submitted' | 'working' | 'completed' | 'failed' | 'cancelled';

export interface A2AMessage {
  role: 'user' | 'agent';
  parts: A2APart[];
}

export interface A2APart {
  type: 'text' | 'data' | 'file';
  text?: string;
  data?: Record<string, unknown>;
  file?: { name: string; mimeType: string; data: string };
}

export interface A2AError {
  code: number;
  message: string;
  data?: unknown;
}

// ── JSON-RPC Types ──

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: unknown;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}
```

- [ ] **Step 2: Write the failing test for AgentConfig validation**

```typescript
// packages/core/src/__tests__/agent-config.test.ts
import { describe, it, expect } from 'vitest';
import { agentConfigSchema, type AgentConfig } from '../agent/agent-config.js';

describe('AgentConfig', () => {
  it('validates a correct config', () => {
    const config: AgentConfig = {
      name: 'test-agent',
      description: 'A test agent',
      version: '1.0.0',
      capabilities: ['testing'],
      inputs: {
        query: { type: 'string', required: true, description: 'Search query' },
      },
      outputs: {
        result: { type: 'string', description: 'Search result' },
      },
    };
    const result = agentConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('rejects config with missing name', () => {
    const config = {
      description: 'A test agent',
      version: '1.0.0',
      capabilities: ['testing'],
      inputs: {},
      outputs: {},
    };
    const result = agentConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('rejects config with invalid input type', () => {
    const config = {
      name: 'test-agent',
      description: 'A test agent',
      version: '1.0.0',
      capabilities: ['testing'],
      inputs: {
        query: { type: 'invalid', required: true },
      },
      outputs: {},
    };
    const result = agentConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('accepts config with optional fields', () => {
    const config: AgentConfig = {
      name: 'test-agent',
      description: 'A test agent',
      version: '1.0.0',
      capabilities: [],
      inputs: {},
      outputs: {},
      rateLimit: { maxRequests: 100, windowMs: 60000 },
    };
    const result = agentConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd C:\AgentBridge
npx turbo test --filter=@agentbridge/core
```

Expected: FAIL — `../agent/agent-config.js` does not exist.

- [ ] **Step 4: Write the AgentConfig types and zod schema**

```typescript
// packages/core/src/agent/agent-config.ts
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
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd C:\AgentBridge
npx turbo test --filter=@agentbridge/core
```

Expected: 4 tests PASS.

- [ ] **Step 6: Export from index.ts**

```typescript
// packages/core/src/index.ts
export { agentConfigSchema, type AgentConfig, type InputSchema, type OutputSchema } from './agent/agent-config.js';
export type {
  A2AAgentCard, A2ASkill, A2ATask, A2ATaskStatus, A2AMessage, A2APart, A2AError,
  JsonRpcRequest, JsonRpcResponse,
} from './a2a/types.js';
```

- [ ] **Step 7: Build and commit**

```bash
cd C:\AgentBridge
npx turbo build
git add -A
git commit -m "feat: A2A types and AgentConfig with zod validation"
```

---

### Task 3: Agent Card Generator

**Files:**
- Create: `packages/core/src/agent/agent-card.ts`
- Create: `packages/core/src/__tests__/agent-card.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/core/src/__tests__/agent-card.test.ts
import { describe, it, expect } from 'vitest';
import { generateAgentCard } from '../agent/agent-card.js';
import type { AgentConfig } from '../agent/agent-config.js';

describe('generateAgentCard', () => {
  it('generates an A2A-compliant agent card from config', () => {
    const config: AgentConfig = {
      name: 'code-review',
      description: 'Reviews code for bugs and security',
      version: '1.0.0',
      capabilities: ['code-review', 'security-scan'],
      inputs: {
        code: { type: 'string', required: true, description: 'Source code to review' },
        language: { type: 'string', description: 'Programming language' },
      },
      outputs: {
        review: { type: 'string', description: 'Review text' },
        score: { type: 'number', description: 'Quality score 0-100' },
      },
    };

    const card = generateAgentCard(config, 'http://localhost:6101');

    expect(card.name).toBe('code-review');
    expect(card.url).toBe('http://localhost:6101');
    expect(card.version).toBe('1.0.0');
    expect(card.capabilities).toEqual(['code-review', 'security-scan']);
    expect(card.defaultInputModes).toEqual(['text']);
    expect(card.defaultOutputModes).toEqual(['text']);
    expect(card.authentication).toEqual({ schemes: ['none'] });
    expect(card.skills).toHaveLength(1);
    expect(card.skills[0].id).toBe('execute');
    expect(card.skills[0].name).toBe('code-review');
  });

  it('uses auth config when provided', () => {
    const config: AgentConfig = {
      name: 'secure-agent',
      description: 'Needs auth',
      version: '1.0.0',
      capabilities: [],
      inputs: {},
      outputs: {},
      authentication: { schemes: ['bearer'] },
    };

    const card = generateAgentCard(config, 'http://localhost:6102');
    expect(card.authentication).toEqual({ schemes: ['bearer'] });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx turbo test --filter=@agentbridge/core
```

Expected: FAIL — `agent-card.js` does not exist.

- [ ] **Step 3: Implement generateAgentCard**

```typescript
// packages/core/src/agent/agent-card.ts
import type { AgentConfig } from './agent-config.js';
import type { A2AAgentCard } from '../a2a/types.js';

export function generateAgentCard(config: AgentConfig, url: string): A2AAgentCard {
  return {
    name: config.name,
    description: config.description,
    url,
    version: config.version,
    capabilities: config.capabilities,
    defaultInputModes: ['text'],
    defaultOutputModes: ['text'],
    authentication: config.authentication ?? { schemes: ['none'] },
    skills: [
      {
        id: 'execute',
        name: config.name,
        description: config.description,
      },
    ],
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx turbo test --filter=@agentbridge/core
```

Expected: All tests PASS.

- [ ] **Step 5: Add export to index.ts and commit**

Add to `packages/core/src/index.ts`:
```typescript
export { generateAgentCard } from './agent/agent-card.js';
```

```bash
npx turbo build
git add -A
git commit -m "feat: agent card generator — converts AgentConfig to A2A Agent Card"
```

---

### Task 4: In-Memory Agent Store

**Files:**
- Create: `packages/core/src/registry/store.ts`
- Create: `packages/core/src/__tests__/store.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/core/src/__tests__/store.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { AgentStore, type RegisteredAgent } from '../registry/store.js';
import type { A2AAgentCard } from '../a2a/types.js';

const makeCard = (name: string): A2AAgentCard => ({
  name,
  description: `${name} agent`,
  url: `http://localhost:${6100 + Math.floor(Math.random() * 100)}`,
  version: '1.0.0',
  capabilities: ['test'],
  defaultInputModes: ['text'],
  defaultOutputModes: ['text'],
  authentication: { schemes: ['none'] },
  skills: [{ id: 'execute', name, description: `${name} agent` }],
});

describe('AgentStore', () => {
  let store: AgentStore;

  beforeEach(() => {
    store = new AgentStore();
  });

  it('registers and retrieves an agent', () => {
    const card = makeCard('agent-a');
    store.register(card);
    const agent = store.get('agent-a');
    expect(agent).toBeDefined();
    expect(agent!.card.name).toBe('agent-a');
    expect(agent!.status).toBe('unknown');
  });

  it('lists all registered agents', () => {
    store.register(makeCard('agent-a'));
    store.register(makeCard('agent-b'));
    const all = store.list();
    expect(all).toHaveLength(2);
  });

  it('removes an agent', () => {
    store.register(makeCard('agent-a'));
    const removed = store.remove('agent-a');
    expect(removed).toBe(true);
    expect(store.get('agent-a')).toBeUndefined();
  });

  it('discovers agents by capability', () => {
    const cardA = makeCard('agent-a');
    cardA.capabilities = ['code-review', 'testing'];
    const cardB = makeCard('agent-b');
    cardB.capabilities = ['documentation'];
    store.register(cardA);
    store.register(cardB);

    const found = store.discover('code-review');
    expect(found).toHaveLength(1);
    expect(found[0].card.name).toBe('agent-a');
  });

  it('updates health status', () => {
    store.register(makeCard('agent-a'));
    store.updateHealth('agent-a', 'healthy');
    const agent = store.get('agent-a');
    expect(agent!.status).toBe('healthy');
  });

  it('updates metrics', () => {
    store.register(makeCard('agent-a'));
    store.recordTaskResult('agent-a', true, 150);
    const agent = store.get('agent-a');
    expect(agent!.metrics.totalTasks).toBe(1);
    expect(agent!.metrics.successCount).toBe(1);
    expect(agent!.metrics.avgResponseMs).toBe(150);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx turbo test --filter=@agentbridge/core
```

Expected: FAIL — `store.js` does not exist.

- [ ] **Step 3: Implement AgentStore**

```typescript
// packages/core/src/registry/store.ts
import type { A2AAgentCard } from '../a2a/types.js';

export interface AgentMetrics {
  totalTasks: number;
  successCount: number;
  failCount: number;
  avgResponseMs: number;
  p95ResponseMs: number;
  p99ResponseMs: number;
}

export interface RegisteredAgent {
  card: A2AAgentCard;
  registeredAt: Date;
  lastHealthCheck: Date;
  status: 'healthy' | 'unhealthy' | 'unknown';
  metrics: AgentMetrics;
}

export class AgentStore {
  private agents = new Map<string, RegisteredAgent>();
  private responseTimes = new Map<string, number[]>();

  register(card: A2AAgentCard): RegisteredAgent {
    const agent: RegisteredAgent = {
      card,
      registeredAt: new Date(),
      lastHealthCheck: new Date(),
      status: 'unknown',
      metrics: {
        totalTasks: 0,
        successCount: 0,
        failCount: 0,
        avgResponseMs: 0,
        p95ResponseMs: 0,
        p99ResponseMs: 0,
      },
    };
    this.agents.set(card.name, agent);
    this.responseTimes.set(card.name, []);
    return agent;
  }

  get(name: string): RegisteredAgent | undefined {
    return this.agents.get(name);
  }

  list(): RegisteredAgent[] {
    return Array.from(this.agents.values());
  }

  remove(name: string): boolean {
    this.responseTimes.delete(name);
    return this.agents.delete(name);
  }

  discover(capability: string): RegisteredAgent[] {
    return this.list().filter((a) =>
      a.card.capabilities.includes(capability)
    );
  }

  updateHealth(name: string, status: 'healthy' | 'unhealthy'): void {
    const agent = this.agents.get(name);
    if (!agent) return;
    agent.status = status;
    agent.lastHealthCheck = new Date();
  }

  recordTaskResult(name: string, success: boolean, responseMs: number): void {
    const agent = this.agents.get(name);
    if (!agent) return;

    agent.metrics.totalTasks++;
    if (success) agent.metrics.successCount++;
    else agent.metrics.failCount++;

    const times = this.responseTimes.get(name)!;
    times.push(responseMs);

    // Keep last 1000 response times
    if (times.length > 1000) times.shift();

    agent.metrics.avgResponseMs = times.reduce((a, b) => a + b, 0) / times.length;

    const sorted = [...times].sort((a, b) => a - b);
    agent.metrics.p95ResponseMs = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
    agent.metrics.p99ResponseMs = sorted[Math.floor(sorted.length * 0.99)] ?? 0;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx turbo test --filter=@agentbridge/core
```

Expected: All tests PASS.

- [ ] **Step 5: Add export to index.ts and commit**

Add to `packages/core/src/index.ts`:
```typescript
export { AgentStore, type RegisteredAgent, type AgentMetrics } from './registry/store.js';
```

```bash
npx turbo build
git add -A
git commit -m "feat: in-memory agent store — register, list, discover, health, metrics"
```

---

### Task 5: Registry Server

**Files:**
- Create: `packages/core/src/registry/health.ts`
- Create: `packages/core/src/registry/server.ts`
- Create: `packages/core/src/__tests__/registry-server.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write the health check manager**

```typescript
// packages/core/src/registry/health.ts

import type { AgentStore } from './store.js';

export class HealthCheckManager {
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private store: AgentStore,
    private intervalMs: number = 10_000,
    private onStatusChange?: (name: string, status: 'healthy' | 'unhealthy') => void,
  ) {}

  start(): void {
    this.intervalId = setInterval(() => this.checkAll(), this.intervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async checkAll(): Promise<void> {
    const agents = this.store.list();
    await Promise.allSettled(agents.map((a) => this.checkOne(a.card.name, a.card.url)));
  }

  private async checkOne(name: string, url: string): Promise<void> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${url}/health`, { signal: controller.signal });
      clearTimeout(timeout);
      const status = res.ok ? 'healthy' : 'unhealthy';
      const prev = this.store.get(name)?.status;
      this.store.updateHealth(name, status);
      if (prev !== status) this.onStatusChange?.(name, status);
    } catch {
      const prev = this.store.get(name)?.status;
      this.store.updateHealth(name, 'unhealthy');
      if (prev !== 'unhealthy') this.onStatusChange?.(name, 'unhealthy');
    }
  }
}
```

- [ ] **Step 2: Write the failing test for registry server**

```typescript
// packages/core/src/__tests__/registry-server.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRegistryServer } from '../registry/server.js';
import type { A2AAgentCard } from '../a2a/types.js';

const PORT = 16100; // Test port
let server: ReturnType<typeof createRegistryServer>;
let httpServer: any;

const baseUrl = `http://localhost:${PORT}`;

const testCard: A2AAgentCard = {
  name: 'test-agent',
  description: 'A test agent',
  url: 'http://localhost:16101',
  version: '1.0.0',
  capabilities: ['testing'],
  defaultInputModes: ['text'],
  defaultOutputModes: ['text'],
  authentication: { schemes: ['none'] },
  skills: [{ id: 'execute', name: 'test-agent', description: 'A test agent' }],
};

describe('Registry Server', () => {
  beforeAll(async () => {
    server = createRegistryServer({ healthCheckInterval: 0 }); // Disable auto health checks in tests
    httpServer = server.app.listen(PORT);
  });

  afterAll(() => {
    server.stop();
    httpServer.close();
  });

  it('POST /agents — registers an agent', async () => {
    const res = await fetch(`${baseUrl}/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testCard),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe('test-agent');
  });

  it('GET /agents — lists registered agents', async () => {
    const res = await fetch(`${baseUrl}/agents`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].card.name).toBe('test-agent');
  });

  it('GET /agents/:name — gets specific agent', async () => {
    const res = await fetch(`${baseUrl}/agents/test-agent`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.card.name).toBe('test-agent');
  });

  it('POST /discover — finds agents by capability', async () => {
    const res = await fetch(`${baseUrl}/discover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ capability: 'testing' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
  });

  it('GET /.well-known/agent-card.json — returns registry agent card', async () => {
    const res = await fetch(`${baseUrl}/.well-known/agent-card.json`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('agentbridge-registry');
  });

  it('GET /metrics — returns metrics', async () => {
    const res = await fetch(`${baseUrl}/metrics`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalAgents).toBe(1);
  });

  it('DELETE /agents/:name — removes an agent', async () => {
    const res = await fetch(`${baseUrl}/agents/test-agent`, { method: 'DELETE' });
    expect(res.status).toBe(200);
    const list = await fetch(`${baseUrl}/agents`);
    const body = await list.json();
    expect(body).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx turbo test --filter=@agentbridge/core
```

Expected: FAIL — `server.js` does not exist.

- [ ] **Step 4: Implement the registry server**

```typescript
// packages/core/src/registry/server.ts
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { AgentStore } from './store.js';
import { HealthCheckManager } from './health.js';
import type { A2AAgentCard } from '../a2a/types.js';

export interface RegistryOptions {
  healthCheckInterval?: number; // ms, 0 to disable
}

export function createRegistryServer(options: RegistryOptions = {}) {
  const app = express();
  app.use(express.json());

  const store = new AgentStore();
  const wsClients = new Set<WebSocket>();

  function broadcast(event: Record<string, unknown>) {
    const data = JSON.stringify(event);
    for (const ws of wsClients) {
      if (ws.readyState === WebSocket.OPEN) ws.send(data);
    }
  }

  const healthManager = new HealthCheckManager(
    store,
    options.healthCheckInterval ?? 10_000,
    (name, status) => broadcast({ type: 'health_change', name, status, timestamp: new Date().toISOString() }),
  );

  // ── Registry's own Agent Card ──
  app.get('/.well-known/agent-card.json', (_req, res) => {
    res.json({
      name: 'agentbridge-registry',
      description: 'AgentBridge Agent Registry — discovers and manages AI agents',
      url: '',
      version: '0.1.0',
      capabilities: ['registry', 'discovery'],
      defaultInputModes: ['text'],
      defaultOutputModes: ['text'],
      authentication: { schemes: ['none'] },
      skills: [],
    });
  });

  // ── CRUD ──
  app.post('/agents', (req, res) => {
    const card = req.body as A2AAgentCard;
    if (!card.name) {
      res.status(400).json({ error: 'Agent card must have a name' });
      return;
    }
    store.register(card);
    broadcast({ type: 'agent_registered', name: card.name, timestamp: new Date().toISOString() });
    res.status(201).json(card);
  });

  app.get('/agents', (_req, res) => {
    res.json(store.list());
  });

  app.get('/agents/:name', (req, res) => {
    const agent = store.get(req.params.name);
    if (!agent) { res.status(404).json({ error: 'Agent not found' }); return; }
    res.json(agent);
  });

  app.delete('/agents/:name', (req, res) => {
    const removed = store.remove(req.params.name);
    if (!removed) { res.status(404).json({ error: 'Agent not found' }); return; }
    broadcast({ type: 'agent_removed', name: req.params.name, timestamp: new Date().toISOString() });
    res.json({ removed: true });
  });

  // ── Discovery ──
  app.post('/discover', (req, res) => {
    const { capability } = req.body as { capability: string };
    res.json(store.discover(capability));
  });

  // ── Metrics ──
  app.get('/metrics', (_req, res) => {
    const agents = store.list();
    res.json({
      totalAgents: agents.length,
      healthyAgents: agents.filter((a) => a.status === 'healthy').length,
      unhealthyAgents: agents.filter((a) => a.status === 'unhealthy').length,
      agents: agents.map((a) => ({
        name: a.card.name,
        status: a.status,
        metrics: a.metrics,
      })),
    });
  });

  // ── Health endpoint for the registry itself ──
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  // ── Workflows endpoint (returns from compose config, populated later) ──
  let workflows: Record<string, unknown>[] = [];
  app.get('/workflows', (_req, res) => {
    res.json(workflows);
  });

  function start(port: number) {
    const httpServer = app.listen(port, () => {
      console.log(`AgentBridge Registry running on http://localhost:${port}`);
    });

    const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
    wss.on('connection', (ws) => {
      wsClients.add(ws);
      ws.on('close', () => wsClients.delete(ws));
    });

    if (options.healthCheckInterval !== 0) {
      healthManager.start();
    }

    return httpServer;
  }

  function stop() {
    healthManager.stop();
  }

  function setWorkflows(w: Record<string, unknown>[]) {
    workflows = w;
  }

  return { app, store, start, stop, broadcast, setWorkflows };
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx turbo test --filter=@agentbridge/core
```

Expected: All tests PASS.

- [ ] **Step 6: Add exports and commit**

Add to `packages/core/src/index.ts`:
```typescript
export { createRegistryServer, type RegistryOptions } from './registry/server.js';
export { HealthCheckManager } from './registry/health.js';
```

```bash
npx turbo build
git add -A
git commit -m "feat: registry server — Express endpoints, WebSocket, health checks, discovery"
```

---

## Day 2: Protocols

---

### Task 6: A2A Task Manager

**Files:**
- Create: `packages/core/src/a2a/task-manager.ts`
- Create: `packages/core/src/__tests__/task-manager.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/core/src/__tests__/task-manager.test.ts
import { describe, it, expect } from 'vitest';
import { TaskManager } from '../a2a/task-manager.js';

describe('TaskManager', () => {
  it('creates a task in submitted status', () => {
    const tm = new TaskManager();
    const task = tm.create({
      role: 'user',
      parts: [{ type: 'text', text: 'Hello' }],
    });
    expect(task.status).toBe('submitted');
    expect(task.message.parts[0].text).toBe('Hello');
    expect(task.id).toBeDefined();
  });

  it('transitions submitted -> working', () => {
    const tm = new TaskManager();
    const task = tm.create({ role: 'user', parts: [{ type: 'text', text: 'Hello' }] });
    const updated = tm.transition(task.id, 'working');
    expect(updated.status).toBe('working');
  });

  it('transitions working -> completed with result', () => {
    const tm = new TaskManager();
    const task = tm.create({ role: 'user', parts: [{ type: 'text', text: 'Hello' }] });
    tm.transition(task.id, 'working');
    const result = { role: 'agent' as const, parts: [{ type: 'text' as const, text: 'Done' }] };
    const updated = tm.complete(task.id, result);
    expect(updated.status).toBe('completed');
    expect(updated.result?.parts[0].text).toBe('Done');
  });

  it('transitions working -> failed with error', () => {
    const tm = new TaskManager();
    const task = tm.create({ role: 'user', parts: [{ type: 'text', text: 'Hello' }] });
    tm.transition(task.id, 'working');
    const updated = tm.fail(task.id, { code: 500, message: 'Something broke' });
    expect(updated.status).toBe('failed');
    expect(updated.error?.message).toBe('Something broke');
  });

  it('transitions submitted -> cancelled', () => {
    const tm = new TaskManager();
    const task = tm.create({ role: 'user', parts: [{ type: 'text', text: 'Hello' }] });
    const updated = tm.cancel(task.id);
    expect(updated.status).toBe('cancelled');
  });

  it('rejects invalid transitions', () => {
    const tm = new TaskManager();
    const task = tm.create({ role: 'user', parts: [{ type: 'text', text: 'Hello' }] });
    tm.transition(task.id, 'working');
    tm.complete(task.id, { role: 'agent', parts: [{ type: 'text', text: 'Done' }] });
    // completed -> working should throw
    expect(() => tm.transition(task.id, 'working')).toThrow();
  });

  it('retrieves a task by id', () => {
    const tm = new TaskManager();
    const task = tm.create({ role: 'user', parts: [{ type: 'text', text: 'Hello' }] });
    const found = tm.get(task.id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(task.id);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx turbo test --filter=@agentbridge/core
```

- [ ] **Step 3: Implement TaskManager**

```typescript
// packages/core/src/a2a/task-manager.ts
import { randomUUID } from 'node:crypto';
import type { A2ATask, A2AMessage, A2AError } from './types.js';

const VALID_TRANSITIONS: Record<string, string[]> = {
  submitted: ['working', 'cancelled'],
  working: ['completed', 'failed'],
};

export class TaskManager {
  private tasks = new Map<string, A2ATask>();

  create(message: A2AMessage): A2ATask {
    const now = new Date().toISOString();
    const task: A2ATask = {
      id: randomUUID(),
      status: 'submitted',
      message,
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.set(task.id, task);
    return structuredClone(task);
  }

  get(id: string): A2ATask | undefined {
    const task = this.tasks.get(id);
    return task ? structuredClone(task) : undefined;
  }

  transition(id: string, newStatus: 'working' | 'cancelled'): A2ATask {
    const task = this.tasks.get(id);
    if (!task) throw new Error(`Task ${id} not found`);
    const allowed = VALID_TRANSITIONS[task.status];
    if (!allowed?.includes(newStatus)) {
      throw new Error(`Invalid transition: ${task.status} -> ${newStatus}`);
    }
    task.status = newStatus;
    task.updatedAt = new Date().toISOString();
    return structuredClone(task);
  }

  complete(id: string, result: A2AMessage): A2ATask {
    const task = this.tasks.get(id);
    if (!task) throw new Error(`Task ${id} not found`);
    if (task.status !== 'working') {
      throw new Error(`Cannot complete task in ${task.status} status`);
    }
    task.status = 'completed';
    task.result = result;
    task.updatedAt = new Date().toISOString();
    return structuredClone(task);
  }

  fail(id: string, error: A2AError): A2ATask {
    const task = this.tasks.get(id);
    if (!task) throw new Error(`Task ${id} not found`);
    if (task.status !== 'working') {
      throw new Error(`Cannot fail task in ${task.status} status`);
    }
    task.status = 'failed';
    task.error = error;
    task.updatedAt = new Date().toISOString();
    return structuredClone(task);
  }

  cancel(id: string): A2ATask {
    return this.transition(id, 'cancelled');
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx turbo test --filter=@agentbridge/core
```

Expected: All tests PASS.

- [ ] **Step 5: Export and commit**

Add to `packages/core/src/index.ts`:
```typescript
export { TaskManager } from './a2a/task-manager.js';
```

```bash
npx turbo build
git add -A
git commit -m "feat: A2A task manager — state machine with valid transitions"
```

---

### Task 7: A2A Client

**Files:**
- Create: `packages/core/src/a2a/client.ts`
- Create: `packages/core/src/__tests__/a2a-client.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/core/src/__tests__/a2a-client.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import { A2AClient } from '../a2a/client.js';
import type { A2ATask, JsonRpcRequest } from '../a2a/types.js';

// Minimal mock A2A server
const mockApp = express();
mockApp.use(express.json());

const mockTask: A2ATask = {
  id: 'test-task-1',
  status: 'completed',
  message: { role: 'user', parts: [{ type: 'text', text: 'Hello' }] },
  result: { role: 'agent', parts: [{ type: 'text', text: 'Hi back!' }] },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

mockApp.post('/', (req, res) => {
  const rpc = req.body as JsonRpcRequest;
  if (rpc.method === 'tasks/send') {
    res.json({ jsonrpc: '2.0', id: rpc.id, result: mockTask });
  } else if (rpc.method === 'tasks/get') {
    res.json({ jsonrpc: '2.0', id: rpc.id, result: mockTask });
  } else if (rpc.method === 'tasks/cancel') {
    res.json({ jsonrpc: '2.0', id: rpc.id, result: { ...mockTask, status: 'cancelled' } });
  } else {
    res.json({ jsonrpc: '2.0', id: rpc.id, error: { code: -32601, message: 'Method not found' } });
  }
});

mockApp.get('/.well-known/agent-card.json', (_req, res) => {
  res.json({ name: 'mock-agent', description: 'Mock', url: 'http://localhost:16200' });
});

let mockServer: any;
const MOCK_PORT = 16200;

describe('A2AClient', () => {
  beforeAll(() => {
    mockServer = mockApp.listen(MOCK_PORT);
  });

  afterAll(() => {
    mockServer.close();
  });

  it('sends a task and gets result', async () => {
    const client = new A2AClient();
    const result = await client.sendTask(`http://localhost:${MOCK_PORT}`, {
      role: 'user',
      parts: [{ type: 'text', text: 'Hello' }],
    });
    expect(result.status).toBe('completed');
    expect(result.result?.parts[0].text).toBe('Hi back!');
  });

  it('gets a task by id', async () => {
    const client = new A2AClient();
    const result = await client.getTask(`http://localhost:${MOCK_PORT}`, 'test-task-1');
    expect(result.id).toBe('test-task-1');
  });

  it('cancels a task', async () => {
    const client = new A2AClient();
    const result = await client.cancelTask(`http://localhost:${MOCK_PORT}`, 'test-task-1');
    expect(result.status).toBe('cancelled');
  });

  it('fetches agent card', async () => {
    const client = new A2AClient();
    const card = await client.getAgentCard(`http://localhost:${MOCK_PORT}`);
    expect(card.name).toBe('mock-agent');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx turbo test --filter=@agentbridge/core
```

- [ ] **Step 3: Implement A2AClient**

```typescript
// packages/core/src/a2a/client.ts
import { randomUUID } from 'node:crypto';
import type { A2ATask, A2AMessage, A2AAgentCard, JsonRpcResponse } from './types.js';

export class A2AClient {
  private async rpc(url: string, method: string, params: unknown): Promise<unknown> {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: randomUUID(),
        method,
        params,
      }),
    });

    const body = (await res.json()) as JsonRpcResponse;
    if (body.error) {
      throw new Error(`A2A RPC error [${body.error.code}]: ${body.error.message}`);
    }
    return body.result;
  }

  async sendTask(agentUrl: string, message: A2AMessage): Promise<A2ATask> {
    return (await this.rpc(agentUrl, 'tasks/send', { message })) as A2ATask;
  }

  async getTask(agentUrl: string, taskId: string): Promise<A2ATask> {
    return (await this.rpc(agentUrl, 'tasks/get', { id: taskId })) as A2ATask;
  }

  async cancelTask(agentUrl: string, taskId: string): Promise<A2ATask> {
    return (await this.rpc(agentUrl, 'tasks/cancel', { id: taskId })) as A2ATask;
  }

  async getAgentCard(agentUrl: string): Promise<A2AAgentCard> {
    const res = await fetch(`${agentUrl}/.well-known/agent-card.json`);
    return (await res.json()) as A2AAgentCard;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx turbo test --filter=@agentbridge/core
```

Expected: All tests PASS.

- [ ] **Step 5: Export and commit**

Add to `packages/core/src/index.ts`:
```typescript
export { A2AClient } from './a2a/client.js';
```

```bash
npx turbo build
git add -A
git commit -m "feat: A2A client — sendTask, getTask, cancelTask, getAgentCard"
```

---

### Task 8: A2A Server (embedded in agents)

**Files:**
- Create: `packages/core/src/a2a/server.ts`
- Create: `packages/core/src/__tests__/a2a-server.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/core/src/__tests__/a2a-server.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createA2AServer } from '../a2a/server.js';
import { A2AClient } from '../a2a/client.js';
import type { A2AAgentCard } from '../a2a/types.js';

const PORT = 16201;
const card: A2AAgentCard = {
  name: 'echo-agent',
  description: 'Echoes input',
  url: `http://localhost:${PORT}`,
  version: '1.0.0',
  capabilities: ['echo'],
  defaultInputModes: ['text'],
  defaultOutputModes: ['text'],
  authentication: { schemes: ['none'] },
  skills: [{ id: 'execute', name: 'echo-agent', description: 'Echoes input' }],
};

let server: ReturnType<typeof createA2AServer>;
let httpServer: any;

describe('A2A Server', () => {
  beforeAll(() => {
    server = createA2AServer({
      card,
      handler: async (message) => {
        const inputText = message.parts.find((p) => p.type === 'text')?.text ?? '';
        return {
          role: 'agent',
          parts: [{ type: 'text', text: `Echo: ${inputText}` }],
        };
      },
    });
    httpServer = server.app.listen(PORT);
  });

  afterAll(() => {
    httpServer.close();
  });

  it('handles tasks/send and returns completed task', async () => {
    const client = new A2AClient();
    const result = await client.sendTask(`http://localhost:${PORT}`, {
      role: 'user',
      parts: [{ type: 'text', text: 'Hello World' }],
    });
    expect(result.status).toBe('completed');
    expect(result.result?.parts[0].text).toBe('Echo: Hello World');
  });

  it('serves agent card at /.well-known/agent-card.json', async () => {
    const client = new A2AClient();
    const fetchedCard = await client.getAgentCard(`http://localhost:${PORT}`);
    expect(fetchedCard.name).toBe('echo-agent');
  });

  it('responds to health check', async () => {
    const res = await fetch(`http://localhost:${PORT}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx turbo test --filter=@agentbridge/core
```

- [ ] **Step 3: Implement createA2AServer**

```typescript
// packages/core/src/a2a/server.ts
import express from 'express';
import { TaskManager } from './task-manager.js';
import type { A2AAgentCard, A2AMessage, JsonRpcRequest, JsonRpcResponse } from './types.js';

export interface A2AServerOptions {
  card: A2AAgentCard;
  handler: (message: A2AMessage) => Promise<A2AMessage>;
}

export function createA2AServer(options: A2AServerOptions) {
  const { card, handler } = options;
  const app = express();
  app.use(express.json());

  const taskManager = new TaskManager();

  // Agent Card
  app.get('/.well-known/agent-card.json', (_req, res) => {
    res.json(card);
  });

  // Health
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', agent: card.name, uptime: process.uptime() });
  });

  // JSON-RPC endpoint
  app.post('/', async (req, res) => {
    const rpc = req.body as JsonRpcRequest;
    const response: JsonRpcResponse = { jsonrpc: '2.0', id: rpc.id };

    try {
      switch (rpc.method) {
        case 'tasks/send': {
          const { message } = rpc.params as { message: A2AMessage };
          const task = taskManager.create(message);
          taskManager.transition(task.id, 'working');

          try {
            const result = await handler(message);
            const completed = taskManager.complete(task.id, result);
            response.result = completed;
          } catch (err) {
            const failed = taskManager.fail(task.id, {
              code: 500,
              message: err instanceof Error ? err.message : 'Unknown error',
            });
            response.result = failed;
          }
          break;
        }

        case 'tasks/get': {
          const { id } = rpc.params as { id: string };
          const task = taskManager.get(id);
          if (!task) {
            response.error = { code: -32602, message: `Task ${id} not found` };
          } else {
            response.result = task;
          }
          break;
        }

        case 'tasks/cancel': {
          const { id } = rpc.params as { id: string };
          try {
            const task = taskManager.cancel(id);
            response.result = task;
          } catch (err) {
            response.error = { code: -32602, message: err instanceof Error ? err.message : 'Cancel failed' };
          }
          break;
        }

        default:
          response.error = { code: -32601, message: `Method ${rpc.method} not found` };
      }
    } catch (err) {
      response.error = { code: -32603, message: err instanceof Error ? err.message : 'Internal error' };
    }

    res.json(response);
  });

  return { app, taskManager };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx turbo test --filter=@agentbridge/core
```

Expected: All tests PASS.

- [ ] **Step 5: Export and commit**

Add to `packages/core/src/index.ts`:
```typescript
export { createA2AServer, type A2AServerOptions } from './a2a/server.js';
```

```bash
npx turbo build
git add -A
git commit -m "feat: A2A server — JSON-RPC handler with task lifecycle"
```

---

### Task 9: BaseAgent Class

**Files:**
- Create: `packages/core/src/agent/base-agent.ts`
- Create: `packages/core/src/agent/agent-server.ts`
- Create: `packages/core/src/__tests__/base-agent.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/core/src/__tests__/base-agent.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { BaseAgent } from '../agent/base-agent.js';
import { A2AClient } from '../a2a/client.js';
import type { AgentConfig } from '../agent/agent-config.js';
import type { A2AMessage } from '../a2a/types.js';

class EchoAgent extends BaseAgent {
  config: AgentConfig = {
    name: 'echo-agent',
    description: 'Echoes input text',
    version: '1.0.0',
    capabilities: ['echo'],
    inputs: { text: { type: 'string', required: true, description: 'Text to echo' } },
    outputs: { echo: { type: 'string', description: 'Echoed text' } },
  };

  async execute(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return { echo: `Echo: ${input.text}` };
  }
}

const PORT = 16202;
let agent: EchoAgent;

describe('BaseAgent', () => {
  beforeAll(async () => {
    agent = new EchoAgent();
    await agent.start(PORT);
  });

  afterAll(async () => {
    await agent.stop();
  });

  it('responds to A2A tasks/send', async () => {
    const client = new A2AClient();
    const result = await client.sendTask(`http://localhost:${PORT}`, {
      role: 'user',
      parts: [{ type: 'data', data: { text: 'Hello' } }],
    });
    expect(result.status).toBe('completed');
    expect(result.result?.parts[0].data).toEqual({ echo: 'Echo: Hello' });
  });

  it('serves agent card', async () => {
    const client = new A2AClient();
    const card = await client.getAgentCard(`http://localhost:${PORT}`);
    expect(card.name).toBe('echo-agent');
    expect(card.capabilities).toEqual(['echo']);
  });

  it('responds to health check', async () => {
    const res = await fetch(`http://localhost:${PORT}/health`);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx turbo test --filter=@agentbridge/core
```

- [ ] **Step 3: Implement BaseAgent**

```typescript
// packages/core/src/agent/base-agent.ts
import type { AgentConfig } from './agent-config.js';
import type { A2AMessage } from '../a2a/types.js';
import { generateAgentCard } from './agent-card.js';
import { createA2AServer } from '../a2a/server.js';
import { A2AClient } from '../a2a/client.js';

export abstract class BaseAgent {
  abstract config: AgentConfig;
  abstract execute(input: Record<string, unknown>): Promise<Record<string, unknown>>;

  private httpServer: ReturnType<typeof import('http').createServer> | null = null;
  private port: number = 0;
  private a2aClient = new A2AClient();

  async start(port: number, registryUrl?: string): Promise<void> {
    this.port = port;
    const url = `http://localhost:${port}`;
    const card = generateAgentCard(this.config, url);

    const { app } = createA2AServer({
      card,
      handler: async (message: A2AMessage) => {
        // Extract input from message parts
        const input = this.extractInput(message);
        const output = await this.execute(input);
        return {
          role: 'agent',
          parts: [{ type: 'data', data: output }],
        };
      },
    });

    await new Promise<void>((resolve) => {
      this.httpServer = app.listen(port, () => {
        console.log(`Agent "${this.config.name}" running on ${url}`);
        resolve();
      });
    });

    // Auto-register with registry if URL provided
    if (registryUrl) {
      await this.registerWith(registryUrl);
    }
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.httpServer) {
        this.httpServer.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  async registerWith(registryUrl: string): Promise<void> {
    const card = generateAgentCard(this.config, `http://localhost:${this.port}`);
    await fetch(`${registryUrl}/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card),
    });
  }

  /** Call another agent via A2A */
  protected async callAgent(agentUrl: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const result = await this.a2aClient.sendTask(agentUrl, {
      role: 'user',
      parts: [{ type: 'data', data: input }],
    });
    if (result.status === 'failed') {
      throw new Error(`Agent call failed: ${result.error?.message ?? 'Unknown error'}`);
    }
    const dataPart = result.result?.parts.find((p) => p.type === 'data');
    return (dataPart?.data as Record<string, unknown>) ?? {};
  }

  /** Call an LLM via OpenRouter */
  protected async callLLM(prompt: string, model?: string): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model ?? process.env.MODEL ?? 'deepseek/deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const body = (await res.json()) as { choices: { message: { content: string } }[] };
    return body.choices[0]?.message?.content ?? '';
  }

  private extractInput(message: A2AMessage): Record<string, unknown> {
    // Check for data parts first (structured input)
    const dataPart = message.parts.find((p) => p.type === 'data');
    if (dataPart?.data) return dataPart.data as Record<string, unknown>;

    // Fall back to text parts
    const textPart = message.parts.find((p) => p.type === 'text');
    if (textPart?.text) return { text: textPart.text };

    return {};
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx turbo test --filter=@agentbridge/core
```

Expected: All tests PASS.

- [ ] **Step 5: Export and commit**

Add to `packages/core/src/index.ts`:
```typescript
export { BaseAgent } from './agent/base-agent.js';
```

```bash
npx turbo build
git add -A
git commit -m "feat: BaseAgent class — extend, execute, auto-register, callAgent, callLLM"
```

---

### Task 10: Message Bus

**Files:**
- Create: `packages/core/src/bus/bus.ts`
- Create: `packages/core/src/__tests__/bus.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/core/src/__tests__/bus.test.ts
import { describe, it, expect, vi } from 'vitest';
import { MessageBus, type BusEvent } from '../bus/bus.js';

describe('MessageBus', () => {
  it('emits and receives events', () => {
    const bus = new MessageBus();
    const events: BusEvent[] = [];
    bus.onMessage((e) => events.push(e));

    bus.emit({
      type: 'task_sent',
      from: 'agent-a',
      to: 'agent-b',
      taskId: 'task-1',
    });

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('task_sent');
    expect(events[0].from).toBe('agent-a');
    expect(events[0].id).toBeDefined();
    expect(events[0].timestamp).toBeInstanceOf(Date);
  });

  it('stores history up to cap', () => {
    const bus = new MessageBus(5); // cap at 5
    for (let i = 0; i < 10; i++) {
      bus.emit({ type: 'task_sent', from: 'a', to: 'b' });
    }
    expect(bus.getHistory()).toHaveLength(5);
  });

  it('returns history with optional limit', () => {
    const bus = new MessageBus();
    for (let i = 0; i < 10; i++) {
      bus.emit({ type: 'task_sent', from: 'a', to: 'b' });
    }
    expect(bus.getHistory(3)).toHaveLength(3);
  });

  it('supports multiple subscribers', () => {
    const bus = new MessageBus();
    const sub1: BusEvent[] = [];
    const sub2: BusEvent[] = [];
    bus.onMessage((e) => sub1.push(e));
    bus.onMessage((e) => sub2.push(e));

    bus.emit({ type: 'agent_registered', from: 'agent-a' });

    expect(sub1).toHaveLength(1);
    expect(sub2).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx turbo test --filter=@agentbridge/core
```

- [ ] **Step 3: Implement MessageBus**

```typescript
// packages/core/src/bus/bus.ts
import { randomUUID } from 'node:crypto';

export interface BusEvent {
  id: string;
  timestamp: Date;
  type: 'task_sent' | 'task_completed' | 'task_failed' | 'agent_registered' | 'agent_removed';
  from?: string;
  to?: string;
  taskId?: string;
  latencyMs?: number;
  payload?: unknown;
}

export type BusEventInput = Omit<BusEvent, 'id' | 'timestamp'>;
type BusCallback = (event: BusEvent) => void;

export class MessageBus {
  private history: BusEvent[] = [];
  private subscribers: BusCallback[] = [];
  private cap: number;

  constructor(cap: number = 10_000) {
    this.cap = cap;
  }

  emit(input: BusEventInput): BusEvent {
    const event: BusEvent = {
      id: randomUUID(),
      timestamp: new Date(),
      ...input,
    };

    this.history.push(event);
    if (this.history.length > this.cap) {
      this.history.shift();
    }

    for (const cb of this.subscribers) {
      cb(event);
    }

    return event;
  }

  onMessage(callback: BusCallback): void {
    this.subscribers.push(callback);
  }

  getHistory(limit?: number): BusEvent[] {
    if (limit) return this.history.slice(-limit);
    return [...this.history];
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx turbo test --filter=@agentbridge/core
```

Expected: All tests PASS.

- [ ] **Step 5: Export and commit**

Add to `packages/core/src/index.ts`:
```typescript
export { MessageBus, type BusEvent, type BusEventInput } from './bus/bus.js';
```

```bash
npx turbo build
git add -A
git commit -m "feat: message bus — in-memory event routing with history and subscribers"
```

---

## Day 3: MCP Bridge + CLI Foundation

---

### Task 11: MCP Server (Auto-Bridge)

**Files:**
- Create: `packages/core/src/mcp/tool-bridge.ts`
- Create: `packages/core/src/mcp/server.ts`
- Create: `packages/core/src/mcp/transport.ts`
- Create: `packages/core/src/__tests__/tool-bridge.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write the failing test for tool-bridge**

```typescript
// packages/core/src/__tests__/tool-bridge.test.ts
import { describe, it, expect } from 'vitest';
import { agentToMcpTool } from '../mcp/tool-bridge.js';
import type { RegisteredAgent } from '../registry/store.js';

describe('agentToMcpTool', () => {
  it('converts a registered agent to an MCP tool definition', () => {
    const agent: RegisteredAgent = {
      card: {
        name: 'code-review',
        description: 'Reviews code for bugs',
        url: 'http://localhost:6101',
        version: '1.0.0',
        capabilities: ['code-review'],
        defaultInputModes: ['text'],
        defaultOutputModes: ['text'],
        authentication: { schemes: ['none'] },
        skills: [{ id: 'execute', name: 'code-review', description: 'Reviews code' }],
      },
      registeredAt: new Date(),
      lastHealthCheck: new Date(),
      status: 'healthy',
      metrics: { totalTasks: 0, successCount: 0, failCount: 0, avgResponseMs: 0, p95ResponseMs: 0, p99ResponseMs: 0 },
    };

    const tool = agentToMcpTool(agent);

    expect(tool.name).toBe('agent_code_review');
    expect(tool.description).toBe('Reviews code for bugs');
    expect(tool.inputSchema).toBeDefined();
    expect(tool.inputSchema.type).toBe('object');
  });

  it('generates input schema from agent config inputs', () => {
    const agent: RegisteredAgent = {
      card: {
        name: 'test-agent',
        description: 'Test',
        url: 'http://localhost:6102',
        version: '1.0.0',
        capabilities: [],
        defaultInputModes: ['text'],
        defaultOutputModes: ['text'],
        authentication: { schemes: ['none'] },
        skills: [],
      },
      registeredAt: new Date(),
      lastHealthCheck: new Date(),
      status: 'healthy',
      metrics: { totalTasks: 0, successCount: 0, failCount: 0, avgResponseMs: 0, p95ResponseMs: 0, p99ResponseMs: 0 },
    };

    const tool = agentToMcpTool(agent);

    // Without inputs config, should have a generic "input" property
    expect(tool.inputSchema.properties).toHaveProperty('input');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx turbo test --filter=@agentbridge/core
```

- [ ] **Step 3: Implement tool-bridge**

```typescript
// packages/core/src/mcp/tool-bridge.ts
import type { RegisteredAgent } from '../registry/store.js';

export interface McpToolDef {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, { type: string; description?: string }>;
    required?: string[];
  };
}

export function agentToMcpTool(agent: RegisteredAgent): McpToolDef {
  const toolName = `agent_${agent.card.name.replace(/-/g, '_')}`;

  // Default: generic input property
  const properties: Record<string, { type: string; description?: string }> = {
    input: { type: 'string', description: 'Input text or JSON string for the agent' },
  };
  const required: string[] = ['input'];

  return {
    name: toolName,
    description: agent.card.description,
    inputSchema: {
      type: 'object',
      properties,
      required,
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx turbo test --filter=@agentbridge/core
```

Expected: All tests PASS.

- [ ] **Step 5: Implement MCP server**

```typescript
// packages/core/src/mcp/server.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { A2AClient } from '../a2a/client.js';
import type { AgentStore, RegisteredAgent } from '../registry/store.js';
import { agentToMcpTool } from './tool-bridge.js';
import { z } from 'zod';

export interface McpBridgeOptions {
  registryUrl: string;
}

export async function createMcpBridgeServer(options: McpBridgeOptions) {
  const { registryUrl } = options;
  const a2aClient = new A2AClient();

  const mcpServer = new McpServer({
    name: 'agentbridge',
    version: '0.1.0',
  });

  // Fetch agents from registry and register as tools
  async function syncTools() {
    const res = await fetch(`${registryUrl}/agents`);
    const agents = (await res.json()) as RegisteredAgent[];

    for (const agent of agents) {
      const toolDef = agentToMcpTool(agent);

      mcpServer.tool(
        toolDef.name,
        toolDef.description,
        { input: z.string().describe('Input text or JSON for the agent') },
        async ({ input }) => {
          // Try to parse JSON input, fall back to text
          let inputData: Record<string, unknown>;
          try {
            inputData = JSON.parse(input);
          } catch {
            inputData = { text: input };
          }

          const result = await a2aClient.sendTask(agent.card.url, {
            role: 'user',
            parts: [{ type: 'data', data: inputData }],
          });

          if (result.status === 'failed') {
            return {
              content: [{ type: 'text' as const, text: `Agent error: ${result.error?.message ?? 'Unknown'}` }],
              isError: true,
            };
          }

          const textPart = result.result?.parts.find((p) => p.type === 'text');
          const dataPart = result.result?.parts.find((p) => p.type === 'data');
          const outputText = textPart?.text ?? JSON.stringify(dataPart?.data ?? {}, null, 2);

          return {
            content: [{ type: 'text' as const, text: outputText }],
          };
        },
      );
    }
  }

  async function startStdio() {
    await syncTools();
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
  }

  return { mcpServer, syncTools, startStdio };
}
```

- [ ] **Step 6: Export and commit**

Add to `packages/core/src/index.ts`:
```typescript
export { agentToMcpTool, type McpToolDef } from './mcp/tool-bridge.js';
export { createMcpBridgeServer, type McpBridgeOptions } from './mcp/server.js';
```

```bash
npx turbo build
git add -A
git commit -m "feat: MCP bridge server — auto-generates tools from registered agents"
```

---

### Task 12: CLI Package Scaffold + Init Command

**Files:**
- Create: `packages/cli/package.json`, `packages/cli/tsconfig.json`, `packages/cli/tsup.config.ts`
- Create: `packages/cli/bin/agentbridge.ts`
- Create: `packages/cli/src/index.ts`
- Create: `packages/cli/src/utils/logger.ts`
- Create: `packages/cli/src/commands/init.ts`
- Create: `packages/cli/src/templates/basic/agent.ts.tmpl`
- Create: `packages/cli/src/templates/basic/agent.config.yaml.tmpl`
- Create: `packages/cli/src/templates/basic/package.json.tmpl`

- [ ] **Step 1: Create CLI package.json**

```json
// packages/cli/package.json
{
  "name": "@agentbridge/cli",
  "version": "0.1.0",
  "description": "CLI for AgentBridge — scaffold, run, and manage AI agents",
  "type": "module",
  "bin": {
    "agentbridge": "./dist/bin/agentbridge.js"
  },
  "main": "dist/index.js",
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "clean": "rm -rf dist .turbo"
  },
  "dependencies": {
    "@agentbridge/core": "*",
    "commander": "^12.1.0",
    "inquirer": "^12.0.0",
    "chalk": "^5.3.0",
    "ora": "^8.1.0",
    "cli-table3": "^0.6.5",
    "chokidar": "^4.0.0",
    "yaml": "^2.5.0",
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "tsup": "^8.3.0",
    "typescript": "^5.5.0",
    "@types/node": "^22.0.0"
  }
}
```

```json
// packages/cli/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "."
  },
  "include": ["src/**/*", "bin/**/*"]
}
```

```typescript
// packages/cli/tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'bin/agentbridge.ts'],
  format: ['esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
});
```

- [ ] **Step 2: Create CLI entry point and logger utility**

```typescript
// packages/cli/bin/agentbridge.ts
import { createCLI } from '../src/index.js';
createCLI();
```

```typescript
// packages/cli/src/utils/logger.ts
import chalk from 'chalk';

export const log = {
  info: (msg: string) => console.log(chalk.blue('ℹ'), msg),
  success: (msg: string) => console.log(chalk.green('✔'), msg),
  warn: (msg: string) => console.log(chalk.yellow('⚠'), msg),
  error: (msg: string) => console.log(chalk.red('✖'), msg),
  dim: (msg: string) => console.log(chalk.dim(msg)),
  brand: (msg: string) => console.log(chalk.bold.cyan(msg)),
};
```

- [ ] **Step 3: Create init command templates**

```handlebars
{{!-- packages/cli/src/templates/basic/agent.ts.tmpl --}}
import { BaseAgent } from '@agentbridge/core';
import type { AgentConfig } from '@agentbridge/core';

class {{className}} extends BaseAgent {
  config: AgentConfig = {
    name: '{{name}}',
    description: '{{description}}',
    version: '1.0.0',
    capabilities: [{{capabilities}}],
    inputs: {
      input: { type: 'string', required: true, description: 'Input for the agent' },
    },
    outputs: {
      result: { type: 'string', description: 'Agent output' },
    },
  };

  async execute(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const text = input.input as string;

    // TODO: Replace with your agent logic
    // const response = await this.callLLM(`Process this: ${text}`);
    // const otherAgent = await this.callAgent('http://localhost:6102', { query: text });

    return { result: `Processed: ${text}` };
  }
}

const agent = new {{className}}();
const port = parseInt(process.env.PORT ?? '6101');
const registry = process.env.REGISTRY_URL ?? 'http://localhost:6100';

agent.start(port, registry).then(() => {
  console.log(`{{name}} running on port ${port}`);
});
```

```yaml
# packages/cli/src/templates/basic/agent.config.yaml.tmpl
name: {{name}}
description: {{description}}
version: 1.0.0
capabilities:
{{#capabilities}}
  - {{.}}
{{/capabilities}}
port: 6101
env:
  OPENROUTER_API_KEY: ${OPENROUTER_API_KEY}
```

```json
// packages/cli/src/templates/basic/package.json.tmpl
{
  "name": "{{name}}",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "tsx agent.ts",
    "dev": "tsx watch agent.ts"
  },
  "dependencies": {
    "@agentbridge/core": "^0.1.0"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 4: Implement init command**

```typescript
// packages/cli/src/commands/init.ts
import { Command } from 'commander';
import inquirer from 'inquirer';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { log } from '../utils/logger.js';

function toPascalCase(str: string): string {
  return str.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join('');
}

export const initCommand = new Command('init')
  .argument('[name]', 'Agent name')
  .description('Scaffold a new AgentBridge agent project')
  .action(async (name?: string) => {
    const answers = await inquirer.prompt([
      { type: 'input', name: 'name', message: 'Agent name:', default: name ?? 'my-agent', when: !name },
      { type: 'input', name: 'description', message: 'Description:', default: 'An AgentBridge agent' },
      { type: 'input', name: 'capabilities', message: 'Capabilities (comma-separated):', default: 'general' },
    ]);

    const agentName = name ?? answers.name;
    const description = answers.description;
    const capabilities = answers.capabilities.split(',').map((c: string) => c.trim());
    const className = toPascalCase(agentName) + 'Agent';
    const dir = join(process.cwd(), agentName);

    if (existsSync(dir)) {
      log.error(`Directory ${agentName}/ already exists`);
      return;
    }

    mkdirSync(dir, { recursive: true });

    // agent.ts
    const agentTs = `import { BaseAgent } from '@agentbridge/core';
import type { AgentConfig } from '@agentbridge/core';

class ${className} extends BaseAgent {
  config: AgentConfig = {
    name: '${agentName}',
    description: '${description}',
    version: '1.0.0',
    capabilities: [${capabilities.map((c: string) => `'${c}'`).join(', ')}],
    inputs: {
      input: { type: 'string', required: true, description: 'Input for the agent' },
    },
    outputs: {
      result: { type: 'string', description: 'Agent output' },
    },
  };

  async execute(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const text = input.input as string;
    // Replace with your agent logic:
    // const response = await this.callLLM(\`Process this: \${text}\`);
    return { result: \`Processed: \${text}\` };
  }
}

const agent = new ${className}();
const port = parseInt(process.env.PORT ?? '6101');
const registry = process.env.REGISTRY_URL ?? 'http://localhost:6100';

agent.start(port, registry).then(() => {
  console.log(\`${agentName} running on port \${port}\`);
});
`;

    // agent.config.yaml
    const configYaml = `name: ${agentName}
description: ${description}
version: 1.0.0
capabilities:
${capabilities.map((c: string) => `  - ${c}`).join('\n')}
port: 6101
env:
  OPENROUTER_API_KEY: \${OPENROUTER_API_KEY}
`;

    // package.json
    const pkgJson = JSON.stringify({
      name: agentName,
      version: '1.0.0',
      type: 'module',
      scripts: {
        start: 'tsx agent.ts',
        dev: 'tsx watch agent.ts',
      },
      dependencies: { '@agentbridge/core': '^0.1.0' },
      devDependencies: { tsx: '^4.19.0', typescript: '^5.5.0' },
    }, null, 2);

    // tsconfig.json
    const tsConfig = JSON.stringify({
      compilerOptions: {
        target: 'ES2022', module: 'ESNext', moduleResolution: 'bundler',
        strict: true, esModuleInterop: true, skipLibCheck: true,
      },
      include: ['*.ts'],
    }, null, 2);

    // .env.example
    const envExample = 'OPENROUTER_API_KEY=your_key_here\nPORT=6101\nREGISTRY_URL=http://localhost:6100\n';

    writeFileSync(join(dir, 'agent.ts'), agentTs);
    writeFileSync(join(dir, 'agent.config.yaml'), configYaml);
    writeFileSync(join(dir, 'package.json'), pkgJson);
    writeFileSync(join(dir, 'tsconfig.json'), tsConfig);
    writeFileSync(join(dir, '.env.example'), envExample);

    log.success(`Created ${agentName}/`);
    log.dim(`  agent.ts              ← Your agent logic (extend BaseAgent)`);
    log.dim(`  agent.config.yaml     ← Agent metadata`);
    log.dim(`  package.json          ← Dependencies`);
    log.dim(`  tsconfig.json         ← TypeScript config`);
    log.dim(`  .env.example          ← Environment template`);
    log.info('');
    log.info(`Next steps:`);
    log.info(`  cd ${agentName}`);
    log.info(`  npm install`);
    log.info(`  npx agentbridge dev`);
  });
```

- [ ] **Step 5: Create CLI main entry with init command**

```typescript
// packages/cli/src/index.ts
import { Command } from 'commander';
import { initCommand } from './commands/init.js';

export function createCLI() {
  const program = new Command()
    .name('agentbridge')
    .description('AgentBridge — MCP + A2A framework for AI agents')
    .version('0.1.0');

  program.addCommand(initCommand);
  // More commands added in subsequent tasks

  program.parse();
}
```

- [ ] **Step 6: Install deps, build, and commit**

```bash
cd C:\AgentBridge
npm install
npx turbo build
git add -A
git commit -m "feat: CLI package + init command — scaffold new agent projects"
```

---

### Task 13: CLI Up + List + Call Commands

**Files:**
- Create: `packages/cli/src/commands/up.ts`
- Create: `packages/cli/src/commands/list.ts`
- Create: `packages/cli/src/commands/call.ts`
- Create: `packages/cli/src/commands/mcp.ts`
- Create: `packages/cli/src/commands/register.ts`
- Create: `packages/cli/src/utils/table.ts`
- Modify: `packages/cli/src/index.ts`

- [ ] **Step 1: Implement table utility**

```typescript
// packages/cli/src/utils/table.ts
import Table from 'cli-table3';
import chalk from 'chalk';

export function agentTable(agents: any[]): string {
  const table = new Table({
    head: [
      chalk.cyan('Name'),
      chalk.cyan('Status'),
      chalk.cyan('URL'),
      chalk.cyan('Capabilities'),
      chalk.cyan('Tasks'),
    ],
    style: { head: [], border: ['dim'] },
  });

  for (const a of agents) {
    const statusColor = a.status === 'healthy' ? chalk.green : a.status === 'unhealthy' ? chalk.red : chalk.yellow;
    table.push([
      chalk.bold(a.card?.name ?? a.name),
      statusColor(a.status ?? 'unknown'),
      chalk.dim(a.card?.url ?? a.url ?? ''),
      (a.card?.capabilities ?? []).join(', '),
      String(a.metrics?.totalTasks ?? 0),
    ]);
  }

  return table.toString();
}
```

- [ ] **Step 2: Implement list command**

```typescript
// packages/cli/src/commands/list.ts
import { Command } from 'commander';
import { log } from '../utils/logger.js';
import { agentTable } from '../utils/table.js';

export const listCommand = new Command('list')
  .description('List all registered agents')
  .option('-r, --registry <url>', 'Registry URL', 'http://localhost:6100')
  .action(async (opts) => {
    try {
      const res = await fetch(`${opts.registry}/agents`);
      const agents = await res.json();

      if (agents.length === 0) {
        log.info('No agents registered.');
        return;
      }

      console.log(agentTable(agents));
    } catch (err) {
      log.error(`Could not connect to registry at ${opts.registry}`);
    }
  });
```

- [ ] **Step 3: Implement call command**

```typescript
// packages/cli/src/commands/call.ts
import { Command } from 'commander';
import { A2AClient } from '@agentbridge/core';
import { log } from '../utils/logger.js';

export const callCommand = new Command('call')
  .argument('<agent>', 'Agent name to call')
  .argument('<input>', 'Input text or JSON string')
  .option('-r, --registry <url>', 'Registry URL', 'http://localhost:6100')
  .description('Invoke an agent from terminal')
  .action(async (agentName, input, opts) => {
    try {
      // Look up agent URL from registry
      const res = await fetch(`${opts.registry}/agents/${agentName}`);
      if (!res.ok) {
        log.error(`Agent "${agentName}" not found in registry`);
        return;
      }
      const agent = await res.json();
      const agentUrl = agent.card.url;

      log.info(`Calling ${agentName} at ${agentUrl}...`);

      // Try to parse JSON, fall back to text
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(input);
      } catch {
        data = { input };
      }

      const client = new A2AClient();
      const result = await client.sendTask(agentUrl, {
        role: 'user',
        parts: [{ type: 'data', data }],
      });

      if (result.status === 'failed') {
        log.error(`Agent returned error: ${result.error?.message}`);
        return;
      }

      const textPart = result.result?.parts.find((p) => p.type === 'text');
      const dataPart = result.result?.parts.find((p) => p.type === 'data');

      if (textPart?.text) {
        console.log(textPart.text);
      } else if (dataPart?.data) {
        console.log(JSON.stringify(dataPart.data, null, 2));
      }

      log.success(`Task ${result.id} completed`);
    } catch (err) {
      log.error(`Failed to call agent: ${err instanceof Error ? err.message : String(err)}`);
    }
  });
```

- [ ] **Step 4: Implement register command**

```typescript
// packages/cli/src/commands/register.ts
import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';
import { log } from '../utils/logger.js';

export const registerCommand = new Command('register')
  .argument('[path]', 'Path to agent directory', '.')
  .option('-r, --registry <url>', 'Registry URL', 'http://localhost:6100')
  .description('Register an agent to the running registry')
  .action(async (path, opts) => {
    try {
      const configPath = join(process.cwd(), path, 'agent.config.yaml');
      const raw = readFileSync(configPath, 'utf-8');
      const config = YAML.parse(raw);

      const card = {
        name: config.name,
        description: config.description,
        url: `http://localhost:${config.port ?? 6101}`,
        version: config.version ?? '1.0.0',
        capabilities: config.capabilities ?? [],
        defaultInputModes: ['text'],
        defaultOutputModes: ['text'],
        authentication: { schemes: ['none'] },
        skills: [{ id: 'execute', name: config.name, description: config.description }],
      };

      const res = await fetch(`${opts.registry}/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card),
      });

      if (res.ok) {
        log.success(`Registered "${config.name}" with registry`);
      } else {
        log.error(`Registration failed: ${res.statusText}`);
      }
    } catch (err) {
      log.error(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  });
```

- [ ] **Step 5: Implement mcp command**

```typescript
// packages/cli/src/commands/mcp.ts
import { Command } from 'commander';
import { createMcpBridgeServer } from '@agentbridge/core';

export const mcpCommand = new Command('mcp')
  .description('Start MCP server (for Claude Code / Cursor integration)')
  .option('-r, --registry <url>', 'Registry URL', 'http://localhost:6100')
  .action(async (opts) => {
    const server = await createMcpBridgeServer({ registryUrl: opts.registry });
    await server.startStdio();
  });
```

- [ ] **Step 6: Implement up command (compose)**

```typescript
// packages/cli/src/commands/up.ts
import { Command } from 'commander';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';
import { createRegistryServer } from '@agentbridge/core';
import { spawn, type ChildProcess } from 'node:child_process';
import { log } from '../utils/logger.js';
import { config as loadEnv } from 'dotenv';

export const upCommand = new Command('up')
  .description('Start everything from agentbridge.yaml')
  .option('-f, --file <path>', 'Compose file path', 'agentbridge.yaml')
  .action(async (opts) => {
    loadEnv();

    const filePath = join(process.cwd(), opts.file);
    if (!existsSync(filePath)) {
      log.error(`${opts.file} not found`);
      return;
    }

    const raw = readFileSync(filePath, 'utf-8');
    // Interpolate env vars: ${VAR} -> process.env.VAR
    const interpolated = raw.replace(/\$\{(\w+)\}/g, (_, key) => process.env[key] ?? '');
    const config = YAML.parse(interpolated);

    const registryPort = config.registry?.port ?? 6100;
    log.brand('  AgentBridge');
    log.info(`Starting registry on port ${registryPort}...`);

    const registry = createRegistryServer();
    registry.start(registryPort);
    log.success(`Registry running on http://localhost:${registryPort}`);

    // Start agents
    const processes: ChildProcess[] = [];
    const agents = config.agents ?? {};

    for (const [name, agentConf] of Object.entries(agents) as [string, any][]) {
      const agentPath = join(process.cwd(), agentConf.path);
      const port = agentConf.port ?? 6101;

      log.info(`Starting agent "${name}" on port ${port}...`);

      const env = {
        ...process.env,
        ...agentConf.env,
        PORT: String(port),
        REGISTRY_URL: `http://localhost:${registryPort}`,
      };

      const child = spawn('npx', ['tsx', join(agentPath, 'agent.ts')], {
        env,
        stdio: 'pipe',
        shell: true,
      });

      child.stdout?.on('data', (data) => log.dim(`[${name}] ${data.toString().trim()}`));
      child.stderr?.on('data', (data) => log.warn(`[${name}] ${data.toString().trim()}`));
      child.on('exit', (code) => log.warn(`[${name}] exited with code ${code}`));

      processes.push(child);
    }

    // Set workflows in registry
    if (config.workflows) {
      const workflows = Object.entries(config.workflows).map(([name, wf]: [string, any]) => ({
        name,
        ...wf,
      }));
      registry.setWorkflows(workflows);
    }

    // Dashboard
    if (config.dashboard?.enabled) {
      const dashPort = config.dashboard.port ?? 6140;
      log.info(`Dashboard would start on port ${dashPort} (implemented in Day 5-6)`);
    }

    // MCP
    if (config.mcp?.enabled) {
      log.info(`MCP server enabled (use 'npx agentbridge mcp' for Claude Code integration)`);
    }

    log.success('All systems running. Press Ctrl+C to stop.');

    // Graceful shutdown
    process.on('SIGINT', () => {
      log.info('Shutting down...');
      for (const p of processes) p.kill();
      registry.stop();
      process.exit(0);
    });
  });
```

- [ ] **Step 7: Register all commands in CLI entry**

Replace `packages/cli/src/index.ts`:

```typescript
// packages/cli/src/index.ts
import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { upCommand } from './commands/up.js';
import { listCommand } from './commands/list.js';
import { callCommand } from './commands/call.js';
import { registerCommand } from './commands/register.js';
import { mcpCommand } from './commands/mcp.js';

export function createCLI() {
  const program = new Command()
    .name('agentbridge')
    .description('AgentBridge — MCP + A2A framework for AI agents')
    .version('0.1.0');

  program.addCommand(initCommand);
  program.addCommand(upCommand);
  program.addCommand(listCommand);
  program.addCommand(callCommand);
  program.addCommand(registerCommand);
  program.addCommand(mcpCommand);

  program.parse();
}
```

- [ ] **Step 8: Build and commit**

```bash
cd C:\AgentBridge
npm install
npx turbo build
git add -A
git commit -m "feat: CLI commands — up, list, call, register, mcp"
```

---

## Day 4: Demo Agents + Compose

---

### Task 14: Demo Agent — code-review

**Files:**
- Create: `agents/code-review/package.json`
- Create: `agents/code-review/agent.config.yaml`
- Create: `agents/code-review/prompts.ts`
- Create: `agents/code-review/agent.ts`

- [ ] **Step 1: Create agent package.json**

```json
// agents/code-review/package.json
{
  "name": "agent-code-review",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "tsx agent.ts",
    "dev": "tsx watch agent.ts"
  },
  "dependencies": {
    "@agentbridge/core": "*"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 2: Create agent config**

```yaml
# agents/code-review/agent.config.yaml
name: code-review
description: Reviews code for bugs, security issues, and best practices
version: 1.0.0
capabilities:
  - code-review
  - security-scan
  - best-practices
port: 6101
env:
  OPENROUTER_API_KEY: ${OPENROUTER_API_KEY}
  MODEL: deepseek/deepseek-chat
```

- [ ] **Step 3: Create prompts**

```typescript
// agents/code-review/prompts.ts
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
```

- [ ] **Step 4: Create agent implementation**

```typescript
// agents/code-review/agent.ts
import { BaseAgent } from '@agentbridge/core';
import type { AgentConfig } from '@agentbridge/core';
import { reviewPrompt } from './prompts.js';

class CodeReviewAgent extends BaseAgent {
  config: AgentConfig = {
    name: 'code-review',
    description: 'Reviews code for bugs, security issues, and best practices',
    version: '1.0.0',
    capabilities: ['code-review', 'security-scan', 'best-practices'],
    inputs: {
      code: { type: 'string', required: true, description: 'Source code to review' },
      language: { type: 'string', description: 'Programming language (default: typescript)' },
    },
    outputs: {
      review: { type: 'string', description: 'Review summary' },
      score: { type: 'number', description: 'Quality score 0-100' },
      issues: { type: 'array', description: 'List of issues found' },
    },
  };

  async execute(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const code = input.code as string;
    const language = (input.language as string) ?? 'typescript';

    const prompt = reviewPrompt(code, language);
    const response = await this.callLLM(prompt);

    try {
      const parsed = JSON.parse(response);
      return {
        review: parsed.review ?? 'No review generated',
        score: parsed.score ?? 50,
        issues: parsed.issues ?? [],
      };
    } catch {
      return {
        review: response,
        score: 50,
        issues: [],
      };
    }
  }
}

const agent = new CodeReviewAgent();
const port = parseInt(process.env.PORT ?? '6101');
const registry = process.env.REGISTRY_URL ?? 'http://localhost:6100';

agent.start(port, registry).then(() => {
  console.log(`code-review agent running on port ${port}`);
});
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: code-review demo agent — LLM-powered code analysis"
```

---

### Task 15: Demo Agents — test-writer + doc-generator

**Files:**
- Create: `agents/test-writer/package.json`, `agent.config.yaml`, `prompts.ts`, `agent.ts`
- Create: `agents/doc-generator/package.json`, `agent.config.yaml`, `prompts.ts`, `agent.ts`

- [ ] **Step 1: Create test-writer agent**

```json
// agents/test-writer/package.json
{
  "name": "agent-test-writer",
  "version": "1.0.0",
  "type": "module",
  "scripts": { "start": "tsx agent.ts", "dev": "tsx watch agent.ts" },
  "dependencies": { "@agentbridge/core": "*" },
  "devDependencies": { "tsx": "^4.19.0", "typescript": "^5.5.0" }
}
```

```yaml
# agents/test-writer/agent.config.yaml
name: test-writer
description: Generates unit tests from source code
version: 1.0.0
capabilities:
  - testing
  - unit-tests
  - test-generation
port: 6102
env:
  OPENROUTER_API_KEY: ${OPENROUTER_API_KEY}
  MODEL: deepseek/deepseek-chat
```

```typescript
// agents/test-writer/prompts.ts
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
```

```typescript
// agents/test-writer/agent.ts
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
    try {
      return JSON.parse(response);
    } catch {
      return { tests: response, testCount: 0, coverage: [] };
    }
  }
}

const agent = new TestWriterAgent();
const port = parseInt(process.env.PORT ?? '6102');
const registry = process.env.REGISTRY_URL ?? 'http://localhost:6100';
agent.start(port, registry).then(() => console.log(`test-writer agent running on port ${port}`));
```

- [ ] **Step 2: Create doc-generator agent**

```json
// agents/doc-generator/package.json
{
  "name": "agent-doc-generator",
  "version": "1.0.0",
  "type": "module",
  "scripts": { "start": "tsx agent.ts", "dev": "tsx watch agent.ts" },
  "dependencies": { "@agentbridge/core": "*" },
  "devDependencies": { "tsx": "^4.19.0", "typescript": "^5.5.0" }
}
```

```yaml
# agents/doc-generator/agent.config.yaml
name: doc-generator
description: Generates documentation from source code
version: 1.0.0
capabilities:
  - documentation
  - markdown
  - api-docs
port: 6103
env:
  OPENROUTER_API_KEY: ${OPENROUTER_API_KEY}
  MODEL: deepseek/deepseek-chat
```

```typescript
// agents/doc-generator/prompts.ts
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
```

```typescript
// agents/doc-generator/agent.ts
import { BaseAgent } from '@agentbridge/core';
import type { AgentConfig } from '@agentbridge/core';
import { docPrompt } from './prompts.js';

class DocGeneratorAgent extends BaseAgent {
  config: AgentConfig = {
    name: 'doc-generator',
    description: 'Generates documentation from source code',
    version: '1.0.0',
    capabilities: ['documentation', 'markdown', 'api-docs'],
    inputs: {
      code: { type: 'string', required: true, description: 'Source code to document' },
      format: { type: 'string', description: 'Doc format: readme, jsdoc, api-reference' },
    },
    outputs: {
      documentation: { type: 'string', description: 'Generated markdown' },
      sections: { type: 'array', description: 'Section titles' },
    },
  };

  async execute(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const code = input.code as string;
    const format = (input.format as string) ?? 'readme';

    const response = await this.callLLM(docPrompt(code, format));
    try {
      return JSON.parse(response);
    } catch {
      return { documentation: response, sections: [] };
    }
  }
}

const agent = new DocGeneratorAgent();
const port = parseInt(process.env.PORT ?? '6103');
const registry = process.env.REGISTRY_URL ?? 'http://localhost:6100';
agent.start(port, registry).then(() => console.log(`doc-generator agent running on port ${port}`));
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: test-writer + doc-generator demo agents"
```

---

### Task 16: Compose Engine + Root YAML

**Files:**
- Create: `packages/core/src/compose/parser.ts`
- Create: `packages/core/src/compose/executor.ts`
- Create: `packages/core/src/compose/process.ts`
- Create: `packages/core/src/__tests__/compose-parser.test.ts`
- Create: `agentbridge.yaml` (root example)
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write the failing test for compose parser**

```typescript
// packages/core/src/__tests__/compose-parser.test.ts
import { describe, it, expect } from 'vitest';
import { parseComposeFile, type ComposeConfig } from '../compose/parser.js';

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
    expect(() => parseComposeFile('version: 1.0.0\nagents: {}')).toThrow();
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx turbo test --filter=@agentbridge/core
```

- [ ] **Step 3: Implement compose parser**

```typescript
// packages/core/src/compose/parser.ts
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
  env: z.record(z.string(), z.string()).optional(),
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
  // Interpolate env vars
  const interpolated = yamlContent.replace(/\$\{(\w+)\}/g, (_, key) => process.env[key] ?? '');
  const raw = YAML.parse(interpolated);
  return composeSchema.parse(raw);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx turbo test --filter=@agentbridge/core
```

Expected: All tests PASS.

- [ ] **Step 5: Create workflow executor (stub for v1)**

```typescript
// packages/core/src/compose/executor.ts
import { A2AClient } from '../a2a/client.js';

export interface WorkflowStep {
  agent: string;
  input: unknown;
  output?: string;
  condition?: string;
}

export interface WorkflowDef {
  description?: string;
  steps: WorkflowStep[];
}

export class WorkflowExecutor {
  private a2aClient = new A2AClient();
  private agentUrls: Map<string, string>;

  constructor(agentUrls: Map<string, string>) {
    this.agentUrls = agentUrls;
  }

  async run(workflow: WorkflowDef, initialInput: Record<string, unknown>): Promise<Record<string, unknown>> {
    const context: Record<string, unknown> = { input: initialInput };

    for (const step of workflow.steps) {
      // Evaluate condition if present
      if (step.condition && !this.evaluateCondition(step.condition, context)) {
        continue;
      }

      const agentUrl = this.agentUrls.get(step.agent);
      if (!agentUrl) throw new Error(`Agent "${step.agent}" not found`);

      // Resolve input references
      const resolvedInput = this.resolveRefs(step.input, context);

      const result = await this.a2aClient.sendTask(agentUrl, {
        role: 'user',
        parts: [{ type: 'data', data: resolvedInput as Record<string, unknown> }],
      });

      if (result.status === 'failed') {
        throw new Error(`Agent "${step.agent}" failed: ${result.error?.message}`);
      }

      const outputData = result.result?.parts.find((p) => p.type === 'data')?.data ?? {};

      if (step.output) {
        const key = step.output.replace('$', '');
        context[key] = outputData;
      }
    }

    return context;
  }

  private resolveRefs(input: unknown, context: Record<string, unknown>): unknown {
    if (typeof input === 'string' && input.startsWith('$')) {
      const path = input.slice(1).split('.');
      let value: unknown = context;
      for (const key of path) {
        value = (value as Record<string, unknown>)?.[key];
      }
      return value;
    }
    if (typeof input === 'object' && input !== null) {
      const resolved: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(input)) {
        resolved[key] = this.resolveRefs(val, context);
      }
      return resolved;
    }
    return input;
  }

  private evaluateCondition(condition: string, context: Record<string, unknown>): boolean {
    // Simple evaluator for "$var.prop < value" patterns
    const match = condition.match(/^\$(\w+(?:\.\w+)*)\s*([<>=!]+)\s*(.+)$/);
    if (!match) return true;

    const [, path, op, rawVal] = match;
    let left: unknown = context;
    for (const key of path.split('.')) {
      left = (left as Record<string, unknown>)?.[key];
    }

    const right = Number(rawVal) || rawVal;
    switch (op) {
      case '<': return Number(left) < Number(right);
      case '>': return Number(left) > Number(right);
      case '==': return left == right;
      case '!=': return left != right;
      case '<=': return Number(left) <= Number(right);
      case '>=': return Number(left) >= Number(right);
      default: return true;
    }
  }
}
```

- [ ] **Step 6: Create root agentbridge.yaml**

```yaml
# agentbridge.yaml — AgentBridge Demo Pipeline
name: code-quality-pipeline
version: 1.0.0

registry:
  port: 6100

agents:
  code-review:
    path: ./agents/code-review
    port: 6101
    env:
      OPENROUTER_API_KEY: ${OPENROUTER_API_KEY}
      MODEL: deepseek/deepseek-chat

  test-writer:
    path: ./agents/test-writer
    port: 6102
    env:
      OPENROUTER_API_KEY: ${OPENROUTER_API_KEY}
      MODEL: deepseek/deepseek-chat

  doc-generator:
    path: ./agents/doc-generator
    port: 6103
    env:
      OPENROUTER_API_KEY: ${OPENROUTER_API_KEY}
      MODEL: deepseek/deepseek-chat

workflows:
  full-review:
    description: "Complete code quality pipeline"
    steps:
      - agent: code-review
        input: $input
        output: $review

      - agent: test-writer
        input: $review.code
        output: $tests
        condition: $review.score < 90

      - agent: doc-generator
        input:
          code: $input.code
          review: $review
        output: $docs

    output:
      review: $review
      tests: $tests
      docs: $docs

dashboard:
  enabled: true
  port: 6140

mcp:
  enabled: true
  transport: stdio
```

- [ ] **Step 7: Export and commit**

Add to `packages/core/src/index.ts`:
```typescript
export { parseComposeFile, type ComposeConfig } from './compose/parser.js';
export { WorkflowExecutor, type WorkflowDef, type WorkflowStep } from './compose/executor.js';
```

```bash
npx turbo build
git add -A
git commit -m "feat: compose engine — YAML parser, workflow executor, root agentbridge.yaml"
```

---

## Day 5: Dashboard (Part 1)

---

### Task 17: Dashboard Scaffold

**Files:**
- Create: `packages/dashboard/package.json`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `index.html`
- Create: `packages/dashboard/src/main.tsx`, `App.tsx`
- Create: `packages/dashboard/src/lib/theme.ts`, `api.ts`

- [ ] **Step 1: Create dashboard package.json**

```json
// packages/dashboard/package.json
{
  "name": "@agentbridge/dashboard",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "clean": "rm -rf dist .turbo"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.1.0",
    "framer-motion": "^12.0.0",
    "@xyflow/react": "^12.4.0",
    "lucide-react": "^0.468.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.5.0",
    "vite": "^6.0.0"
  }
}
```

- [ ] **Step 2: Create Vite + Tailwind config**

```typescript
// packages/dashboard/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 6140,
    proxy: {
      '/api': {
        target: 'http://localhost:6100',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/ws': {
        target: 'ws://localhost:6100',
        ws: true,
      },
    },
  },
});
```

```typescript
// packages/dashboard/tailwind.config.ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
```

```javascript
// packages/dashboard/postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

```json
// packages/dashboard/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create index.html**

```html
<!-- packages/dashboard/index.html -->
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AgentBridge Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
</head>
<body class="bg-slate-950 text-white font-sans antialiased">
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

- [ ] **Step 4: Create theme and API client**

```typescript
// packages/dashboard/src/lib/theme.ts
export const colors = {
  bg: {
    primary: 'bg-slate-950',
    secondary: 'bg-zinc-900',
    glass: 'bg-white/5 backdrop-blur-md',
    glassHover: 'hover:bg-white/10',
  },
  text: {
    primary: 'text-white',
    secondary: 'text-zinc-400',
    accent: 'text-indigo-400',
  },
  status: {
    healthy: 'text-green-400',
    unhealthy: 'text-red-400',
    working: 'text-yellow-400',
    unknown: 'text-zinc-500',
  },
  border: {
    glass: 'border border-white/10',
    accent: 'border-indigo-500/30',
  },
};

export const glass = 'bg-white/5 backdrop-blur-md border border-white/10 rounded-xl';
export const glassHover = `${glass} hover:bg-white/10 hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/20 transition-all duration-200`;
```

```typescript
// packages/dashboard/src/lib/api.ts
const BASE = '/api';

export async function fetchAgents() {
  const res = await fetch(`${BASE}/agents`);
  return res.json();
}

export async function fetchMetrics() {
  const res = await fetch(`${BASE}/metrics`);
  return res.json();
}

export async function fetchWorkflows() {
  const res = await fetch(`${BASE}/workflows`);
  return res.json();
}

export async function fetchAgentDetail(name: string) {
  const res = await fetch(`${BASE}/agents/${name}`);
  return res.json();
}
```

- [ ] **Step 5: Create main.tsx and App.tsx**

```typescript
// packages/dashboard/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.js';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
```

Create `packages/dashboard/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

```typescript
// packages/dashboard/src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout.js';
import { Registry } from './pages/Registry.js';
import { MessageFlow } from './pages/MessageFlow.js';
import { Workflows } from './pages/Workflows.js';
import { Health } from './pages/Health.js';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/registry" replace />} />
        <Route path="/registry" element={<Registry />} />
        <Route path="/messages" element={<MessageFlow />} />
        <Route path="/workflows" element={<Workflows />} />
        <Route path="/health" element={<Health />} />
      </Route>
    </Routes>
  );
}
```

- [ ] **Step 6: Install deps, build, and commit**

```bash
cd C:\AgentBridge
npm install
npx turbo build
git add -A
git commit -m "feat: dashboard scaffold — React 19, Vite, Tailwind, dark mode, routing"
```

---

### Task 18: Dashboard Components + Layout

**Files:**
- Create: `packages/dashboard/src/components/Layout.tsx`
- Create: `packages/dashboard/src/components/StatusDot.tsx`
- Create: `packages/dashboard/src/components/AgentCard.tsx`
- Create: `packages/dashboard/src/components/NumberTicker.tsx`
- Create: `packages/dashboard/src/components/ProgressBar.tsx`
- Create: `packages/dashboard/src/components/MessageRow.tsx`
- Create: `packages/dashboard/src/hooks/useWebSocket.ts`
- Create: `packages/dashboard/src/hooks/useAgents.ts`

- [ ] **Step 1: Create Layout with sidebar**

```tsx
// packages/dashboard/src/components/Layout.tsx
import { Outlet, NavLink } from 'react-router-dom';
import { LayoutGrid, MessageSquare, GitBranch, Activity } from 'lucide-react';
import { glass } from '../lib/theme.js';

const navItems = [
  { to: '/registry', icon: LayoutGrid, label: 'Registry' },
  { to: '/messages', icon: MessageSquare, label: 'Messages' },
  { to: '/workflows', icon: GitBranch, label: 'Workflows' },
  { to: '/health', icon: Activity, label: 'Health' },
];

export function Layout() {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <nav className={`w-56 ${glass} rounded-none border-r border-white/10 p-4 flex flex-col gap-1`}>
        <div className="text-lg font-bold text-indigo-400 mb-6 px-3">
          AgentBridge
        </div>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-indigo-500/20 text-indigo-300'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Create StatusDot component**

```tsx
// packages/dashboard/src/components/StatusDot.tsx
interface StatusDotProps {
  status: 'healthy' | 'unhealthy' | 'unknown' | 'working';
}

const statusColors = {
  healthy: 'bg-green-400',
  unhealthy: 'bg-red-400',
  unknown: 'bg-zinc-500',
  working: 'bg-yellow-400',
};

export function StatusDot({ status }: StatusDotProps) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      {status === 'healthy' && (
        <span className={`animate-ping-slow absolute inline-flex h-full w-full rounded-full ${statusColors[status]} opacity-75`} />
      )}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${statusColors[status]}`} />
    </span>
  );
}
```

- [ ] **Step 3: Create AgentCard component**

```tsx
// packages/dashboard/src/components/AgentCard.tsx
import { motion } from 'framer-motion';
import { StatusDot } from './StatusDot.js';
import { glassHover } from '../lib/theme.js';

interface AgentCardProps {
  name: string;
  description: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  capabilities: string[];
  url: string;
  totalTasks: number;
  onClick?: () => void;
}

export function AgentCard({ name, description, status, capabilities, url, totalTasks, onClick }: AgentCardProps) {
  const port = new URL(url).port;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${glassHover} p-5 cursor-pointer`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-2">
        <StatusDot status={status} />
        <h3 className="font-semibold text-white">{name}</h3>
        <span className="ml-auto font-mono text-xs text-zinc-500">:{port}</span>
      </div>
      <p className="text-sm text-zinc-400 mb-3 line-clamp-2">{description}</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {capabilities.map((cap) => (
          <span key={cap} className="px-2 py-0.5 text-xs rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {cap}
          </span>
        ))}
      </div>
      <div className="text-xs text-zinc-500">
        {totalTasks} tasks processed
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 4: Create NumberTicker and ProgressBar**

```tsx
// packages/dashboard/src/components/NumberTicker.tsx
import { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface NumberTickerProps {
  value: number;
  label: string;
}

export function NumberTicker({ value, label }: NumberTickerProps) {
  const spring = useSpring(0, { stiffness: 100, damping: 30 });
  const display = useTransform(spring, (v) => Math.round(v));
  const [displayVal, setDisplayVal] = useState(0);

  useEffect(() => {
    spring.set(value);
    return display.on('change', (v) => setDisplayVal(v));
  }, [value, spring, display]);

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-5">
      <div className="text-3xl font-bold text-white font-mono">{displayVal}</div>
      <div className="text-sm text-zinc-400 mt-1">{label}</div>
    </div>
  );
}
```

```tsx
// packages/dashboard/src/components/ProgressBar.tsx
import { motion } from 'framer-motion';

interface ProgressBarProps {
  value: number; // 0-100
  label?: string;
}

export function ProgressBar({ value, label }: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const color = clampedValue >= 90 ? 'from-green-500 to-green-400'
    : clampedValue >= 70 ? 'from-yellow-500 to-yellow-400'
    : 'from-red-500 to-red-400';

  return (
    <div>
      {label && <div className="text-xs text-zinc-400 mb-1">{label}</div>}
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${clampedValue}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create MessageRow component**

```tsx
// packages/dashboard/src/components/MessageRow.tsx
import { motion } from 'framer-motion';

interface MessageRowProps {
  timestamp: string;
  type: string;
  from?: string;
  to?: string;
  taskId?: string;
  latencyMs?: number;
}

const statusBadge: Record<string, string> = {
  task_sent: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  task_completed: 'bg-green-500/20 text-green-300 border-green-500/30',
  task_failed: 'bg-red-500/20 text-red-300 border-red-500/30',
  agent_registered: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  agent_removed: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
};

export function MessageRow({ timestamp, type, from, to, taskId, latencyMs }: MessageRowProps) {
  const badge = statusBadge[type] ?? statusBadge.agent_removed;
  const isFailed = type === 'task_failed';

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-4 px-4 py-2.5 border-b border-white/5 text-sm ${
        isFailed ? 'bg-red-500/5' : ''
      }`}
    >
      <span className="font-mono text-xs text-zinc-500 w-20 shrink-0">
        {new Date(timestamp).toLocaleTimeString()}
      </span>
      <span className={`px-2 py-0.5 text-xs rounded-full border ${badge}`}>
        {type.replace('_', ' ')}
      </span>
      {from && to && (
        <span className="text-zinc-400">
          <span className="text-white">{from}</span>
          <span className="mx-2 text-zinc-600">→</span>
          <span className="text-white">{to}</span>
        </span>
      )}
      {taskId && <span className="font-mono text-xs text-zinc-600">{taskId.slice(0, 8)}</span>}
      {latencyMs != null && <span className="ml-auto font-mono text-xs text-zinc-500">{latencyMs}ms</span>}
    </motion.div>
  );
}
```

- [ ] **Step 6: Create hooks**

```typescript
// packages/dashboard/src/hooks/useWebSocket.ts
import { useEffect, useRef, useState, useCallback } from 'react';

export function useWebSocket(url: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setMessages((prev) => [...prev.slice(-999), data]);
    };

    return () => ws.close();
  }, [url]);

  const clear = useCallback(() => setMessages([]), []);

  return { messages, connected, clear };
}
```

```typescript
// packages/dashboard/src/hooks/useAgents.ts
import { useState, useEffect } from 'react';
import { fetchAgents } from '../lib/api.js';

export function useAgents(pollInterval = 5000) {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchAgents();
        setAgents(data);
      } catch { /* registry not available */ }
      setLoading(false);
    }

    load();
    const interval = setInterval(load, pollInterval);
    return () => clearInterval(interval);
  }, [pollInterval]);

  return { agents, loading };
}
```

```typescript
// packages/dashboard/src/hooks/useMetrics.ts
import { useState, useEffect } from 'react';
import { fetchMetrics } from '../lib/api.js';

export function useMetrics(pollInterval = 5000) {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchMetrics();
        setMetrics(data);
      } catch { /* registry not available */ }
      setLoading(false);
    }

    load();
    const interval = setInterval(load, pollInterval);
    return () => clearInterval(interval);
  }, [pollInterval]);

  return { metrics, loading };
}
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: dashboard components — Layout, AgentCard, StatusDot, MessageRow, NumberTicker, hooks"
```

---

### Task 19: Dashboard Pages — Registry + Message Flow

**Files:**
- Create: `packages/dashboard/src/pages/Registry.tsx`
- Create: `packages/dashboard/src/pages/MessageFlow.tsx`

- [ ] **Step 1: Implement Registry page**

```tsx
// packages/dashboard/src/pages/Registry.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { useAgents } from '../hooks/useAgents.js';
import { AgentCard } from '../components/AgentCard.js';
import { glass } from '../lib/theme.js';

export function Registry() {
  const { agents, loading } = useAgents();
  const [search, setSearch] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<any>(null);

  const filtered = agents.filter((a: any) =>
    a.card.name.includes(search.toLowerCase()) ||
    a.card.capabilities.some((c: string) => c.includes(search.toLowerCase()))
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Agent Registry</h1>

      {/* Search */}
      <div className={`${glass} flex items-center gap-3 px-4 py-2.5 mb-6 max-w-md`}>
        <Search size={16} className="text-zinc-500" />
        <input
          type="text"
          placeholder="Search agents or capabilities..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent outline-none text-sm text-white placeholder-zinc-500 flex-1"
        />
      </div>

      {loading ? (
        <div className="text-zinc-500">Loading agents...</div>
      ) : filtered.length === 0 ? (
        <div className="text-zinc-500">No agents registered. Run `npx agentbridge up` to start.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((a: any) => (
              <AgentCard
                key={a.card.name}
                name={a.card.name}
                description={a.card.description}
                status={a.status}
                capabilities={a.card.capabilities}
                url={a.card.url}
                totalTasks={a.metrics.totalTasks}
                onClick={() => setSelectedAgent(a)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Side panel */}
      <AnimatePresence>
        {selectedAgent && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            className={`fixed top-0 right-0 h-full w-96 ${glass} rounded-none border-l border-white/10 p-6 overflow-auto z-50`}
          >
            <button onClick={() => setSelectedAgent(null)} className="absolute top-4 right-4 text-zinc-500 hover:text-white">
              <X size={20} />
            </button>
            <h2 className="text-lg font-bold mb-4">{selectedAgent.card.name}</h2>
            <p className="text-sm text-zinc-400 mb-4">{selectedAgent.card.description}</p>

            <div className="space-y-4 text-sm">
              <div>
                <div className="text-zinc-500 text-xs mb-1">URL</div>
                <div className="font-mono text-zinc-300">{selectedAgent.card.url}</div>
              </div>
              <div>
                <div className="text-zinc-500 text-xs mb-1">Version</div>
                <div className="text-zinc-300">{selectedAgent.card.version}</div>
              </div>
              <div>
                <div className="text-zinc-500 text-xs mb-1">Skills</div>
                <pre className="font-mono text-xs text-zinc-400 bg-black/20 rounded p-3 overflow-auto">
                  {JSON.stringify(selectedAgent.card.skills, null, 2)}
                </pre>
              </div>
              <div>
                <div className="text-zinc-500 text-xs mb-1">Metrics</div>
                <pre className="font-mono text-xs text-zinc-400 bg-black/20 rounded p-3 overflow-auto">
                  {JSON.stringify(selectedAgent.metrics, null, 2)}
                </pre>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: Implement MessageFlow page**

```tsx
// packages/dashboard/src/pages/MessageFlow.tsx
import { useState, useRef, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Pause, Play } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket.js';
import { MessageRow } from '../components/MessageRow.js';

export function MessageFlow() {
  const { messages, connected } = useWebSocket(`ws://${window.location.hostname}:6100/ws`);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!paused && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, paused]);

  const filtered = messages.filter((m) => {
    if (!filter) return true;
    return (
      m.type?.includes(filter) ||
      m.from?.includes(filter) ||
      m.to?.includes(filter) ||
      m.taskId?.includes(filter)
    );
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 mb-4">
        <h1 className="text-2xl font-bold">Live Message Flow</h1>
        <span className={`text-xs px-2 py-1 rounded-full ${connected ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
          {connected ? 'Connected' : 'Disconnected'}
        </span>
        <button
          onClick={() => setPaused(!paused)}
          className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-400 hover:text-white"
        >
          {paused ? <Play size={14} /> : <Pause size={14} />}
          {paused ? 'Resume' : 'Pause'}
        </button>
      </div>

      {/* Filter */}
      <input
        type="text"
        placeholder="Filter by agent, type, or task ID..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder-zinc-500 outline-none mb-4"
      />

      {/* Message stream */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto bg-zinc-950 rounded-xl border border-white/5"
      >
        {filtered.length === 0 ? (
          <div className="text-zinc-600 text-center py-12">
            Waiting for messages...
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filtered.map((m, i) => (
              <MessageRow
                key={m.id ?? i}
                timestamp={m.timestamp}
                type={m.type}
                from={m.from}
                to={m.to}
                taskId={m.taskId}
                latencyMs={m.latencyMs}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Build and commit**

```bash
npx turbo build
git add -A
git commit -m "feat: dashboard pages — Registry (agent grid + side panel) + Live Message Flow"
```

---

## Day 6: Dashboard (Part 2)

---

### Task 20: Dashboard — Workflow Visualizer + Health Pages

**Files:**
- Create: `packages/dashboard/src/components/WorkflowNode.tsx`
- Create: `packages/dashboard/src/components/WorkflowEdge.tsx`
- Create: `packages/dashboard/src/pages/Workflows.tsx`
- Create: `packages/dashboard/src/pages/Health.tsx`

- [ ] **Step 1: Create custom React Flow node**

```tsx
// packages/dashboard/src/components/WorkflowNode.tsx
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { StatusDot } from './StatusDot.js';

interface WorkflowNodeData {
  label: string;
  status: 'healthy' | 'unhealthy' | 'unknown' | 'working';
  capabilities: string[];
}

export function WorkflowNode({ data }: NodeProps) {
  const { label, status, capabilities } = data as unknown as WorkflowNodeData;
  const isActive = status === 'working';

  return (
    <div
      className={`px-4 py-3 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 min-w-[160px] ${
        isActive ? 'shadow-lg shadow-indigo-500/30 border-indigo-500/50' : ''
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-indigo-400 !w-2 !h-2" />
      <div className="flex items-center gap-2 mb-1">
        <StatusDot status={status} />
        <span className="font-semibold text-sm text-white">{label}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {(capabilities ?? []).slice(0, 3).map((c: string) => (
          <span key={c} className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300">
            {c}
          </span>
        ))}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-indigo-400 !w-2 !h-2" />
    </div>
  );
}
```

- [ ] **Step 2: Create custom animated edge**

```tsx
// packages/dashboard/src/components/WorkflowEdge.tsx
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';

export function WorkflowEdge(props: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
  });

  return (
    <BaseEdge
      path={edgePath}
      style={{
        stroke: 'rgba(99, 102, 241, 0.4)',
        strokeWidth: 2,
        strokeDasharray: '8 4',
        animation: 'dashmove 1s linear infinite',
      }}
    />
  );
}
```

Add to `packages/dashboard/src/index.css`:
```css
@keyframes dashmove {
  to { stroke-dashoffset: -12; }
}
```

- [ ] **Step 3: Implement Workflows page**

```tsx
// packages/dashboard/src/pages/Workflows.tsx
import { useState, useEffect, useCallback } from 'react';
import { ReactFlow, Background, Controls, type Node, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { WorkflowNode } from '../components/WorkflowNode.js';
import { WorkflowEdge } from '../components/WorkflowEdge.js';
import { fetchWorkflows, fetchAgents } from '../lib/api.js';

const nodeTypes = { workflow: WorkflowNode };
const edgeTypes = { animated: WorkflowEdge };

export function Workflows() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [activeWorkflow, setActiveWorkflow] = useState(0);

  useEffect(() => {
    fetchWorkflows().then(setWorkflows).catch(() => {});
    fetchAgents().then(setAgents).catch(() => {});
  }, []);

  const getAgentStatus = useCallback(
    (name: string) => agents.find((a: any) => a.card?.name === name)?.status ?? 'unknown',
    [agents],
  );

  const workflow = workflows[activeWorkflow];
  if (!workflow) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Workflow Visualizer</h1>
        <div className="text-zinc-500">No workflows defined. Add workflows to agentbridge.yaml.</div>
      </div>
    );
  }

  const steps = workflow.steps ?? [];
  const nodes: Node[] = steps.map((step: any, i: number) => ({
    id: step.agent,
    type: 'workflow',
    position: { x: i * 250, y: 100 },
    data: {
      label: step.agent,
      status: getAgentStatus(step.agent),
      capabilities: agents.find((a: any) => a.card?.name === step.agent)?.card?.capabilities ?? [],
    },
  }));

  const edges: Edge[] = steps.slice(1).map((step: any, i: number) => ({
    id: `${steps[i].agent}-${step.agent}`,
    source: steps[i].agent,
    target: step.agent,
    type: 'animated',
    animated: true,
  }));

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 mb-4">
        <h1 className="text-2xl font-bold">Workflow Visualizer</h1>
        {workflows.length > 1 && (
          <div className="flex gap-1">
            {workflows.map((w: any, i: number) => (
              <button
                key={i}
                onClick={() => setActiveWorkflow(i)}
                className={`px-3 py-1 text-sm rounded-lg ${
                  i === activeWorkflow
                    ? 'bg-indigo-500/20 text-indigo-300'
                    : 'text-zinc-500 hover:text-white'
                }`}
              >
                {w.name ?? `Workflow ${i + 1}`}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 rounded-xl overflow-hidden border border-white/10">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          className="bg-slate-950"
        >
          <Background color="#333" gap={20} />
          <Controls className="!bg-zinc-800 !border-zinc-700 !text-white" />
        </ReactFlow>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Implement Health page**

```tsx
// packages/dashboard/src/pages/Health.tsx
import { useMetrics } from '../hooks/useMetrics.js';
import { NumberTicker } from '../components/NumberTicker.js';
import { ProgressBar } from '../components/ProgressBar.js';
import { StatusDot } from '../components/StatusDot.js';
import { glass } from '../lib/theme.js';

export function Health() {
  const { metrics, loading } = useMetrics();

  if (loading || !metrics) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Health & Metrics</h1>
        <div className="text-zinc-500">Loading metrics...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Health & Metrics</h1>

      {/* Top number cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <NumberTicker value={metrics.totalAgents ?? 0} label="Total Agents" />
        <NumberTicker value={metrics.healthyAgents ?? 0} label="Healthy" />
        <NumberTicker value={metrics.unhealthyAgents ?? 0} label="Unhealthy" />
        <NumberTicker
          value={metrics.agents?.reduce((sum: number, a: any) => sum + (a.metrics?.totalTasks ?? 0), 0) ?? 0}
          label="Total Tasks"
        />
      </div>

      {/* Per-agent stats */}
      <div className="space-y-4">
        {(metrics.agents ?? []).map((agent: any) => {
          const successRate = agent.metrics.totalTasks > 0
            ? Math.round((agent.metrics.successCount / agent.metrics.totalTasks) * 100)
            : 100;

          return (
            <div key={agent.name} className={`${glass} p-5`}>
              <div className="flex items-center gap-3 mb-4">
                <StatusDot status={agent.status} />
                <h3 className="font-semibold">{agent.name}</h3>
                <span className="text-xs text-zinc-500 ml-auto">{agent.metrics.totalTasks} tasks</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <ProgressBar value={successRate} label={`Success Rate: ${successRate}%`} />
                </div>
                <div className="text-sm">
                  <div className="text-zinc-500 text-xs mb-1">Response Time</div>
                  <div className="flex gap-4 font-mono text-xs">
                    <span>avg: <span className="text-white">{Math.round(agent.metrics.avgResponseMs)}ms</span></span>
                    <span>p95: <span className="text-white">{Math.round(agent.metrics.p95ResponseMs)}ms</span></span>
                    <span>p99: <span className="text-white">{Math.round(agent.metrics.p99ResponseMs)}ms</span></span>
                  </div>
                </div>
                <div className="text-sm">
                  <div className="text-zinc-500 text-xs mb-1">Breakdown</div>
                  <div className="flex gap-4 font-mono text-xs">
                    <span className="text-green-400">{agent.metrics.successCount} ok</span>
                    <span className="text-red-400">{agent.metrics.failCount} fail</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Build and commit**

```bash
npx turbo build
git add -A
git commit -m "feat: dashboard — Workflow Visualizer (React Flow) + Health & Metrics page"
```

---

## Day 7: Adapters + Polish

---

### Task 21: Framework Adapters

**Files:**
- Create: `packages/adapter-langchain/package.json`, `tsconfig.json`, `src/adapter.ts`, `src/index.ts`
- Create: `packages/adapter-crewai/package.json`, `tsconfig.json`, `src/adapter.ts`, `src/index.ts`
- Create: `packages/adapter-openai-agents/package.json`, `tsconfig.json`, `src/adapter.ts`, `src/index.ts`

- [ ] **Step 1: Create adapter-langchain**

```json
// packages/adapter-langchain/package.json
{
  "name": "@agentbridge/adapter-langchain",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": { "build": "tsup", "clean": "rm -rf dist" },
  "dependencies": { "@agentbridge/core": "*" },
  "peerDependencies": { "langchain": ">=0.3.0" },
  "devDependencies": { "tsup": "^8.3.0", "typescript": "^5.5.0" }
}
```

```json
// packages/adapter-langchain/tsconfig.json
{ "extends": "../../tsconfig.base.json", "compilerOptions": { "outDir": "dist", "rootDir": "src" }, "include": ["src"] }
```

```typescript
// packages/adapter-langchain/src/adapter.ts
import { BaseAgent, generateAgentCard, createA2AServer } from '@agentbridge/core';
import type { AgentConfig, A2AMessage } from '@agentbridge/core';

export interface LangChainAdapterOptions {
  name: string;
  description: string;
  capabilities: string[];
  agent: any; // LangChain RunnableSequence | AgentExecutor | Chain
  inputMapper?: (input: Record<string, unknown>) => Record<string, unknown>;
  outputMapper?: (result: any) => Record<string, unknown>;
}

export class LangChainAdapter {
  private options: LangChainAdapterOptions;
  private httpServer: any;

  constructor(options: LangChainAdapterOptions) {
    this.options = options;
  }

  async start(port: number): Promise<void> {
    const { name, description, capabilities, agent, inputMapper, outputMapper } = this.options;
    const url = `http://localhost:${port}`;
    const card = generateAgentCard(
      { name, description, version: '1.0.0', capabilities, inputs: {}, outputs: {} },
      url,
    );

    const { app } = createA2AServer({
      card,
      handler: async (message: A2AMessage) => {
        const dataPart = message.parts.find((p) => p.type === 'data');
        const rawInput = (dataPart?.data ?? {}) as Record<string, unknown>;
        const mapped = inputMapper ? inputMapper(rawInput) : rawInput;
        const result = await agent.invoke(mapped);
        const output = outputMapper ? outputMapper(result) : { result };
        return { role: 'agent', parts: [{ type: 'data', data: output }] };
      },
    });

    await new Promise<void>((resolve) => {
      this.httpServer = app.listen(port, resolve);
    });
  }

  async register(registryUrl: string): Promise<void> {
    const card = generateAgentCard(
      { name: this.options.name, description: this.options.description, version: '1.0.0', capabilities: this.options.capabilities, inputs: {}, outputs: {} },
      `http://localhost:${this.httpServer?.address()?.port}`,
    );
    await fetch(`${registryUrl}/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card),
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => this.httpServer?.close(resolve));
  }
}
```

```typescript
// packages/adapter-langchain/src/index.ts
export { LangChainAdapter, type LangChainAdapterOptions } from './adapter.js';
```

- [ ] **Step 2: Create adapter-crewai**

```json
// packages/adapter-crewai/package.json
{
  "name": "@agentbridge/adapter-crewai",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": { "build": "tsup", "clean": "rm -rf dist" },
  "dependencies": { "@agentbridge/core": "*" },
  "devDependencies": { "tsup": "^8.3.0", "typescript": "^5.5.0" }
}
```

```json
// packages/adapter-crewai/tsconfig.json
{ "extends": "../../tsconfig.base.json", "compilerOptions": { "outDir": "dist", "rootDir": "src" }, "include": ["src"] }
```

```typescript
// packages/adapter-crewai/src/adapter.ts
import { generateAgentCard, createA2AServer } from '@agentbridge/core';
import type { A2AMessage } from '@agentbridge/core';

export interface CrewAIAdapterOptions {
  name: string;
  description: string;
  capabilities: string[];
  crew: any; // CrewAI crew instance
  inputMapper?: (input: Record<string, unknown>) => any;
  outputMapper?: (result: any) => Record<string, unknown>;
}

export class CrewAIAdapter {
  private options: CrewAIAdapterOptions;
  private httpServer: any;

  constructor(options: CrewAIAdapterOptions) {
    this.options = options;
  }

  async start(port: number): Promise<void> {
    const { name, description, capabilities, crew, inputMapper, outputMapper } = this.options;
    const url = `http://localhost:${port}`;
    const card = generateAgentCard(
      { name, description, version: '1.0.0', capabilities, inputs: {}, outputs: {} },
      url,
    );

    const { app } = createA2AServer({
      card,
      handler: async (message: A2AMessage) => {
        const dataPart = message.parts.find((p) => p.type === 'data');
        const rawInput = (dataPart?.data ?? {}) as Record<string, unknown>;
        const mapped = inputMapper ? inputMapper(rawInput) : rawInput;
        const result = await crew.kickoff(mapped);
        const output = outputMapper ? outputMapper(result) : { result: String(result) };
        return { role: 'agent', parts: [{ type: 'data', data: output }] };
      },
    });

    await new Promise<void>((resolve) => {
      this.httpServer = app.listen(port, resolve);
    });
  }

  async register(registryUrl: string): Promise<void> {
    const card = generateAgentCard(
      { name: this.options.name, description: this.options.description, version: '1.0.0', capabilities: this.options.capabilities, inputs: {}, outputs: {} },
      `http://localhost:${this.httpServer?.address()?.port}`,
    );
    await fetch(`${registryUrl}/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card),
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => this.httpServer?.close(resolve));
  }
}
```

```typescript
// packages/adapter-crewai/src/index.ts
export { CrewAIAdapter, type CrewAIAdapterOptions } from './adapter.js';
```

- [ ] **Step 3: Create adapter-openai-agents**

```json
// packages/adapter-openai-agents/package.json
{
  "name": "@agentbridge/adapter-openai-agents",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": { "build": "tsup", "clean": "rm -rf dist" },
  "dependencies": { "@agentbridge/core": "*" },
  "devDependencies": { "tsup": "^8.3.0", "typescript": "^5.5.0" }
}
```

```json
// packages/adapter-openai-agents/tsconfig.json
{ "extends": "../../tsconfig.base.json", "compilerOptions": { "outDir": "dist", "rootDir": "src" }, "include": ["src"] }
```

```typescript
// packages/adapter-openai-agents/src/adapter.ts
import { generateAgentCard, createA2AServer } from '@agentbridge/core';
import type { A2AMessage } from '@agentbridge/core';

export interface OpenAIAgentAdapterOptions {
  name: string;
  description: string;
  capabilities: string[];
  agent: any; // OpenAI Agents SDK agent
  inputMapper?: (input: Record<string, unknown>) => string;
  outputMapper?: (result: any) => Record<string, unknown>;
}

export class OpenAIAgentAdapter {
  private options: OpenAIAgentAdapterOptions;
  private httpServer: any;

  constructor(options: OpenAIAgentAdapterOptions) {
    this.options = options;
  }

  async start(port: number): Promise<void> {
    const { name, description, capabilities, agent, inputMapper, outputMapper } = this.options;
    const url = `http://localhost:${port}`;
    const card = generateAgentCard(
      { name, description, version: '1.0.0', capabilities, inputs: {}, outputs: {} },
      url,
    );

    const { app } = createA2AServer({
      card,
      handler: async (message: A2AMessage) => {
        const dataPart = message.parts.find((p) => p.type === 'data');
        const rawInput = (dataPart?.data ?? {}) as Record<string, unknown>;
        const prompt = inputMapper ? inputMapper(rawInput) : JSON.stringify(rawInput);
        const result = await agent.run(prompt);
        const output = outputMapper ? outputMapper(result) : { result: String(result.output ?? result) };
        return { role: 'agent', parts: [{ type: 'data', data: output }] };
      },
    });

    await new Promise<void>((resolve) => {
      this.httpServer = app.listen(port, resolve);
    });
  }

  async register(registryUrl: string): Promise<void> {
    const card = generateAgentCard(
      { name: this.options.name, description: this.options.description, version: '1.0.0', capabilities: this.options.capabilities, inputs: {}, outputs: {} },
      `http://localhost:${this.httpServer?.address()?.port}`,
    );
    await fetch(`${registryUrl}/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card),
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => this.httpServer?.close(resolve));
  }
}
```

```typescript
// packages/adapter-openai-agents/src/index.ts
export { OpenAIAgentAdapter, type OpenAIAgentAdapterOptions } from './adapter.js';
```

- [ ] **Step 4: Add tsup configs for all adapters**

Each adapter gets the same tsup config:
```typescript
// packages/adapter-*/tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
});
```

- [ ] **Step 5: Build and commit**

```bash
cd C:\AgentBridge
npm install
npx turbo build
git add -A
git commit -m "feat: framework adapters — LangChain, CrewAI, OpenAI Agents SDK"
```

---

### Task 22: Examples + Claude Code Setup

**Files:**
- Create: `examples/claude-code-setup/README.md`
- Create: `examples/claude-code-setup/mcp-config.json`
- Create: `examples/basic-workflow/agentbridge.yaml`
- Create: `examples/basic-workflow/README.md`

- [ ] **Step 1: Create Claude Code setup example**

```json
// examples/claude-code-setup/mcp-config.json
{
  "mcpServers": {
    "agentbridge": {
      "command": "npx",
      "args": ["agentbridge", "mcp"],
      "env": {
        "AGENTBRIDGE_REGISTRY": "http://localhost:6100"
      }
    }
  }
}
```

```markdown
<!-- examples/claude-code-setup/README.md -->
# AgentBridge + Claude Code Setup

## Quick Start

### 1. Start AgentBridge

```bash
cd /path/to/agentbridge
npx agentbridge up
```

### 2. Add MCP Config

Copy `mcp-config.json` to your project's `.mcp.json`, or add the `agentbridge` entry to your existing `~/.claude.json`:

```json
{
  "mcpServers": {
    "agentbridge": {
      "command": "npx",
      "args": ["agentbridge", "mcp"],
      "env": {
        "AGENTBRIDGE_REGISTRY": "http://localhost:6100"
      }
    }
  }
}
```

### 3. Use in Claude Code

Once configured, Claude Code will see your agents as tools:

```
User: "Review this code for security issues"
Claude: [calls agent_code_review tool]

User: "Write tests for the issues found"
Claude: [calls agent_test_writer tool]

User: "Generate docs for this module"
Claude: [calls agent_doc_generator tool]
```

Tools appear/disappear dynamically as agents register/deregister.
```

- [ ] **Step 2: Create basic workflow example**

```yaml
# examples/basic-workflow/agentbridge.yaml
name: basic-pipeline
version: 1.0.0

registry:
  port: 6100

agents:
  code-review:
    path: ../../agents/code-review
    port: 6101
    env:
      OPENROUTER_API_KEY: ${OPENROUTER_API_KEY}

  doc-generator:
    path: ../../agents/doc-generator
    port: 6103
    env:
      OPENROUTER_API_KEY: ${OPENROUTER_API_KEY}

workflows:
  review-and-doc:
    description: "Review code then generate docs"
    steps:
      - agent: code-review
        input: $input
        output: $review
      - agent: doc-generator
        input:
          code: $input.code
          review: $review
        output: $docs

dashboard:
  enabled: true
  port: 6140
```

```markdown
<!-- examples/basic-workflow/README.md -->
# Basic Workflow Example

A simple two-agent pipeline: code review followed by documentation generation.

## Run

```bash
cd examples/basic-workflow
OPENROUTER_API_KEY=your_key npx agentbridge up
```

## What Happens

1. Registry starts on port 6100
2. `code-review` agent starts on port 6101
3. `doc-generator` agent starts on port 6103
4. Dashboard available at http://localhost:6140
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: examples — Claude Code setup guide + basic workflow"
```

---

### Task 23: README + LICENSE + CONTRIBUTING

**Files:**
- Create: `README.md`
- Create: `LICENSE`
- Create: `CONTRIBUTING.md`

- [ ] **Step 1: Create README.md**

```markdown
<!-- README.md -->
# AgentBridge

> **MCP + A2A framework for building, registering, discovering, and orchestrating AI agents.**

Build agents that are automatically usable from **Claude Code**, **Cursor**, and **Copilot** (via MCP) — and can communicate with each other (via A2A).

**"Docker Compose — but for AI agents."**

## Quick Start

```bash
# Install
npm install @agentbridge/core @agentbridge/cli

# Scaffold a new agent
npx agentbridge init my-agent

# Start everything
npx agentbridge up
```

## Architecture

```
Claude Code / Cursor ←──MCP──→ AgentBridge Registry ←──A2A──→ Your Agents
                                      ↓
                               Web Dashboard (real-time)
```

- **Build** agents with a dead-simple SDK — extend `BaseAgent`, implement `execute()`
- **Register** agents with an A2A-compatible registry (auto-discovery)
- **Bridge** agents to any MCP client — agents become tools automatically
- **Orchestrate** multi-agent workflows via YAML compose files
- **Monitor** everything via a real-time dashboard

## Define an Agent (30 seconds)

```typescript
import { BaseAgent } from '@agentbridge/core';

class MyAgent extends BaseAgent {
  config = {
    name: 'my-agent',
    description: 'Does something useful',
    version: '1.0.0',
    capabilities: ['analysis'],
    inputs: { text: { type: 'string', required: true } },
    outputs: { result: { type: 'string' } },
  };

  async execute(input) {
    const response = await this.callLLM(`Analyze: ${input.text}`);
    return { result: response };
  }
}
```

## Compose Multi-Agent Workflows

```yaml
# agentbridge.yaml
name: code-quality-pipeline

agents:
  code-review:
    path: ./agents/code-review
    port: 6101
  test-writer:
    path: ./agents/test-writer
    port: 6102

workflows:
  full-review:
    steps:
      - agent: code-review
        input: $input
        output: $review
      - agent: test-writer
        input: $review
        output: $tests
        condition: $review.score < 90

dashboard:
  enabled: true
  port: 6140
```

```bash
npx agentbridge up
```

## Claude Code Integration

Add to `.mcp.json`:

```json
{
  "mcpServers": {
    "agentbridge": {
      "command": "npx",
      "args": ["agentbridge", "mcp"]
    }
  }
}
```

Your agents appear as tools in Claude Code automatically.

## Framework Adapters

Bring existing agents from other frameworks into AgentBridge:

```typescript
import { LangChainAdapter } from '@agentbridge/adapter-langchain';

const agent = new LangChainAdapter({
  name: 'research-agent',
  description: 'Research using LangChain',
  capabilities: ['research'],
  agent: myLangChainAgent,
});

await agent.start(6110);
await agent.register('http://localhost:6100');
```

Adapters available for: **LangChain**, **CrewAI**, **OpenAI Agents SDK**

## Dashboard

Real-time monitoring at `http://localhost:6140`:

- **Registry** — Agent cards with status, capabilities, metrics
- **Message Flow** — Live WebSocket stream of all agent communication
- **Workflows** — Visual DAG of multi-agent pipelines (React Flow)
- **Health** — Response times, success rates, per-agent metrics

## Packages

| Package | Description |
|---|---|
| `@agentbridge/core` | Agent SDK, registry, A2A, MCP bridge, message bus, compose engine |
| `@agentbridge/cli` | CLI for scaffolding, running, and managing agents |
| `@agentbridge/dashboard` | Real-time monitoring dashboard |
| `@agentbridge/adapter-langchain` | LangChain adapter |
| `@agentbridge/adapter-crewai` | CrewAI adapter |
| `@agentbridge/adapter-openai-agents` | OpenAI Agents SDK adapter |

## CLI Commands

| Command | Description |
|---|---|
| `npx agentbridge init [name]` | Scaffold a new agent |
| `npx agentbridge up` | Start everything from YAML |
| `npx agentbridge list` | List registered agents |
| `npx agentbridge call [agent] [input]` | Invoke an agent |
| `npx agentbridge mcp` | Start MCP server |
| `npx agentbridge dashboard` | Start dashboard |

## Tech Stack

TypeScript, Express, @modelcontextprotocol/sdk, React 19, Vite, Tailwind CSS, Framer Motion, React Flow, Turborepo

## License

MIT
```

- [ ] **Step 2: Create LICENSE (MIT)**

```
MIT License

Copyright (c) 2026 Vemula Srimaan Shreyas

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 3: Create CONTRIBUTING.md**

```markdown
# Contributing to AgentBridge

## Getting Started

```bash
git clone https://github.com/srimaan/agentbridge.git
cd agentbridge
npm install
npx turbo build
```

## Adding a New Agent

1. `npx agentbridge init my-agent`
2. Implement your logic in `agent.ts`
3. Add to `agentbridge.yaml`
4. Test: `npx agentbridge up`

## Adding a Framework Adapter

1. Create `packages/adapter-yourframework/`
2. Follow the pattern in `packages/adapter-langchain/`
3. Wrap your framework's agent interface
4. Add an example in the adapter package

## Development

```bash
npx turbo dev          # Watch mode for all packages
npx turbo test         # Run all tests
npx turbo build        # Build all packages
```

## Code Style

- TypeScript strict mode
- ESM modules
- Functional where possible, classes for agents and adapters
- Zod for runtime validation

## Pull Requests

- One feature per PR
- Include tests for core changes
- Update README if adding user-facing features
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: README, LICENSE (MIT), CONTRIBUTING guide"
```

---

### Task 24: Final Integration Test

**Files:** None created — this is a verification task.

- [ ] **Step 1: Full build**

```bash
cd C:\AgentBridge
npm install
npx turbo build
```

Expected: All packages build without errors.

- [ ] **Step 2: Run all tests**

```bash
npx turbo test
```

Expected: All tests pass.

- [ ] **Step 3: Test CLI init**

```bash
cd /tmp
npx agentbridge init test-agent
```

Expected: Creates `test-agent/` with `agent.ts`, `agent.config.yaml`, `package.json`, `tsconfig.json`, `.env.example`.

- [ ] **Step 4: Test compose up (manual)**

```bash
cd C:\AgentBridge
OPENROUTER_API_KEY=test npx agentbridge up
```

Expected: Registry starts on 6100, agents start on 6101-6103 (will fail without valid API key but should start).

- [ ] **Step 5: Verify MCP config works**

Create test `.mcp.json`:
```json
{
  "mcpServers": {
    "agentbridge": {
      "command": "npx",
      "args": ["agentbridge", "mcp"],
      "env": {
        "AGENTBRIDGE_REGISTRY": "http://localhost:6100"
      }
    }
  }
}
```

Verify Claude Code sees the tools when registry is running.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: final integration verification — all packages build and test"
```

---

## Summary

| Day | Tasks | What Ships |
|-----|-------|-----------|
| 1 | 1-5 | Monorepo, types, agent card, store, registry server |
| 2 | 6-10 | Task manager, A2A client/server, BaseAgent, message bus |
| 3 | 11-13 | MCP bridge, CLI (init, up, list, call, register, mcp) |
| 4 | 14-16 | 3 demo agents, compose engine, root YAML |
| 5 | 17-19 | Dashboard scaffold, components, Registry + Message Flow pages |
| 6 | 20 | Workflow Visualizer + Health pages |
| 7 | 21-24 | Adapters, examples, README, LICENSE, integration test |

**Total: 24 tasks, ~7 days**
