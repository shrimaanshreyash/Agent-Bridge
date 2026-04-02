import { Command } from 'commander';
import { createMcpBridgeServer } from '@agentbridge/core';

export const mcpCommand = new Command('mcp')
  .description('Start MCP server (for Claude Code / Cursor)')
  .option('-r, --registry <url>', 'Registry URL', 'http://localhost:6100')
  .action(async (opts) => {
    const server = await createMcpBridgeServer({ registryUrl: opts.registry });
    await server.startStdio();
  });
