import Table from 'cli-table3';
import chalk from 'chalk';

export function agentTable(agents: any[]): string {
  const table = new Table({
    head: [chalk.cyan('Name'), chalk.cyan('Status'), chalk.cyan('URL'), chalk.cyan('Capabilities'), chalk.cyan('Tasks')],
    style: { head: [], border: ['dim'] },
  });
  for (const a of agents) {
    const statusColor = a.status === 'healthy' ? chalk.green : a.status === 'unhealthy' ? chalk.red : chalk.yellow;
    table.push([
      chalk.bold(a.card?.name ?? a.name),
      statusColor(a.status ?? 'unknown'),
      chalk.dim(a.card?.url ?? a.url ?? ''),
      (a.card?.capabilities ?? []).join(', '),
      String(a.metrics?.totalTasks ?? 0),
    ]);
  }
  return table.toString();
}
