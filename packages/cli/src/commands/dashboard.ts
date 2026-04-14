import { Command } from 'commander';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { log } from '../utils/logger.js';

export const dashboardCommand = new Command('dashboard')
  .description('Start the AgentBridge dashboard')
  .option('-r, --registry <url>', 'Registry URL', 'http://localhost:6100')
  .option('-p, --port <port>', 'Dashboard dev-server port (only used when no build exists)', '6140')
  .action(async (opts) => {
    const distIndex = join(process.cwd(), 'packages', 'dashboard', 'dist', 'index.html');
    const dashboardSrc = join(process.cwd(), 'packages', 'dashboard');

    if (!existsSync(dashboardSrc)) {
      log.error('packages/dashboard not found. Run from the AgentBridge monorepo root.');
      process.exit(1);
    }

    if (existsSync(distIndex)) {
      log.success(`Dashboard is served by the registry at ${opts.registry}`);
      log.info('Just open that URL in your browser — no separate process needed.');
      log.info('To rebuild the dashboard: npm run build:dashboard');
      return;
    }

    // No built dist — start Vite dev server
    log.info(`Starting dashboard dev server on http://localhost:${opts.port}`);
    log.info(`Connecting to registry at ${opts.registry}`);
    log.info('Tip: run "npm run build:dashboard" to build a production version.\n');

    const child = spawn('npx', ['vite', '--port', opts.port, '--host'], {
      cwd: dashboardSrc,
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, VITE_REGISTRY_URL: opts.registry },
    });

    child.on('exit', (code) => {
      if (code !== 0 && code !== null) log.error(`Dashboard exited with code ${code}`);
    });

    process.on('SIGINT', () => { child.kill('SIGTERM'); process.exit(0); });
  });
