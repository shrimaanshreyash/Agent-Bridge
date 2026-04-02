import type { AgentStore } from './store.js';

export class HealthCheckManager {
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private store: AgentStore,
    private intervalMs: number = 10_000,
    private onStatusChange?: (name: string, status: 'healthy' | 'unhealthy') => void,
  ) {}

  start(): void {
    this.intervalId = setInterval(() => this.checkAll(), this.intervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async checkAll(): Promise<void> {
    const agents = this.store.list();
    await Promise.allSettled(agents.map((a) => this.checkOne(a.card.name, a.card.url)));
  }

  private async checkOne(name: string, url: string): Promise<void> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${url}/health`, { signal: controller.signal });
      clearTimeout(timeout);
      const status = res.ok ? 'healthy' : 'unhealthy';
      const prev = this.store.get(name)?.status;
      this.store.updateHealth(name, status);
      if (prev !== status) this.onStatusChange?.(name, status);
    } catch {
      const prev = this.store.get(name)?.status;
      this.store.updateHealth(name, 'unhealthy');
      if (prev !== 'unhealthy') this.onStatusChange?.(name, 'unhealthy');
    }
  }
}
