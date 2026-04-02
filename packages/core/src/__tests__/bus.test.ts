import { describe, it, expect } from 'vitest';
import { MessageBus, type BusEvent } from '../bus/bus.js';

describe('MessageBus', () => {
  it('emits and receives events', () => {
    const bus = new MessageBus();
    const events: BusEvent[] = [];
    bus.onMessage((e) => events.push(e));
    bus.emit({ type: 'task_sent', from: 'agent-a', to: 'agent-b', taskId: 'task-1' });
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('task_sent');
    expect(events[0].from).toBe('agent-a');
    expect(events[0].id).toBeDefined();
    expect(events[0].timestamp).toBeInstanceOf(Date);
  });

  it('stores history up to cap', () => {
    const bus = new MessageBus(5);
    for (let i = 0; i < 10; i++) bus.emit({ type: 'task_sent', from: 'a', to: 'b' });
    expect(bus.getHistory()).toHaveLength(5);
  });

  it('returns history with optional limit', () => {
    const bus = new MessageBus();
    for (let i = 0; i < 10; i++) bus.emit({ type: 'task_sent', from: 'a', to: 'b' });
    expect(bus.getHistory(3)).toHaveLength(3);
  });

  it('supports multiple subscribers', () => {
    const bus = new MessageBus();
    const sub1: BusEvent[] = [];
    const sub2: BusEvent[] = [];
    bus.onMessage((e) => sub1.push(e));
    bus.onMessage((e) => sub2.push(e));
    bus.emit({ type: 'agent_registered', from: 'agent-a' });
    expect(sub1).toHaveLength(1);
    expect(sub2).toHaveLength(1);
  });
});
