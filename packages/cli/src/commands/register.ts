import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';
import { log } from '../utils/logger.js';

export const registerCommand = new Command('register')
  .argument('[path]', 'Path to agent directory', '.')
  .option('-r, --registry <url>', 'Registry URL', 'http://localhost:6100')
  .description('Register an agent to running registry')
  .action(async (path, opts) => {
    try {
      const configPath = join(process.cwd(), path, 'agent.config.yaml');
      const raw = readFileSync(configPath, 'utf-8');
      const config = YAML.parse(raw);
      const card = {
        name: config.name, description: config.description,
        url: `http://localhost:${config.port ?? 6101}`,
        version: config.version ?? '1.0.0', capabilities: config.capabilities ?? [],
        defaultInputModes: ['text'], defaultOutputModes: ['text'],
        authentication: { schemes: ['none'] },
        skills: [{ id: 'execute', name: config.name, description: config.description }],
      };
      const res = await fetch(`${opts.registry}/agents`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card),
      });
      if (res.ok) log.success(`Registered "${config.name}"`);
      else log.error(`Registration failed: ${res.statusText}`);
    } catch (err) { log.error(`Failed: ${err instanceof Error ? err.message : String(err)}`); }
  });
