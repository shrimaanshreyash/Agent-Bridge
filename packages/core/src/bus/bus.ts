import { randomUUID } from 'node:crypto';

export interface BusEvent {
  id: string;
  timestamp: Date;
  type: 'task_sent' | 'task_completed' | 'task_failed' | 'agent_registered' | 'agent_removed';
  from?: string;
  to?: string;
  taskId?: string;
  latencyMs?: number;
  payload?: unknown;
}

export type BusEventInput = Omit<BusEvent, 'id' | 'timestamp'>;
type BusCallback = (event: BusEvent) => void;

export class MessageBus {
  private history: BusEvent[] = [];
  private subscribers: BusCallback[] = [];
  private cap: number;

  constructor(cap: number = 10_000) {
    this.cap = cap;
  }

  emit(input: BusEventInput): BusEvent {
    const event: BusEvent = { id: randomUUID(), timestamp: new Date(), ...input };
    this.history.push(event);
    if (this.history.length > this.cap) this.history.shift();
    for (const cb of this.subscribers) cb(event);
    return event;
  }

  onMessage(callback: BusCallback): void {
    this.subscribers.push(callback);
  }

  getHistory(limit?: number): BusEvent[] {
    if (limit) return this.history.slice(-limit);
    return [...this.history];
  }
}
