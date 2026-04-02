import { Command } from 'commander';
import { A2AClient } from '@agentbridge/core';
import { log } from '../utils/logger.js';

export const callCommand = new Command('call')
  .argument('<agent>', 'Agent name')
  .argument('<input>', 'Input text or JSON')
  .option('-r, --registry <url>', 'Registry URL', 'http://localhost:6100')
  .description('Invoke an agent from terminal')
  .action(async (agentName, input, opts) => {
    try {
      const res = await fetch(`${opts.registry}/agents/${agentName}`);
      if (!res.ok) { log.error(`Agent "${agentName}" not found`); return; }
      const agent = await res.json();
      log.info(`Calling ${agentName} at ${agent.card.url}...`);

      let data: Record<string, unknown>;
      try { data = JSON.parse(input); } catch { data = { input }; }

      const client = new A2AClient();
      const result = await client.sendTask(agent.card.url, {
        role: 'user', parts: [{ type: 'data', data }],
      });

      if (result.status === 'failed') { log.error(`Error: ${result.error?.message}`); return; }

      const textPart = result.result?.parts.find((p) => p.type === 'text');
      const dataPart = result.result?.parts.find((p) => p.type === 'data');
      if (textPart?.text) console.log(textPart.text);
      else if (dataPart?.data) console.log(JSON.stringify(dataPart.data, null, 2));

      log.success(`Task ${result.id} completed`);
    } catch (err) { log.error(`Failed: ${err instanceof Error ? err.message : String(err)}`); }
  });
