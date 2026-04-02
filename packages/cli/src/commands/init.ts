import { Command } from 'commander';
import inquirer from 'inquirer';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { log } from '../utils/logger.js';

function toPascalCase(str: string): string {
  return str.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join('');
}

export const initCommand = new Command('init')
  .argument('[name]', 'Agent name')
  .description('Scaffold a new AgentBridge agent project')
  .action(async (name?: string) => {
    const answers = await inquirer.prompt([
      { type: 'input', name: 'name', message: 'Agent name:', default: name ?? 'my-agent', when: !name },
      { type: 'input', name: 'description', message: 'Description:', default: 'An AgentBridge agent' },
      { type: 'input', name: 'capabilities', message: 'Capabilities (comma-separated):', default: 'general' },
    ]);

    const agentName = name ?? answers.name;
    const description = answers.description;
    const capabilities = answers.capabilities.split(',').map((c: string) => c.trim());
    const className = toPascalCase(agentName) + 'Agent';
    const dir = join(process.cwd(), agentName);

    if (existsSync(dir)) { log.error(`Directory ${agentName}/ already exists`); return; }
    mkdirSync(dir, { recursive: true });

    const capsList = capabilities.map((c: string) => `'${c}'`).join(', ');

    const agentTs = [
      `import { BaseAgent } from '@agentbridge/core';`,
      `import type { AgentConfig } from '@agentbridge/core';`,
      ``,
      `class ${className} extends BaseAgent {`,
      `  config: AgentConfig = {`,
      `    name: '${agentName}',`,
      `    description: '${description}',`,
      `    version: '1.0.0',`,
      `    capabilities: [${capsList}],`,
      `    inputs: {`,
      `      input: { type: 'string', required: true, description: 'Input for the agent' },`,
      `    },`,
      `    outputs: {`,
      `      result: { type: 'string', description: 'Agent output' },`,
      `    },`,
      `  };`,
      ``,
      `  async execute(input: Record<string, unknown>): Promise<Record<string, unknown>> {`,
      `    const text = input.input as string;`,
      `    // Replace with your agent logic:`,
      "    // const response = await this.callLLM(`Process this: ${text}`);",
      "    return { result: `Processed: ${text}` };",
      `  }`,
      `}`,
      ``,
      `const agent = new ${className}();`,
      `const port = parseInt(process.env.PORT ?? '6101');`,
      `const registry = process.env.REGISTRY_URL ?? 'http://localhost:6100';`,
      ``,
      `agent.start(port, registry).then(() => {`,
      "  console.log(`" + agentName + " running on port ${port}`);",
      `});`,
      ``,
    ].join('\n');

    const configYaml = [
      `name: ${agentName}`,
      `description: ${description}`,
      `version: 1.0.0`,
      `capabilities:`,
      ...capabilities.map((c: string) => `  - ${c}`),
      `port: 6101`,
      `env:`,
      `  OPENROUTER_API_KEY: \${OPENROUTER_API_KEY}`,
      ``,
    ].join('\n');

    const pkgJson = JSON.stringify({
      name: agentName, version: '1.0.0', type: 'module',
      scripts: { start: 'tsx agent.ts', dev: 'tsx watch agent.ts' },
      dependencies: { '@agentbridge/core': '^0.1.0' },
      devDependencies: { tsx: '^4.19.0', typescript: '^5.5.0' },
    }, null, 2);

    const tsConfig = JSON.stringify({
      compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'bundler', strict: true, esModuleInterop: true, skipLibCheck: true },
      include: ['*.ts'],
    }, null, 2);

    const envExample = 'OPENROUTER_API_KEY=your_key_here\nPORT=6101\nREGISTRY_URL=http://localhost:6100\n';

    writeFileSync(join(dir, 'agent.ts'), agentTs);
    writeFileSync(join(dir, 'agent.config.yaml'), configYaml);
    writeFileSync(join(dir, 'package.json'), pkgJson);
    writeFileSync(join(dir, 'tsconfig.json'), tsConfig);
    writeFileSync(join(dir, '.env.example'), envExample);

    log.success(`Created ${agentName}/`);
    log.dim(`  agent.ts              <- Your agent logic`);
    log.dim(`  agent.config.yaml     <- Agent metadata`);
    log.dim(`  package.json          <- Dependencies`);
    log.dim(`  tsconfig.json         <- TypeScript config`);
    log.dim(`  .env.example          <- Environment template`);
    log.info(`Next steps: cd ${agentName} && npm install && npx agentbridge dev`);
  });
