import type { A2AAgentCard } from '../a2a/types.js';

export interface AgentMetrics {
  totalTasks: number;
  successCount: number;
  failCount: number;
  avgResponseMs: number;
  p95ResponseMs: number;
  p99ResponseMs: number;
}

export interface RegisteredAgent {
  card: A2AAgentCard;
  registeredAt: Date;
  lastHealthCheck: Date;
  status: 'healthy' | 'unhealthy' | 'unknown';
  metrics: AgentMetrics;
}

export class AgentStore {
  private agents = new Map<string, RegisteredAgent>();
  private responseTimes = new Map<string, number[]>();

  register(card: A2AAgentCard): RegisteredAgent {
    const agent: RegisteredAgent = {
      card,
      registeredAt: new Date(),
      lastHealthCheck: new Date(),
      status: 'unknown',
      metrics: {
        totalTasks: 0, successCount: 0, failCount: 0,
        avgResponseMs: 0, p95ResponseMs: 0, p99ResponseMs: 0,
      },
    };
    this.agents.set(card.name, agent);
    this.responseTimes.set(card.name, []);
    return agent;
  }

  get(name: string): RegisteredAgent | undefined {
    return this.agents.get(name);
  }

  list(): RegisteredAgent[] {
    return Array.from(this.agents.values());
  }

  remove(name: string): boolean {
    this.responseTimes.delete(name);
    return this.agents.delete(name);
  }

  discover(capability: string): RegisteredAgent[] {
    return this.list().filter((a) => a.card.capabilities.includes(capability));
  }

  updateHealth(name: string, status: 'healthy' | 'unhealthy'): void {
    const agent = this.agents.get(name);
    if (!agent) return;
    agent.status = status;
    agent.lastHealthCheck = new Date();
  }

  recordTaskResult(name: string, success: boolean, responseMs: number): void {
    const agent = this.agents.get(name);
    if (!agent) return;

    agent.metrics.totalTasks++;
    if (success) agent.metrics.successCount++;
    else agent.metrics.failCount++;

    const times = this.responseTimes.get(name)!;
    times.push(responseMs);
    if (times.length > 1000) times.shift();

    agent.metrics.avgResponseMs = times.reduce((a, b) => a + b, 0) / times.length;
    const sorted = [...times].sort((a, b) => a - b);
    agent.metrics.p95ResponseMs = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
    agent.metrics.p99ResponseMs = sorted[Math.floor(sorted.length * 0.99)] ?? 0;
  }
}
