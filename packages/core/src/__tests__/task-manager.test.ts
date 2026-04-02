import { describe, it, expect } from 'vitest';
import { TaskManager } from '../a2a/task-manager.js';

describe('TaskManager', () => {
  it('creates a task in submitted status', () => {
    const tm = new TaskManager();
    const task = tm.create({ role: 'user', parts: [{ type: 'text', text: 'Hello' }] });
    expect(task.status).toBe('submitted');
    expect(task.message.parts[0].text).toBe('Hello');
    expect(task.id).toBeDefined();
  });

  it('transitions submitted -> working', () => {
    const tm = new TaskManager();
    const task = tm.create({ role: 'user', parts: [{ type: 'text', text: 'Hello' }] });
    const updated = tm.transition(task.id, 'working');
    expect(updated.status).toBe('working');
  });

  it('transitions working -> completed with result', () => {
    const tm = new TaskManager();
    const task = tm.create({ role: 'user', parts: [{ type: 'text', text: 'Hello' }] });
    tm.transition(task.id, 'working');
    const result = { role: 'agent' as const, parts: [{ type: 'text' as const, text: 'Done' }] };
    const updated = tm.complete(task.id, result);
    expect(updated.status).toBe('completed');
    expect(updated.result?.parts[0].text).toBe('Done');
  });

  it('transitions working -> failed with error', () => {
    const tm = new TaskManager();
    const task = tm.create({ role: 'user', parts: [{ type: 'text', text: 'Hello' }] });
    tm.transition(task.id, 'working');
    const updated = tm.fail(task.id, { code: 500, message: 'Something broke' });
    expect(updated.status).toBe('failed');
    expect(updated.error?.message).toBe('Something broke');
  });

  it('transitions submitted -> cancelled', () => {
    const tm = new TaskManager();
    const task = tm.create({ role: 'user', parts: [{ type: 'text', text: 'Hello' }] });
    const updated = tm.cancel(task.id);
    expect(updated.status).toBe('cancelled');
  });

  it('rejects invalid transitions', () => {
    const tm = new TaskManager();
    const task = tm.create({ role: 'user', parts: [{ type: 'text', text: 'Hello' }] });
    tm.transition(task.id, 'working');
    tm.complete(task.id, { role: 'agent', parts: [{ type: 'text', text: 'Done' }] });
    expect(() => tm.transition(task.id, 'working')).toThrow();
  });

  it('retrieves a task by id', () => {
    const tm = new TaskManager();
    const task = tm.create({ role: 'user', parts: [{ type: 'text', text: 'Hello' }] });
    const found = tm.get(task.id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(task.id);
  });
});
