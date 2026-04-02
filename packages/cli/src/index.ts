import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { upCommand } from './commands/up.js';
import { listCommand } from './commands/list.js';
import { callCommand } from './commands/call.js';
import { registerCommand } from './commands/register.js';
import { mcpCommand } from './commands/mcp.js';
import { dashboardCommand } from './commands/dashboard.js';

export function createCLI() {
  const program = new Command()
    .name('agentbridge')
    .description('AgentBridge — MCP + A2A framework for AI agents')
    .version('0.1.0');

  program.addCommand(initCommand);
  program.addCommand(upCommand);
  program.addCommand(listCommand);
  program.addCommand(callCommand);
  program.addCommand(registerCommand);
  program.addCommand(mcpCommand);
  program.addCommand(dashboardCommand);

  program.parse();
}
