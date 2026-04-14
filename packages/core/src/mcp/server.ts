import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { A2AClient } from '../a2a/client.js';
import type { RegisteredAgent } from '../registry/store.js';
import { agentToMcpTool } from './tool-bridge.js';
import { z } from 'zod';

export interface McpBridgeOptions {
  registryUrl: string;
  syncIntervalMs?: number;
}

export async function createMcpBridgeServer(options: McpBridgeOptions) {
  const { registryUrl, syncIntervalMs = 30_000 } = options;
  const a2aClient = new A2AClient();
  const registeredTools = new Set<string>();

  const mcpServer = new McpServer({
    name: 'agentbridge',
    version: '0.1.0',
  });

  async function fetchAgents(): Promise<RegisteredAgent[]> {
    const res = await fetch(`${registryUrl}/agents`);
    if (!res.ok) throw new Error(`Registry responded ${res.status}`);
    return res.json() as Promise<RegisteredAgent[]>;
  }

  async function syncTools() {
    const agents = await fetchAgents();

    for (const agent of agents) {
      const toolDef = agentToMcpTool(agent);
      if (registeredTools.has(toolDef.name)) continue; // already registered

      registeredTools.add(toolDef.name);

      mcpServer.tool(
        toolDef.name,
        toolDef.description,
        { input: z.string().describe('Plain text or JSON input for the agent') },
        async ({ input }) => {
          let inputData: Record<string, unknown>;
          try { inputData = JSON.parse(input); }
          catch { inputData = { input }; }

          const result = await a2aClient.sendTask(agent.card.url, {
            role: 'user',
            parts: [{ type: 'data', data: inputData }],
          });

          if (result.status === 'failed') {
            return {
              content: [{ type: 'text' as const, text: `Agent error: ${result.error?.message ?? 'Unknown error'}` }],
              isError: true,
            };
          }

          const textPart = result.result?.parts.find((p) => p.type === 'text');
          const dataPart = result.result?.parts.find((p) => p.type === 'data');
          const outputText = textPart?.text ?? JSON.stringify(dataPart?.data ?? {}, null, 2);

          return { content: [{ type: 'text' as const, text: outputText }] };
        },
      );
    }
  }

  async function startStdio() {
    // Initial sync — warn but don't crash if registry isn't up yet
    try {
      await syncTools();
    } catch (err) {
      process.stderr.write(`[agentbridge] Warning: could not sync tools from registry: ${err instanceof Error ? err.message : String(err)}\n`);
    }

    // Background sync — picks up agents that register after the MCP server starts
    const interval = setInterval(async () => {
      try { await syncTools(); } catch { /* silently skip */ }
    }, syncIntervalMs);
    interval.unref(); // don't keep the process alive just for this

    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
  }

  return { mcpServer, syncTools, startStdio };
}
