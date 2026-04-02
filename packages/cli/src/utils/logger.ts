import chalk from 'chalk';

export const log = {
  info: (msg: string) => console.log(chalk.blue('i'), msg),
  success: (msg: string) => console.log(chalk.green('✓'), msg),
  warn: (msg: string) => console.log(chalk.yellow('!'), msg),
  error: (msg: string) => console.log(chalk.red('x'), msg),
  dim: (msg: string) => console.log(chalk.dim(msg)),
  brand: (msg: string) => console.log(chalk.bold.cyan(msg)),
};
