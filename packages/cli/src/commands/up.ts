import { Command } from 'commander';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createRegistryServer, parseComposeFile } from '@agentbridge/core';
import { readFileSync } from 'node:fs';
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

    let config: ReturnType<typeof parseComposeFile>;
    try {
      config = parseComposeFile(readFileSync(filePath, 'utf-8'));
    } catch (err) {
      log.error(`Invalid ${opts.file}: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }

    const registryPort = config.registry.port;
    log.brand('  AgentBridge');
    log.info(`Starting registry on port ${registryPort}...`);

    const registry = createRegistryServer();
    registry.start(registryPort);
    log.success(`Registry: http://localhost:${registryPort}`);

    const processes: ChildProcess[] = [];

    for (const [name, agentConf] of Object.entries(config.agents)) {
      const agentPath = join(process.cwd(), agentConf.path);
      const port = agentConf.port ?? 6101;
      log.info(`Starting agent "${name}" on port ${port}...`);

      const agentFile = join(agentPath, 'agent.ts');
      if (!/^[a-zA-Z0-9_\-.\\/: ]+$/.test(agentFile)) {
        log.error(`Unsafe agent path: ${agentFile}`); continue;
      }

      const env = {
        ...process.env,
        ...(agentConf.env ?? {}),
        PORT: String(port),
        REGISTRY_URL: `http://localhost:${registryPort}`,
      };

      const child = spawn('npx', ['tsx', agentFile], { env, stdio: 'pipe', shell: true });
      child.stdout?.on('data', (d) => { const t = d.toString().trim(); if (t) log.dim(`[${name}] ${t}`); });
      child.stderr?.on('data', (d) => { const t = d.toString().trim(); if (t) log.warn(`[${name}] ${t}`); });
      child.on('exit', (code) => { if (code !== 0 && code !== null) log.warn(`[${name}] exited with code ${code}`); });
      processes.push(child);
    }

    if (config.workflows) {
      const workflows = Object.entries(config.workflows).map(([name, wf]) => ({ name, ...wf }));
      registry.setWorkflows(workflows);
    }

    if (config.dashboard?.enabled) {
      const distIndex = join(process.cwd(), 'packages', 'dashboard', 'dist', 'index.html');
      const dashboardSrc = join(process.cwd(), 'packages', 'dashboard');
      const dashboardPort = config.dashboard.port;

      if (existsSync(distIndex)) {
        // Production: registry already serves the built dashboard
        log.success(`Dashboard: http://localhost:${registryPort}  (served by registry)`);
      } else if (existsSync(dashboardSrc)) {
        // Dev: no build yet — spawn Vite
        log.info(`Dashboard dist not found. Starting Vite dev server on port ${dashboardPort}...`);
        log.info(`  Run "npm run build:dashboard" once to switch to production mode.`);
        const dashChild = spawn('npx', ['vite', '--port', String(dashboardPort), '--host'], {
          cwd: dashboardSrc, stdio: 'pipe', shell: true,
          env: { ...process.env, VITE_REGISTRY_URL: `http://localhost:${registryPort}` },
        });
        dashChild.stdout?.on('data', (d) => {
          const t = d.toString().trim();
          const url = t.match(/https?:\/\/localhost:\d+/)?.[0];
          if (url) log.success(`Dashboard (dev): ${url}`);
        });
        dashChild.stderr?.on('data', (d) => {
          const t = d.toString().trim();
          if (t && !t.toLowerCase().includes('vite')) log.warn(`[dashboard] ${t}`);
        });
        dashChild.on('exit', (code) => { if (code !== 0 && code !== null) log.warn(`[dashboard] exited with code ${code}`); });
        processes.push(dashChild);
      } else {
        log.warn('Dashboard not found. Run "npm run build:dashboard" from the monorepo root.');
      }
    }

    if (config.mcp?.enabled) {
      log.info(`MCP: run "npx agentbridge mcp" to expose agents to Claude Code / Cursor`);
    }

    log.success('All systems running. Press Ctrl+C to stop.\n');

    process.on('SIGINT', () => {
      log.info('Shutting down...');
      for (const p of processes) p.kill('SIGTERM');
      registry.stop();
      setTimeout(() => process.exit(0), 500);
    });
  });
