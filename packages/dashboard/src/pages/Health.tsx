import { useMetrics } from '../hooks/useMetrics.js';
import { NumberTicker } from '../components/NumberTicker.js';
import { ProgressBar } from '../components/ProgressBar.js';
import { StatusDot } from '../components/StatusDot.js';
import { OfflineState } from '../components/OfflineState.js';
import { glass } from '../lib/theme.js';

export function Health() {
  const { metrics, loading, error } = useMetrics();
  if (error) {
    return (<div><h1 className="text-2xl font-bold mb-6">Health & Metrics</h1><OfflineState /></div>);
  }
  if (loading || !metrics) {
    return (<div><h1 className="text-2xl font-bold mb-6">Health & Metrics</h1>
      <div className="text-zinc-500">Loading metrics...</div></div>);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Health & Metrics</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <NumberTicker value={metrics.totalAgents ?? 0} label="Total Agents" />
        <NumberTicker value={metrics.healthyAgents ?? 0} label="Healthy" />
        <NumberTicker value={metrics.unhealthyAgents ?? 0} label="Unhealthy" />
        <NumberTicker value={metrics.agents?.reduce((sum: number, a: any) => sum + (a.metrics?.totalTasks ?? 0), 0) ?? 0} label="Total Tasks" />
      </div>
      <div className="space-y-4">
        {(metrics.agents ?? []).map((agent: any) => {
          const successRate = agent.metrics.totalTasks > 0 ? Math.round((agent.metrics.successCount / agent.metrics.totalTasks) * 100) : 100;
          return (
            <div key={agent.name} className={`${glass} p-5`}>
              <div className="flex items-center gap-3 mb-4">
                <StatusDot status={agent.status} />
                <h3 className="font-semibold">{agent.name}</h3>
                <span className="text-xs text-zinc-500 ml-auto">{agent.metrics.totalTasks} tasks</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ProgressBar value={successRate} label={`Success Rate: ${successRate}%`} />
                <div className="text-sm">
                  <div className="text-zinc-500 text-xs mb-1">Response Time</div>
                  <div className="flex gap-4 font-mono text-xs">
                    <span>avg: <span className="text-white">{Math.round(agent.metrics.avgResponseMs)}ms</span></span>
                    <span>p95: <span className="text-white">{Math.round(agent.metrics.p95ResponseMs)}ms</span></span>
                    <span>p99: <span className="text-white">{Math.round(agent.metrics.p99ResponseMs)}ms</span></span>
                  </div>
                </div>
                <div className="text-sm">
                  <div className="text-zinc-500 text-xs mb-1">Breakdown</div>
                  <div className="flex gap-4 font-mono text-xs">
                    <span className="text-green-400">{agent.metrics.successCount} ok</span>
                    <span className="text-red-400">{agent.metrics.failCount} fail</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
