import type { Server } from 'node:http';
import type { AgentConfig } from './agent-config.js';
import type { A2AMessage } from '../a2a/types.js';
import { generateAgentCard } from './agent-card.js';
import { createA2AServer } from '../a2a/server.js';
import { A2AClient } from '../a2a/client.js';

const DEFAULT_MODEL = 'google/gemini-2.5-flash-lite';
const MAX_RETRIES = 2;

function stripJsonFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
}

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
    try {
      await fetch(`${registryUrl}/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card),
      });
    } catch (err) {
      console.warn(`Could not register with registry at ${registryUrl}: ${err instanceof Error ? err.message : String(err)}`);
    }
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

  protected async callLLM(prompt: string, options: { system?: string; model?: string } | string = {}): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set. Add it to your .env file.');

    // backward-compat: callLLM(prompt, model) signature still works
    const opts = typeof options === 'string' ? { model: options } : options;
    const model = opts.model ?? process.env.MODEL ?? DEFAULT_MODEL;

    const messages: { role: string; content: string }[] = [];
    if (opts.system) messages.push({ role: 'system', content: opts.system });
    messages.push({ role: 'user', content: prompt });

    let lastErr: Error | null = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/shrimaanshreyash/Agent-Bridge',
          'X-Title': 'AgentBridge',
        },
        body: JSON.stringify({ model, messages, temperature: 0.3 }),
      });

      if (res.status >= 500 && attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        continue;
      }

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`LLM error ${res.status}: ${err.slice(0, 200)}`);
      }

      const body = (await res.json()) as { choices: { message: { content: string } }[] };
      const raw = body.choices[0]?.message?.content ?? '';
      return stripJsonFences(raw);
    }

    throw lastErr ?? new Error('LLM call failed after retries');
  }

  protected parseJSON<T>(raw: string, fallback: T): T {
    try { return JSON.parse(raw) as T; }
    catch { return fallback; }
  }

  private extractInput(message: A2AMessage): Record<string, unknown> {
    // Prefer structured data; fall back to plain text
    const dataPart = message.parts.find((p) => p.type === 'data');
    if (dataPart?.data && typeof dataPart.data === 'object' && Object.keys(dataPart.data).length > 0) {
      return dataPart.data as Record<string, unknown>;
    }
    const textPart = message.parts.find((p) => p.type === 'text');
    if (textPart?.text) return { input: textPart.text };
    return {};
  }
}
