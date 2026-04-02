import { randomUUID } from 'node:crypto';
import type { A2ATask, A2AMessage, A2AAgentCard, JsonRpcResponse } from './types.js';

export class A2AClient {
  private async rpc(url: string, method: string, params: unknown): Promise<unknown> {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: randomUUID(), method, params }),
    });
    const body = (await res.json()) as JsonRpcResponse;
    if (body.error) throw new Error(`A2A RPC error [${body.error.code}]: ${body.error.message}`);
    return body.result;
  }

  async sendTask(agentUrl: string, message: A2AMessage): Promise<A2ATask> {
    return (await this.rpc(agentUrl, 'tasks/send', { message })) as A2ATask;
  }

  async getTask(agentUrl: string, taskId: string): Promise<A2ATask> {
    return (await this.rpc(agentUrl, 'tasks/get', { id: taskId })) as A2ATask;
  }

  async cancelTask(agentUrl: string, taskId: string): Promise<A2ATask> {
    return (await this.rpc(agentUrl, 'tasks/cancel', { id: taskId })) as A2ATask;
  }

  async getAgentCard(agentUrl: string): Promise<A2AAgentCard> {
    const res = await fetch(`${agentUrl}/.well-known/agent-card.json`);
    return (await res.json()) as A2AAgentCard;
  }
}
