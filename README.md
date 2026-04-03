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
