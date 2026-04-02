import { randomUUID } from 'node:crypto';
import type { A2ATask, A2AMessage, A2AError } from './types.js';

const VALID_TRANSITIONS: Record<string, string[]> = {
  submitted: ['working', 'cancelled'],
  working: ['completed', 'failed'],
};

export class TaskManager {
  private tasks = new Map<string, A2ATask>();

  create(message: A2AMessage): A2ATask {
    const now = new Date().toISOString();
    const task: A2ATask = { id: randomUUID(), status: 'submitted', message, createdAt: now, updatedAt: now };
    this.tasks.set(task.id, task);
    return structuredClone(task);
  }

  get(id: string): A2ATask | undefined {
    const task = this.tasks.get(id);
    return task ? structuredClone(task) : undefined;
  }

  transition(id: string, newStatus: 'working' | 'cancelled'): A2ATask {
    const task = this.tasks.get(id);
    if (!task) throw new Error(`Task ${id} not found`);
    const allowed = VALID_TRANSITIONS[task.status];
    if (!allowed?.includes(newStatus)) throw new Error(`Invalid transition: ${task.status} -> ${newStatus}`);
    task.status = newStatus;
    task.updatedAt = new Date().toISOString();
    return structuredClone(task);
  }

  complete(id: string, result: A2AMessage): A2ATask {
    const task = this.tasks.get(id);
    if (!task) throw new Error(`Task ${id} not found`);
    if (task.status !== 'working') throw new Error(`Cannot complete task in ${task.status} status`);
    task.status = 'completed';
    task.result = result;
    task.updatedAt = new Date().toISOString();
    return structuredClone(task);
  }

  fail(id: string, error: A2AError): A2ATask {
    const task = this.tasks.get(id);
    if (!task) throw new Error(`Task ${id} not found`);
    if (task.status !== 'working') throw new Error(`Cannot fail task in ${task.status} status`);
    task.status = 'failed';
    task.error = error;
    task.updatedAt = new Date().toISOString();
    return structuredClone(task);
  }

  cancel(id: string): A2ATask {
    return this.transition(id, 'cancelled');
  }
}
