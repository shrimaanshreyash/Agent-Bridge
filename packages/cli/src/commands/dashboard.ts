import { Command } from 'commander';
import { log } from '../utils/logger.js';

export const dashboardCommand = new Command('dashboard')
  .description('Start dashboard standalone')
  .option('-r, --registry <url>', 'Registry URL', 'http://localhost:6100')
  .option('-p, --port <port>', 'Dashboard port', '6140')
  .action(async (opts) => {
    log.info(`Dashboard will be available at http://localhost:${opts.port}`);
    log.info('Dashboard implementation is part of the dashboard package (Day 5-6)');
    log.info(`For now, use 'npx agentbridge up' with dashboard.enabled: true in agentbridge.yaml`);
  });
