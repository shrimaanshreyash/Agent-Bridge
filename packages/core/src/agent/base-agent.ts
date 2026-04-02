import type { Server } from 'node:http';
import type { AgentConfig } from './agent-config.js';
import type { A2AMessage } from '../a2a/types.js';
import { generateAgentCard } from './agent-card.js';
import { createA2AServer } from '../a2a/server.js';
import { A2AClient } from '../a2a/client.js';

export abstract class BaseAgent {
  abstract config: AgentConfig;
  abstract execute(input: Record<string, unknown>): Promise<Record<string, unknown>>;

  private httpServer: Server | null = null;
  private port: number = 0;
  private a2aClient = new A2AClient();

  async start(port: number, registryUrl?: string): Promise<void> {
    this.port = port;
    const url = `http://localhost:${port}`;
    const card = generateAgentCard(this.config, url);

    const { app } = createA2AServer({
      card,
      handler: async (message: A2AMessage) => {
        const input = this.extractInput(message);
        const output = await this.execute(input);
        return { role: 'agent' as const, parts: [{ type: 'data' as const, data: output }] };
      },
    });

    await new Promise<void>((resolve) => {
      this.httpServer = app.listen(port, () => {
        console.log(`Agent "${this.config.name}" running on ${url}`);
        resolve();
      });
    });

    if (registryUrl) await this.registerWith(registryUrl);
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.httpServer) this.httpServer.close(() => resolve());
      else resolve();
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

  protected async callAgent(agentUrl: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const result = await this.a2aClient.sendTask(agentUrl, {
      role: 'user',
      parts: [{ type: 'data', data: input }],
    });
    if (result.status === 'failed') throw new Error(`Agent call failed: ${result.error?.message ?? 'Unknown error'}`);
    const dataPart = result.result?.parts.find((p) => p.type === 'data');
    return (dataPart?.data as Record<string, unknown>) ?? {};
  }

  protected async callLLM(prompt: string, model?: string): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model ?? process.env.MODEL ?? 'deepseek/deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const body = (await res.json()) as { choices: { message: { content: string } }[] };
    return body.choices[0]?.message?.content ?? '';
  }

  private extractInput(message: A2AMessage): Record<string, unknown> {
    const dataPart = message.parts.find((p) => p.type === 'data');
    if (dataPart?.data) return dataPart.data as Record<string, unknown>;
    const textPart = message.parts.find((p) => p.type === 'text');
    if (textPart?.text) return { text: textPart.text };
    return {};
  }
}
