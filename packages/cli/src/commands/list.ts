import { Command } from 'commander';
import { log } from '../utils/logger.js';
import { agentTable } from '../utils/table.js';

export const listCommand = new Command('list')
  .description('List all registered agents')
  .option('-r, --registry <url>', 'Registry URL', 'http://localhost:6100')
  .action(async (opts) => {
    try {
      const res = await fetch(`${opts.registry}/agents`);
      const agents = await res.json();
      if (agents.length === 0) { log.info('No agents registered.'); return; }
      console.log(agentTable(agents));
    } catch { log.error(`Could not connect to registry at ${opts.registry}`); }
  });
