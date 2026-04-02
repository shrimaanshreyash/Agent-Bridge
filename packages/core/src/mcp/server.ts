import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { A2AClient } from '../a2a/client.js';
import type { RegisteredAgent } from '../registry/store.js';
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
          let inputData: Record<string, unknown>;
          try { inputData = JSON.parse(input); }
          catch { inputData = { text: input }; }

          const result = await a2aClient.sendTask(agent.card.url, {
            role: 'user', parts: [{ type: 'data', data: inputData }],
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

          return { content: [{ type: 'text' as const, text: outputText }] };
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
