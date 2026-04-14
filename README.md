# AgentBridge

> **The missing bridge between AI agents and the tools developers already use.**

AgentBridge connects **A2A agents** (Google's Agent-to-Agent protocol) to **MCP clients** (Claude Code, Cursor, Copilot) — so your agents automatically appear as tools inside your IDE with zero per-agent configuration.

```
Claude Code / Cursor / Copilot
        ↕  MCP
  AgentBridge Registry  ←──── agents register themselves
        ↕  A2A
  code-review · test-writer · doc-generator · your-agent
```

---

## Why AgentBridge?

| Without AgentBridge | With AgentBridge |
|---|---|
| Configure each agent manually in every MCP client | Register once → available everywhere automatically |
| Agents can't talk to each other | Agents call each other via A2A protocol |
| No visibility into what agents are doing | Real-time dashboard: messages, health, latency |
| Testing agents requires terminal commands | Click → type → run from the dashboard UI |

---

## Quick Start

**Prerequisites:** Node 20+, an [OpenRouter API key](https://openrouter.ai/keys)

```bash
git clone https://github.com/shrimaanshreyash/Agent-Bridge
cd Agent-Bridge
npm install
cp .env.example .env   # add your OPENROUTER_API_KEY
npm run build:dashboard
node packages/cli/dist/bin/agentbridge.js up
```

Open **http://localhost:6100** — the dashboard is live with 3 agents running.

---

## Build an Agent in 30 Seconds

```typescript
import { BaseAgent } from '@agentbridge/core';

class SummarizerAgent extends BaseAgent {
  config = {
    name: 'summarizer',
    description: 'Summarizes any text in 3 bullet points',
    version: '1.0.0',
    capabilities: ['summarization', 'nlp'],
    inputs: { input: { type: 'string', required: true } },
    outputs: { summary: { type: 'string' } },
  };

  async execute(input: Record<string, unknown>) {
    const text = (input.input ?? input.text ?? '') as string;
    const summary = await this.callLLM(`Summarize in 3 bullets:\n\n${text}`, {
      system: 'You are a concise summarizer. Always return exactly 3 bullet points.',
    });
    return { summary };
  }
}

const agent = new SummarizerAgent();
agent.start(6104, 'http://localhost:6100');
```

Scaffold with the CLI:
```bash
node packages/cli/dist/bin/agentbridge.js init my-agent
```

---

## Multi-Agent Workflows (YAML)

Define pipelines in `agentbridge.yaml`:

```yaml
workflows:
  code-quality:
    description: "Review code → write tests → generate docs"
    steps:
      - agent: code-review
        input: $input
        output: $review
      - agent: test-writer
        input: $input
        output: $tests
        condition: $review.score < 90
      - agent: doc-generator
        input: $input
        output: $docs
```

---

## Use Agents in Claude Code (MCP)

```bash
# Terminal 1 — start agents
node packages/cli/dist/bin/agentbridge.js up

# Terminal 2 — start MCP bridge
node packages/cli/dist/bin/agentbridge.js mcp
```

Add to your Claude Code MCP config:
```json
{
  "mcpServers": {
    "agentbridge": {
      "command": "node",
      "args": ["packages/cli/dist/bin/agentbridge.js", "mcp"],
      "env": { "AGENTBRIDGE_REGISTRY": "http://localhost:6100" }
    }
  }
}
```

Every registered agent appears as a tool — automatically, no additional config.

---

## Bring Your Own Framework

AgentBridge wraps existing agents without rewriting them:

```typescript
import { LangChainAdapter } from '@agentbridge/adapter-langchain';

const adapter = new LangChainAdapter({
  name: 'my-langchain-agent',
  description: 'Existing LangChain agent',
  capabilities: ['research'],
  agent: myExistingChain, // RunnableSequence / AgentExecutor
});

await adapter.start(6105);
await adapter.register('http://localhost:6100');
```

Adapters available: **LangChain**, **OpenAI Agents SDK**, **CrewAI**

---

## Dashboard

Open `http://localhost:6100` while `agentbridge up` is running.

| Page | What you see |
|---|---|
| **Registry** | All agents with status — click any to test it live from the browser |
| **Messages** | Real-time feed of every agent call with latency |
| **Workflows** | Interactive graph of your pipelines — drag nodes freely |
| **Health** | Success rates, response times (avg / p95 / p99) per agent |

---

## CLI Reference

```bash
agentbridge up                    # Start registry + all agents from agentbridge.yaml
agentbridge mcp                   # Start MCP bridge for Claude Code / Cursor
agentbridge dashboard             # Start dashboard standalone
agentbridge list                  # List registered agents
agentbridge call <name> <input>   # Invoke an agent from terminal
agentbridge init <name>           # Scaffold a new agent
agentbridge register [path]       # Manually register an agent
```

---

## Project Structure

```
AgentBridge/
├── packages/
│   ├── core/                  — Registry, A2A protocol, BaseAgent, MCP bridge
│   ├── cli/                   — CLI commands
│   ├── dashboard/             — React dashboard (Vite + Tailwind + ReactFlow)
│   ├── adapter-langchain/
│   ├── adapter-openai-agents/
│   └── adapter-crewai/
└── agents/
    ├── code-review/           — Reviews code for bugs, security, best practices
    ├── test-writer/           — Generates unit tests (vitest / jest / mocha)
    └── doc-generator/         — Generates README, JSDoc, or API reference docs
```

---

## Configuration

| Variable | Description | Default |
|---|---|---|
| `OPENROUTER_API_KEY` | Required — get one free at openrouter.ai | — |
| `MODEL` | LLM model via OpenRouter | `google/gemini-2.5-flash-lite` |

Recommended models: `google/gemini-2.5-flash-lite` (default, fast + cheap), `anthropic/claude-3-haiku` (reliable JSON), `openai/gpt-4o-mini` (strong reasoning).

---

## License

MIT © 2026 Vemula Srimaan Shreyas
