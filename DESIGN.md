# AgentBridge — Design Specification

> **Open-source MCP + A2A framework for building, registering, discovering, and orchestrating AI agents.**
>
> One of the first implementations combining both protocols.
> Agents built with AgentBridge are automatically usable from Claude Code, Cursor, Copilot (via MCP) and can communicate with each other (via A2A).

**Author:** Vemula Srimaan Shreyas
**Date:** 2026-04-02
**Status:** Final — ready for implementation

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Monorepo Structure](#3-monorepo-structure)
4. [Core Package](#4-core-package)
5. [CLI Package](#5-cli-package)
6. [Dashboard Package](#6-dashboard-package)
7. [Framework Adapters](#7-framework-adapters)
8. [Built-in Demo Agents](#8-built-in-demo-agents)
9. [Claude Code Integration](#9-claude-code-integration)
10. [Tech Stack](#10-tech-stack)
11. [Implementation Timeline](#11-implementation-timeline)
12. [Decisions & Rationale](#12-decisions--rationale)

---

## 1. Overview

### The Problem

Every company building AI agents is hitting the same wall:

- Agents can't discover each other
- Agents can't communicate across frameworks (LangChain agent can't talk to CrewAI agent)
- Agents aren't accessible from LLM tools (Claude Code, Cursor, Copilot)
- No standard way to define multi-agent workflows
- No visibility into what agents are doing

### The Solution

**AgentBridge** is a TypeScript framework that solves all of this:

- **Build** agents with a dead-simple SDK (extend `BaseAgent`, implement `execute()`)
- **Register** agents with an A2A-compatible registry (auto-discovery)
- **Bridge** agents to any MCP client (Claude Code, Cursor, Copilot) — agents become tools automatically
- **Orchestrate** multi-agent workflows via YAML compose files
- **Monitor** everything via a real-time dashboard
- **Adapt** existing agents from LangChain, CrewAI, OpenAI Agents SDK

### One-Line Pitch

> **"Docker Compose — but for AI agents."**

### Target Users

- AI engineers building multi-agent systems
- Developers who want their agents accessible from Claude Code / Cursor
- Teams that need agents from different frameworks to talk to each other
- Open-source contributors building agent tooling

---

## 2. Architecture

### High-Level Diagram

```
                          +---------------------------+
                          |      Web Dashboard        |
                          |  (React 19 + Vite)        |
                          |  - Agent Registry View    |
                          |  - Live Message Flow      |
                          |  - Workflow Visualizer    |
                          |  - Health & Metrics       |
                          +------------+--------------+
                                       | REST + WebSocket
                                       |
+----------------+         +-----------+-------------+         +----------------+
| Claude Code    |         |    AgentBridge Core     |         |  External      |
| Cursor         |<--MCP-->|                         |<--A2A-->|  A2A Agents    |
| Copilot        |         |  +-------------------+  |         |  (any          |
| ChatGPT        |         |  | Agent Registry    |  |         |   framework)   |
+----------------+         |  | (A2A Discovery)   |  |         +----------------+
                           |  +---------+---------+  |
                           |            |            |
                           |  +---------+---------+  |
                           |  | MCP Server        |  |         +----------------+
                           |  | (auto-exposes     |  |         | LangChain      |
                           |  |  agent tools)     |  |<-Adapt--| CrewAI         |
                           |  +---------+---------+  |         | OpenAI SDK     |
                           |            |            |         +----------------+
                           |  +---------+---------+  |
                           |  | Message Bus       |  |
                           |  | (agent-to-agent   |  |
                           |  |  routing)         |  |
                           |  +-------------------+  |
                           +------------+------------+
                                        |
                     +------------------+------------------+
                     |                  |                   |
               +-----+-----+    +------+------+    +------+------+
               | CodeReview |    | DocGenerator|    | TestWriter  |
               | Agent      |    | Agent       |    | Agent       |
               +------------+    +-------------+    +-------------+
                          Built-in Demo Agents
```

### Data Flow

1. Developer builds an agent by extending `BaseAgent`
2. Agent registers with the AgentBridge Registry (A2A Agent Card)
3. MCP Server watches registry and auto-creates MCP tools for each agent
4. Claude Code / Cursor / Copilot discover tools via MCP
5. When a tool is called, MCP Server routes to the agent via A2A `tasks/send`
6. Agents can also call each other directly via A2A
7. All messages flow through the Message Bus (logged for dashboard)
8. Dashboard shows everything in real-time via WebSocket

---

## 3. Monorepo Structure

```
C:\AgentBridge\
|
+-- packages/
|   +-- core/                        @agentbridge/core
|   |   +-- src/
|   |   |   +-- registry/            Agent Registry (A2A discovery)
|   |   |   |   +-- server.ts        Express server with registry endpoints
|   |   |   |   +-- store.ts         In-memory agent store
|   |   |   |   +-- discovery.ts     A2A discovery logic
|   |   |   |   +-- health.ts        Health check manager
|   |   |   |
|   |   |   +-- mcp/                 MCP Server (auto-bridge)
|   |   |   |   +-- server.ts        MCP server using @modelcontextprotocol/sdk
|   |   |   |   +-- tool-bridge.ts   Converts agent capabilities to MCP tools
|   |   |   |   +-- transport.ts     stdio + HTTP transport handlers
|   |   |   |
|   |   |   +-- a2a/                 A2A Protocol implementation
|   |   |   |   +-- client.ts        A2A client (send tasks to agents)
|   |   |   |   +-- server.ts        A2A server (receive tasks)
|   |   |   |   +-- types.ts         A2A protocol types (Agent Card, Task, Message)
|   |   |   |   +-- task-manager.ts  Task state machine (submitted->working->completed)
|   |   |   |
|   |   |   +-- bus/                 Message Bus
|   |   |   |   +-- bus.ts           In-memory message router
|   |   |   |   +-- logger.ts        Message logging for dashboard
|   |   |   |   +-- websocket.ts     WebSocket broadcast to dashboard
|   |   |   |
|   |   |   +-- agent/              Agent SDK
|   |   |   |   +-- base-agent.ts    BaseAgent class (extend this)
|   |   |   |   +-- agent-config.ts  AgentConfig type definitions
|   |   |   |   +-- agent-server.ts  HTTP server wrapper for agents
|   |   |   |   +-- agent-card.ts    Auto-generate A2A Agent Card from config
|   |   |   |
|   |   |   +-- compose/            Compose Engine
|   |   |   |   +-- parser.ts       YAML parser for agentbridge.yaml
|   |   |   |   +-- executor.ts     Workflow executor (sequential + conditional steps)
|   |   |   |   +-- process.ts      Agent process manager (start/stop/restart)
|   |   |   |
|   |   |   +-- index.ts            Public API exports
|   |   |
|   |   +-- package.json
|   |   +-- tsconfig.json
|   |
|   +-- cli/                         @agentbridge/cli
|   |   +-- src/
|   |   |   +-- commands/
|   |   |   |   +-- init.ts          Scaffold new agent project
|   |   |   |   +-- up.ts            Start everything from YAML
|   |   |   |   +-- dev.ts           Dev mode with hot reload
|   |   |   |   +-- register.ts      Register agent to registry
|   |   |   |   +-- list.ts          List registered agents
|   |   |   |   +-- test.ts          Test agent communication
|   |   |   |   +-- call.ts          Invoke an agent from terminal
|   |   |   |   +-- mcp.ts           Start MCP server standalone
|   |   |   |   +-- dashboard.ts     Start dashboard standalone
|   |   |   |
|   |   |   +-- templates/          Agent scaffolding templates
|   |   |   |   +-- basic/
|   |   |   |   +-- with-tools/
|   |   |   |   +-- with-memory/
|   |   |   |
|   |   |   +-- utils/
|   |   |   |   +-- logger.ts        CLI output formatting (colors, spinners)
|   |   |   |   +-- table.ts         Table rendering for list command
|   |   |   |
|   |   |   +-- index.ts            CLI entry point (commander.js)
|   |   |
|   |   +-- bin/
|   |   |   +-- agentbridge.ts       CLI binary entry
|   |   +-- package.json
|   |
|   +-- dashboard/                   @agentbridge/dashboard
|   |   +-- src/
|   |   |   +-- pages/
|   |   |   |   +-- Registry.tsx           Agent cards grid
|   |   |   |   +-- MessageFlow.tsx        Live message stream
|   |   |   |   +-- Workflows.tsx          Workflow visualizer (React Flow)
|   |   |   |   +-- Health.tsx             Health & metrics
|   |   |   |
|   |   |   +-- components/
|   |   |   |   +-- Layout.tsx             Sidebar + header
|   |   |   |   +-- AgentCard.tsx          Individual agent card
|   |   |   |   +-- StatusDot.tsx          Pulsing status indicator
|   |   |   |   +-- MessageRow.tsx         Single message in flow
|   |   |   |   +-- NumberTicker.tsx       Animated count-up numbers
|   |   |   |   +-- ProgressBar.tsx        Gradient progress bar
|   |   |   |   +-- WorkflowNode.tsx       Custom React Flow node
|   |   |   |   +-- WorkflowEdge.tsx       Custom animated edge
|   |   |   |
|   |   |   +-- hooks/
|   |   |   |   +-- useWebSocket.ts        WebSocket connection to registry
|   |   |   |   +-- useAgents.ts           Fetch + poll agent list
|   |   |   |   +-- useMetrics.ts          Fetch health/metrics data
|   |   |   |
|   |   |   +-- lib/
|   |   |   |   +-- api.ts                 REST client for registry
|   |   |   |   +-- theme.ts              Color palette + design tokens
|   |   |   |
|   |   |   +-- App.tsx
|   |   |   +-- main.tsx
|   |   |
|   |   +-- index.html
|   |   +-- vite.config.ts
|   |   +-- tailwind.config.ts
|   |   +-- package.json
|   |
|   +-- adapter-langchain/           @agentbridge/adapter-langchain
|   |   +-- src/
|   |   |   +-- adapter.ts           LangChainAdapter class
|   |   |   +-- index.ts
|   |   +-- examples/
|   |   |   +-- basic-chain.ts
|   |   +-- package.json
|   |
|   +-- adapter-crewai/              @agentbridge/adapter-crewai
|   |   +-- src/
|   |   |   +-- adapter.ts           CrewAIAdapter class
|   |   |   +-- index.ts
|   |   +-- examples/
|   |   |   +-- basic-crew.ts
|   |   +-- package.json
|   |
|   +-- adapter-openai-agents/       @agentbridge/adapter-openai-agents
|       +-- src/
|       |   +-- adapter.ts           OpenAIAgentAdapter class
|       |   +-- index.ts
|       +-- examples/
|       |   +-- basic-agent.ts
|       +-- package.json
|
+-- agents/                          Built-in demo agents
|   +-- code-review/
|   |   +-- agent.ts                 CodeReviewAgent implementation
|   |   +-- agent.config.yaml        Agent metadata
|   |   +-- prompts.ts               LLM prompt templates
|   |   +-- package.json
|   |
|   +-- doc-generator/
|   |   +-- agent.ts                 DocGeneratorAgent implementation
|   |   +-- agent.config.yaml
|   |   +-- prompts.ts
|   |   +-- package.json
|   |
|   +-- test-writer/
|       +-- agent.ts                 TestWriterAgent implementation
|       +-- agent.config.yaml
|       +-- prompts.ts
|       +-- package.json
|
+-- examples/
|   +-- basic-workflow/
|   |   +-- agentbridge.yaml         Simple 3-agent pipeline
|   |   +-- README.md
|   |
|   +-- claude-code-setup/
|       +-- README.md                Step-by-step MCP config guide
|       +-- mcp-config.json          Copy-paste config for Claude Code
|
+-- agentbridge.yaml                 Root example compose file
+-- turbo.json                       Turborepo configuration
+-- package.json                     Root workspace (npm workspaces)
+-- tsconfig.base.json               Shared TypeScript config
+-- LICENSE                          MIT License
+-- README.md                        Project README
+-- CONTRIBUTING.md                  Contribution guide
```

---

## 4. Core Package

### 4.1 Agent SDK

The developer-facing API for building agents.

#### BaseAgent Class

```typescript
import { BaseAgent, AgentConfig } from '@agentbridge/core';

class MyAgent extends BaseAgent {
  config: AgentConfig = {
    name: 'my-agent',
    description: 'What this agent does',
    version: '1.0.0',
    capabilities: ['capability-1', 'capability-2'],
    inputs: {
      inputName: { type: 'string', required: true, description: 'What this input is' },
    },
    outputs: {
      outputName: { type: 'string', description: 'What this output is' },
    },
  };

  async execute(input: Record<string, any>): Promise<Record<string, any>> {
    // Agent logic here
    return { outputName: 'result' };
  }
}
```

#### AgentConfig Type

```typescript
interface AgentConfig {
  name: string;                              // Unique agent identifier (kebab-case)
  description: string;                       // Human-readable description
  version: string;                           // Semver version
  capabilities: string[];                    // Searchable capability tags
  inputs: Record<string, InputSchema>;       // Input parameter definitions
  outputs: Record<string, OutputSchema>;     // Output parameter definitions
  authentication?: AuthConfig;               // Optional auth config
  rateLimit?: { maxRequests: number; windowMs: number };
}

interface InputSchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  default?: any;
  description?: string;
}

interface OutputSchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
}
```

#### What BaseAgent provides automatically:

- HTTP server on assigned port with A2A endpoints
- Agent Card generation from config
- Registration with the AgentBridge registry
- Health endpoint (`/health`)
- Graceful shutdown
- Error handling with standard A2A error responses
- `this.callLLM(prompt, model?)` helper — calls OpenRouter
- `this.callAgent(name, input)` helper — calls another agent via A2A
- `this.log(message)` — logs to Message Bus for dashboard visibility

### 4.2 Agent Registry

Express server implementing A2A discovery.

#### Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `GET /.well-known/agent-card.json` | GET | Registry's own Agent Card (A2A spec) |
| `GET /agents` | GET | List all registered agents with status |
| `GET /agents/:name` | GET | Get specific agent's Agent Card |
| `POST /agents` | POST | Register a new agent (body: Agent Card) |
| `DELETE /agents/:name` | DELETE | Deregister an agent |
| `GET /agents/:name/health` | GET | Health check for specific agent |
| `POST /discover` | POST | Search agents by capability |
| `GET /metrics` | GET | Registry + agent metrics for dashboard |
| `WS /ws` | WebSocket | Live event stream (registrations, messages, health) |

#### Agent Card (A2A Spec Compliant)

```json
{
  "name": "code-review",
  "description": "Reviews code for bugs, security issues, and best practices",
  "url": "http://localhost:6101",
  "version": "1.0.0",
  "capabilities": ["code-review", "security-scan", "best-practices"],
  "defaultInputModes": ["text"],
  "defaultOutputModes": ["text"],
  "authentication": {
    "schemes": ["none"]
  },
  "skills": [
    {
      "id": "review-code",
      "name": "Review Code",
      "description": "Analyze code for quality and security"
    }
  ]
}
```

#### Agent Store (In-Memory for v1)

```typescript
interface RegisteredAgent {
  card: AgentCard;           // A2A Agent Card
  registeredAt: Date;        // Registration timestamp
  lastHealthCheck: Date;     // Last successful health ping
  status: 'healthy' | 'unhealthy' | 'unknown';
  metrics: {
    totalTasks: number;
    successCount: number;
    failCount: number;
    avgResponseMs: number;
    p95ResponseMs: number;
    p99ResponseMs: number;
  };
}
```

Registry runs a health check loop (every 10 seconds) pinging each agent's `/health` endpoint. Status updates are broadcast via WebSocket to the dashboard.

### 4.3 A2A Protocol Implementation

Full A2A protocol client and server conforming to the specification.

#### A2A Client (for calling other agents)

```typescript
class A2AClient {
  // Send a task to a remote agent and wait for completion
  async sendTask(agentUrl: string, task: A2ATask): Promise<A2ATaskResult>;

  // Send a task and stream partial results via SSE
  async sendTaskSubscribe(agentUrl: string, task: A2ATask): AsyncGenerator<A2ATaskUpdate>;

  // Get the current status of a task
  async getTask(agentUrl: string, taskId: string): Promise<A2ATask>;

  // Cancel a running task
  async cancelTask(agentUrl: string, taskId: string): Promise<void>;
}
```

#### A2A Server (embedded in each agent)

Each agent runs an A2A-compliant HTTP server:

| Endpoint | Method | Description |
|---|---|---|
| `POST /` | JSON-RPC | Handles `tasks/send`, `tasks/get`, `tasks/cancel` |
| `POST /` | JSON-RPC + SSE | Handles `tasks/sendSubscribe` (streaming) |
| `GET /.well-known/agent-card.json` | GET | Returns this agent's card |
| `GET /health` | GET | Health check |

#### Task State Machine

```
submitted --> working --> completed
    |           |
    |           +--> failed
    |
    +--> cancelled
```

#### A2A Types

```typescript
interface A2ATask {
  id: string;                    // UUID
  status: 'submitted' | 'working' | 'completed' | 'failed' | 'cancelled';
  message: A2AMessage;          // The input message
  result?: A2AMessage;          // The output message (when completed)
  error?: A2AError;             // Error details (when failed)
  createdAt: string;            // ISO timestamp
  updatedAt: string;
}

interface A2AMessage {
  role: 'user' | 'agent';
  parts: A2APart[];
}

interface A2APart {
  type: 'text' | 'data' | 'file';
  text?: string;
  data?: Record<string, any>;
  file?: { name: string; mimeType: string; data: string };
}
```

### 4.4 MCP Server (Auto-Bridge)

Watches the registry and auto-generates MCP tools for every registered agent.

#### How it works:

1. On startup, MCP Server connects to the Registry
2. For each registered agent, it creates an MCP tool:
   - Tool name: `agent_{agent_name}` (e.g., `agent_code_review`)
   - Tool description: from agent's description field
   - Tool input schema: from agent's `inputs` config
3. When Claude Code calls a tool, MCP Server:
   - Receives the MCP tool call
   - Converts it to an A2A `tasks/send` request
   - Sends to the target agent
   - Returns the result as MCP tool output
4. Registry changes (new agent registered, agent removed) trigger automatic MCP tool updates

#### Transport support:

- **stdio** (default) — for Claude Code / Cursor local integration
- **Streamable HTTP** — for remote MCP clients

Uses `@modelcontextprotocol/sdk` for full spec compliance.

### 4.5 Message Bus

Internal routing and logging layer.

```typescript
class MessageBus {
  // Route a message from one agent to another
  async route(from: string, to: string, message: A2AMessage): Promise<void>;

  // Broadcast to all agents with a specific capability
  async broadcast(capability: string, message: A2AMessage): Promise<void>;

  // Subscribe to all messages (for dashboard)
  onMessage(callback: (event: BusEvent) => void): void;

  // Get message history
  getHistory(limit?: number): BusEvent[];
}

interface BusEvent {
  id: string;
  timestamp: Date;
  type: 'task_sent' | 'task_completed' | 'task_failed' | 'agent_registered' | 'agent_removed';
  from?: string;
  to?: string;
  taskId?: string;
  latencyMs?: number;
  payload?: any;
}
```

- In-memory for v1 (array of events, capped at 10,000)
- WebSocket broadcast to dashboard on every event
- Pluggable interface for future Redis/NATS support

### 4.6 Compose Engine

Parses `agentbridge.yaml` and orchestrates multi-agent workflows.

#### YAML Schema

```yaml
# agentbridge.yaml
name: code-quality-pipeline          # Workflow name
version: 1.0.0                       # Workflow version

registry:
  port: 6100                         # Registry port

agents:
  code-review:
    path: ./agents/code-review       # Path to agent directory
    port: 6101                       # Agent port
    env:                             # Environment variables
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
        condition: $review.score < 90     # Conditional execution

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
  transport: stdio                    # stdio | http
```

#### Compose Engine Logic

1. Parse YAML with schema validation (using zod)
2. Start registry on configured port
3. For each agent: spawn as child process, wait for health check
4. Register all agents with registry
5. If dashboard enabled: start Vite dev server / serve built dashboard
6. If MCP enabled: start MCP server
7. Expose workflows as callable pipelines via both MCP tools and A2A tasks
8. Environment variable interpolation (`${VAR}` syntax) from process.env or .env file

---

## 5. CLI Package

### Commands Summary

| Command | Description |
|---|---|
| `npx agentbridge init [name]` | Scaffold a new agent project |
| `npx agentbridge up` | Start everything from agentbridge.yaml |
| `npx agentbridge dev` | Dev mode with hot reload for single agent |
| `npx agentbridge register [path]` | Register an agent to running registry |
| `npx agentbridge list` | List registered agents |
| `npx agentbridge test` | Test agent-to-agent communication |
| `npx agentbridge call [agent]` | Invoke an agent from terminal |
| `npx agentbridge mcp` | Start MCP server standalone |
| `npx agentbridge dashboard` | Start dashboard standalone |

### `init` Command Detail

Interactive scaffolding:

```
$ npx agentbridge init my-agent

? Agent name: my-agent
? Description: What does your agent do?
? Capabilities (comma-separated): summarization, analysis
? LLM Provider: openrouter | openai | anthropic | none
? Template: basic | with-tools | with-memory

Creating my-agent/
  agent.ts              <- Your agent logic (extend BaseAgent)
  agent.config.yaml     <- Agent metadata
  package.json          <- Dependencies
  tsconfig.json         <- TypeScript config
  .env.example          <- Environment variable template

Done! Next steps:
  cd my-agent
  npm install
  npx agentbridge dev
```

### Templates

**basic** — Minimal agent with execute() and one LLM call
**with-tools** — Agent that calls external APIs / tools in execute()
**with-memory** — Agent with conversation memory (stores context between calls)

### CLI Libraries

- `commander` — Command parsing
- `inquirer` — Interactive prompts
- `chalk` — Colored output
- `ora` — Spinners
- `cli-table3` — Table formatting for `list` command

---

## 6. Dashboard Package

### Design Language

- **Dark mode by default** — slate-950 / zinc-900 background
- **Glassmorphism** — `backdrop-blur-md bg-white/5` for panels, modals, headers
- **Typography** — Inter for UI, JetBrains Mono for logs/schemas/ports/task IDs
- **Colors** — Indigo/blue accent, green for healthy, red for failed, yellow for working
- **Animations** — Framer Motion throughout

### Page 1: Agent Registry

- Grid of agent cards
- Each card shows: name, description, pulsing status dot (CSS ping animation), capability tags, port, uptime
- Hover: `hover:-translate-y-1` lift + `hover:shadow-indigo-500/20` glow
- Click card: expanded side panel (Framer Motion slide-in) with full config, input/output schema, and "Test" button
- Search bar + capability filter dropdown

### Page 2: Live Message Flow

- Real-time WebSocket stream of all bus events
- Darker background than other pages (terminal feel)
- New messages slide down + fade in (Framer Motion `AnimatePresence`)
- Each row: timestamp (mono), source -> target, task ID (mono), status badge, latency
- Status colors: blue (submitted), yellow (working), green (completed), red (failed)
- Failed rows: subtle red background tint that fades over 2 seconds
- Filter by agent pair or task ID
- Auto-scroll with pause button

### Page 3: Workflow Visualizer

- Reads workflow definitions from registry API (which parses agentbridge.yaml)
- Renders as directed graph using React Flow
- Custom `WorkflowNode` component: agent name, status indicator, capabilities
- Animated edges (`animated: true`) — dashed lines with flowing animation
- Live execution overlay: currently executing node glows (box-shadow pulse in accent color)
- Click node: side panel shows step's input/output data
- Supports multiple workflows (tab selector at top)

### Page 4: Health & Metrics

- Top row: number cards with count-up tickers (Framer Motion spring animation)
  - Total Agents, Active Tasks, Messages Routed, Registry Uptime
- Per-agent section:
  - Response time: avg / p95 / p99 displayed as bars
  - Success rate: gradient progress bar (green to red scale)
  - Total tasks handled: number with trend arrow
  - Health check history: last 10 pings as colored dots (green = ok, red = failed)

### Dashboard Tech Stack

| Library | Purpose |
|---|---|
| React 19 | UI framework |
| Vite | Build tool |
| Tailwind CSS | Styling (dark mode, glassmorphism) |
| Framer Motion | Animations (slide-in, tickers, transitions) |
| React Flow | Workflow visualizer |
| Lucide React | Icons |
| React Router | Page routing |

### Dashboard API (connects to registry)

| Endpoint | Dashboard Usage |
|---|---|
| `GET /agents` | Registry page — list agents |
| `GET /metrics` | Health page — get all metrics |
| `GET /workflows` | Workflow page — get workflow definitions |
| `WS /ws` | All pages — live events stream |

### Dashboard Startup

Two modes:
- **Embedded** (`npx agentbridge up` with `dashboard.enabled: true`) — built dashboard served by Express from registry
- **Standalone** (`npx agentbridge dashboard`) — runs Vite dev server pointing at a registry URL

---

## 7. Framework Adapters

Three adapter packages for bringing existing agents into AgentBridge.

### Common Adapter Interface

```typescript
interface AgentBridgeAdapter {
  name: string;
  description: string;
  capabilities: string[];
  register(registryUrl: string): Promise<void>;
  start(port: number): Promise<void>;
  stop(): Promise<void>;
}
```

### @agentbridge/adapter-langchain

Wraps a LangChain `RunnableSequence`, `AgentExecutor`, or `chain` into an AgentBridge-compatible agent.

```typescript
import { LangChainAdapter } from '@agentbridge/adapter-langchain';

const agent = new LangChainAdapter({
  name: 'my-langchain-agent',
  description: 'Research agent built with LangChain',
  capabilities: ['research', 'summarization'],
  agent: myLangChainAgent,                    // Your existing chain/agent
  inputMapper: (input) => ({ input: input.query }),  // Map AgentBridge input to LangChain input
  outputMapper: (result) => ({ summary: result.output }),  // Map LangChain output back
});

await agent.start(6110);
await agent.register('http://localhost:6100');
```

### @agentbridge/adapter-crewai

Wraps a CrewAI crew instance.

```typescript
import { CrewAIAdapter } from '@agentbridge/adapter-crewai';

const agent = new CrewAIAdapter({
  name: 'my-crew-agent',
  description: 'Analysis crew',
  capabilities: ['analysis'],
  crew: myCrewInstance,
  inputMapper: (input) => input.task,
  outputMapper: (result) => ({ analysis: result }),
});
```

### @agentbridge/adapter-openai-agents

Wraps an OpenAI Agents SDK agent.

```typescript
import { OpenAIAgentAdapter } from '@agentbridge/adapter-openai-agents';

const agent = new OpenAIAgentAdapter({
  name: 'my-openai-agent',
  description: 'Coding assistant',
  capabilities: ['coding'],
  agent: myOpenAIAgent,
  inputMapper: (input) => input.prompt,
  outputMapper: (result) => ({ code: result.output }),
});
```

### Adapter Scope for v1

Each adapter ships with:
- The adapter class
- One working example
- README with setup instructions

Full production-grade adapters evolve from community contributions after launch.

---

## 8. Built-in Demo Agents

### Agent 1: code-review

| Field | Value |
|---|---|
| Name | `code-review` |
| Port | 6101 |
| Capabilities | `code-review`, `security-scan`, `best-practices` |
| LLM | OpenRouter (DeepSeek or Llama — free tier) |
| Input | `code` (string, required), `language` (string, default: "typescript") |
| Output | `review` (string), `score` (number 0-100), `issues` (array of {type, message, line}) |

**Logic:** Sends code to LLM with a structured review prompt. Parses response into score + issues. Returns structured JSON.

### Agent 2: doc-generator

| Field | Value |
|---|---|
| Name | `doc-generator` |
| Port | 6103 |
| Capabilities | `documentation`, `markdown`, `api-docs` |
| LLM | OpenRouter |
| Input | `code` (string, required), `format` (string, default: "readme") |
| Output | `documentation` (string — markdown), `sections` (array of section titles) |

**Logic:** Analyzes code structure, generates documentation in requested format (readme, jsdoc, api-reference). Returns markdown.

### Agent 3: test-writer

| Field | Value |
|---|---|
| Name | `test-writer` |
| Port | 6102 |
| Capabilities | `testing`, `unit-tests`, `test-generation` |
| LLM | OpenRouter |
| Input | `code` (string, required), `framework` (string, default: "vitest"), `issues` (array, optional — from code-review) |
| Output | `tests` (string — test code), `testCount` (number), `coverage` (array of function names tested) |

**Logic:** If `issues` provided (from code-review agent), generates targeted tests for flagged problems. Otherwise, generates general unit tests. Returns runnable test code.

### Demo Workflow (ships in agentbridge.yaml)

```
Input: raw source code
  |
  +---> code-review agent
  |     Output: { review, score: 78, issues: [...] }
  |     |
  |     +---> test-writer agent (if score < 90)
  |           Output: { tests, testCount: 5 }
  |
  +---> doc-generator agent (parallel)
        Output: { documentation, sections: [...] }

Final Output: { review, tests, docs }
```

---

## 9. Claude Code Integration

### Setup Guide (ships in examples/claude-code-setup/)

**Step 1:** Add to Claude Code MCP config:

For Claude Code CLI, add to `~/.claude.json` or project-level `.mcp.json`:

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

**Step 2:** Start AgentBridge:

```bash
npx agentbridge up
```

**Step 3:** Use in Claude Code:

```
User: "Review this code for security issues"
Claude: [calls agent_code_review tool via MCP]
-> Returns structured review

User: "Write tests for the issues found"
Claude: [calls agent_test_writer tool via MCP]
-> Returns generated tests

User: "Generate docs for this module"
Claude: [calls agent_doc_generator tool via MCP]
-> Returns markdown documentation
```

### How MCP tools appear:

When 3 agents are registered, Claude Code sees:

```
Available tools from agentbridge:
  - agent_code_review(code, language) — Reviews code for bugs and security
  - agent_test_writer(code, framework, issues) — Generates unit tests
  - agent_doc_generator(code, format) — Generates documentation
```

Tools appear/disappear dynamically as agents register/deregister. No restart needed.

---

## 10. Tech Stack

### Core Dependencies

| Package | Version | Purpose |
|---|---|---|
| TypeScript | ^5.5 | Language |
| Express | ^4.21 | Registry + agent HTTP servers |
| @modelcontextprotocol/sdk | latest | MCP server implementation |
| zod | ^3.23 | Schema validation (config, inputs, YAML) |
| ws | ^8.18 | WebSocket for dashboard live stream |
| yaml | ^2.5 | YAML parsing for compose files |
| uuid | ^10 | Task ID generation |
| dotenv | ^16 | Environment variable loading |

### CLI Dependencies

| Package | Purpose |
|---|---|
| commander | Command parsing |
| inquirer | Interactive prompts |
| chalk | Colored terminal output |
| ora | Spinners |
| cli-table3 | Table rendering |
| chokidar | File watching for dev mode |

### Dashboard Dependencies

| Package | Purpose |
|---|---|
| React 19 | UI framework |
| Vite | Build tool |
| Tailwind CSS | Styling |
| Framer Motion | Animations |
| @xyflow/react (React Flow) | Workflow visualizer |
| lucide-react | Icons |
| react-router-dom | Routing |

### Build / Monorepo

| Tool | Purpose |
|---|---|
| Turborepo | Monorepo orchestration |
| npm workspaces | Package management |
| tsup | Fast TypeScript bundling for packages |
| vitest | Testing |

### LLM (for demo agents)

| Provider | Why |
|---|---|
| OpenRouter | Free tier models (DeepSeek, Llama), no vendor lock-in, one API key |

---

## 11. Implementation Timeline

### Day 1: Foundation

- [ ] Project scaffold — monorepo with turbo, npm workspaces, shared tsconfig
- [ ] `@agentbridge/core` package setup
- [ ] BaseAgent class with `execute()`, `callLLM()`, `callAgent()`, `log()`
- [ ] AgentConfig types and validation (zod)
- [ ] Agent Card auto-generation from config
- [ ] Basic registry server (Express): register, list, discover, health endpoints
- [ ] In-memory agent store

### Day 2: Protocols

- [ ] A2A client: `sendTask()`, `getTask()`, `cancelTask()`
- [ ] A2A server: JSON-RPC handler for `tasks/send`, `tasks/get`, `tasks/cancel`
- [ ] Task state machine (submitted -> working -> completed/failed)
- [ ] A2A types (Task, Message, Part, AgentCard)
- [ ] Agent HTTP server wrapper (auto-starts A2A server for each agent)
- [ ] Agent-to-agent communication tested end-to-end
- [ ] Message Bus: routing, logging, WebSocket broadcast

### Day 3: MCP + CLI

- [ ] MCP server using @modelcontextprotocol/sdk
- [ ] Auto tool generation from registry (watch for changes)
- [ ] MCP tool call -> A2A task routing
- [ ] stdio + HTTP transport support
- [ ] Claude Code integration tested (add to config, verify tools appear)
- [ ] CLI: `init` command with templates (basic, with-tools, with-memory)
- [ ] CLI: `up` command — parse YAML, start registry, spawn agents
- [ ] CLI: `register`, `list`, `call` commands

### Day 4: Demo Agents + Compose

- [ ] code-review agent: implementation, prompts, config
- [ ] test-writer agent: implementation, prompts, config
- [ ] doc-generator agent: implementation, prompts, config
- [ ] All three agents communicating via A2A
- [ ] Compose engine: YAML parser with zod validation
- [ ] Compose engine: process manager (spawn, health check, restart)
- [ ] Compose engine: workflow executor (sequential + conditional steps)
- [ ] `agentbridge.yaml` example with full pipeline
- [ ] CLI: `test` command — test all agent-to-agent paths
- [ ] CLI: `dev` command — hot reload for single agent

### Day 5: Dashboard (Part 1)

- [ ] React + Vite + Tailwind setup with dark mode
- [ ] Design system: theme.ts, color tokens, glassmorphism utilities
- [ ] Layout component: sidebar navigation, header
- [ ] StatusDot component with CSS ping animation
- [ ] AgentCard component with hover lift + glow
- [ ] Registry page: agent grid, search, filter, click-to-expand side panel
- [ ] WebSocket hook connecting to registry /ws endpoint
- [ ] MessageRow component with Framer Motion slide-in
- [ ] Live Message Flow page: real-time stream, filters, auto-scroll, pause

### Day 6: Dashboard (Part 2)

- [ ] WorkflowNode + WorkflowEdge custom React Flow components
- [ ] Workflow Visualizer page: directed graph, animated edges, glowing active nodes
- [ ] Workflow execution overlay (live status on nodes)
- [ ] Click-node side panel with step input/output
- [ ] NumberTicker component (Framer Motion spring count-up)
- [ ] ProgressBar component (gradient)
- [ ] Health & Metrics page: number cards, per-agent stats, health check dots
- [ ] Dashboard embed mode (served from registry) + standalone mode

### Day 7: Adapters + Polish

- [ ] @agentbridge/adapter-langchain: adapter class + example
- [ ] @agentbridge/adapter-crewai: adapter class + example
- [ ] @agentbridge/adapter-openai-agents: adapter class + example
- [ ] README.md: project overview, quickstart, screenshots, architecture diagram
- [ ] CONTRIBUTING.md: how to contribute, add agents, add adapters
- [ ] examples/claude-code-setup/: step-by-step guide + mcp-config.json
- [ ] examples/basic-workflow/: minimal agentbridge.yaml + README
- [ ] npm publish prep: package.json metadata, bin entries, exports
- [ ] Final testing: full workflow end-to-end (up -> agents -> MCP -> Claude Code -> dashboard)

---

## 12. Decisions & Rationale

| Decision | Rationale |
|---|---|
| **TypeScript** | Target audience is AI engineers, most use TS/JS. MCP SDK is TS. Best DX. |
| **Monorepo (Turborepo)** | Professional open-source standard. Independent packages. Easy for contributors. |
| **OpenRouter for demo agents** | Free tier models available. No vendor lock-in. One API key for all models. |
| **In-memory store (v1)** | Simplicity. No database dependency. Pluggable interface for future Redis/NATS. |
| **Express (not Fastify/Hono)** | Most widely known. Largest ecosystem. Lowest barrier for contributors. |
| **React Flow** | Best React library for directed graphs. Lightweight. Great docs. |
| **Framer Motion** | Industry standard for React animations. Small bundle. Intuitive API. |
| **Tailwind dark mode** | Developer tool aesthetic. Looks professional in screenshots. Fast to build. |
| **stdio MCP transport** | Required for Claude Code local integration. HTTP transport added for remote. |
| **Port 6100-6140 range** | User has services on 3000-5000 range. 6000s are clear. |
| **YAML for compose** | Familiar to Docker Compose users. Human readable. Easy to validate. |
| **A2A spec compliance** | Future-proof. Compatible with any A2A agent from any framework. |
| **MIT License** | Maximum adoption. No restrictions for commercial use. |

---

*This spec is the single source of truth for the AgentBridge implementation. All architectural decisions, file structures, APIs, and timelines are final and approved.*
