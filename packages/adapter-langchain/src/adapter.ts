import { generateAgentCard, createA2AServer } from '@agentbridge/core';
import type { A2AMessage } from '@agentbridge/core';

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
      this.httpServer = app.listen(port, () => resolve());
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
    return new Promise((resolve) => this.httpServer?.close(() => resolve()));
  }
}
