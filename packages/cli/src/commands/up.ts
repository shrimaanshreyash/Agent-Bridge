import { Command } from 'commander';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';
import { createRegistryServer } from '@agentbridge/core';
import { spawn, type ChildProcess } from 'node:child_process';
import { log } from '../utils/logger.js';
import { config as loadEnv } from 'dotenv';

export const upCommand = new Command('up')
  .description('Start everything from agentbridge.yaml')
  .option('-f, --file <path>', 'Compose file path', 'agentbridge.yaml')
  .action(async (opts) => {
    loadEnv();
    const filePath = join(process.cwd(), opts.file);
    if (!existsSync(filePath)) { log.error(`${opts.file} not found`); return; }

    const raw = readFileSync(filePath, 'utf-8');
    const interpolated = raw.replace(/\$\{(\w+)\}/g, (_, key) => process.env[key] ?? '');
    const config = YAML.parse(interpolated);

    const registryPort = config.registry?.port ?? 6100;
    log.brand('  AgentBridge');
    log.info(`Starting registry on port ${registryPort}...`);

    const registry = createRegistryServer();
    registry.start(registryPort);
    log.success(`Registry running on http://localhost:${registryPort}`);

    const processes: ChildProcess[] = [];
    const agents = config.agents ?? {};

    for (const [name, agentConf] of Object.entries(agents) as [string, any][]) {
      const agentPath = join(process.cwd(), agentConf.path);
      const port = agentConf.port ?? 6101;
      log.info(`Starting agent "${name}" on port ${port}...`);

      const env = { ...process.env, ...agentConf.env, PORT: String(port), REGISTRY_URL: `http://localhost:${registryPort}` };
      const child = spawn('npx', ['tsx', join(agentPath, 'agent.ts')], { env, stdio: 'pipe' });
      child.stdout?.on('data', (data) => log.dim(`[${name}] ${data.toString().trim()}`));
      child.stderr?.on('data', (data) => log.warn(`[${name}] ${data.toString().trim()}`));
      child.on('exit', (code) => log.warn(`[${name}] exited with code ${code}`));
      processes.push(child);
    }

    if (config.workflows) {
      const workflows = Object.entries(config.workflows).map(([name, wf]: [string, any]) => ({ name, ...wf }));
      registry.setWorkflows(workflows);
    }

    if (config.dashboard?.enabled) {
      log.info(`Dashboard: http://localhost:${config.dashboard.port ?? 6140} (implemented in Day 5-6)`);
    }

    if (config.mcp?.enabled) {
      log.info(`MCP server enabled (use 'npx agentbridge mcp' for Claude Code)`);
    }

    log.success('All systems running. Press Ctrl+C to stop.');
    process.on('SIGINT', () => {
      log.info('Shutting down...');
      for (const p of processes) p.kill();
      registry.stop();
      process.exit(0);
    });
  });
