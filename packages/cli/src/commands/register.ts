import { Command } from 'commander';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';
import { log } from '../utils/logger.js';

export const registerCommand = new Command('register')
  .argument('[path]', 'Path to agent directory', '.')
  .option('-r, --registry <url>', 'Registry URL', 'http://localhost:6100')
  .option('--port <port>', 'Agent port', '6101')
  .description('Manually register an agent card with the running registry')
  .action(async (agentPath, opts) => {
    const dir = join(process.cwd(), agentPath);

    // Try agent.config.yaml first, then package.json for name/description
    const yamlPath = join(dir, 'agent.config.yaml');
    const pkgPath = join(dir, 'package.json');

    let name: string | undefined;
    let description: string | undefined;
    let port = parseInt(opts.port);
    let capabilities: string[] = [];
    let version = '1.0.0';

    if (existsSync(yamlPath)) {
      const config = YAML.parse(readFileSync(yamlPath, 'utf-8'));
      name = config.name;
      description = config.description;
      port = config.port ?? port;
      capabilities = config.capabilities ?? [];
      version = config.version ?? version;
    } else if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      name = pkg.name?.replace(/^@[^/]+\//, ''); // strip scope
      description = pkg.description;
      version = pkg.version ?? version;
    } else {
      log.error(`No agent.config.yaml or package.json found in ${dir}`);
      log.info('Create an agent.config.yaml with: name, description, port, capabilities');
      return;
    }

    if (!name) { log.error('Could not determine agent name from config'); return; }

    const card = {
      name,
      description: description ?? `${name} agent`,
      url: `http://localhost:${port}`,
      version,
      capabilities,
      defaultInputModes: ['text'],
      defaultOutputModes: ['text'],
      authentication: { schemes: ['none'] },
      skills: [{ id: 'execute', name, description: description ?? name }],
    };

    try {
      const res = await fetch(`${opts.registry}/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card),
      });
      if (res.ok) {
        log.success(`Registered "${name}" at http://localhost:${port}`);
      } else {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        log.error(`Registration failed: ${body.error ?? res.statusText}`);
      }
    } catch (err) {
      log.error(`Could not reach registry at ${opts.registry}: ${err instanceof Error ? err.message : String(err)}`);
    }
  });
