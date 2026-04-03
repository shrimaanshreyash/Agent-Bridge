import express from 'express';
import { TaskManager } from './task-manager.js';
import type { A2AAgentCard, A2AMessage, JsonRpcRequest, JsonRpcResponse } from './types.js';

export interface A2AServerOptions {
  card: A2AAgentCard;
  handler: (message: A2AMessage) => Promise<A2AMessage>;
}

export function createA2AServer(options: A2AServerOptions) {
  const { card, handler } = options;
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  const taskManager = new TaskManager();

  app.get('/.well-known/agent-card.json', (_req, res) => { res.json(card); });
  app.get('/health', (_req, res) => { res.json({ status: 'ok', agent: card.name, uptime: process.uptime() }); });

  app.post('/', async (req, res) => {
    const rpc = req.body as JsonRpcRequest;
    const response: JsonRpcResponse = { jsonrpc: '2.0', id: rpc.id };

    try {
      switch (rpc.method) {
        case 'tasks/send': {
          const { message } = rpc.params as { message: A2AMessage };
          const task = taskManager.create(message);
          taskManager.transition(task.id, 'working');
          try {
            const result = await handler(message);
            const completed = taskManager.complete(task.id, result);
            response.result = completed;
          } catch (err) {
            const failed = taskManager.fail(task.id, {
              code: 500, message: err instanceof Error ? err.message : 'Unknown error',
            });
            response.result = failed;
          }
          break;
        }
        case 'tasks/get': {
          const { id } = rpc.params as { id: string };
          const task = taskManager.get(id);
          if (!task) response.error = { code: -32602, message: `Task ${id} not found` };
          else response.result = task;
          break;
        }
        case 'tasks/cancel': {
          const { id } = rpc.params as { id: string };
          try { response.result = taskManager.cancel(id); }
          catch (err) { response.error = { code: -32602, message: err instanceof Error ? err.message : 'Cancel failed' }; }
          break;
        }
        default:
          response.error = { code: -32601, message: `Method ${rpc.method} not found` };
      }
    } catch (err) {
      response.error = { code: -32603, message: err instanceof Error ? err.message : 'Internal error' };
    }
    res.json(response);
  });

  return { app, taskManager };
}
