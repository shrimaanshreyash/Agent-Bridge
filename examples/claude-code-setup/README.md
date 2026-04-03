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
