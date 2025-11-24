import { Command } from 'commander';

export interface CLICommandContext {
  // This will be extended by packages that use the CLI
}

export function setupCLIProgram(program: Command, name = 'api-codegen'): Command {
  program
    .name(name)
    .description('Generate type-safe API client code from endpoint definitions')
    .version('1.1.1');

  return program;
}

export type { GenerateCommandContext } from './generate.js';
export type { InitCommandContext } from './init.js';
export type { ValidateCommandContext } from './validate.js';

export { setupGenerateCommand } from './generate.js';
export { setupInitCommand } from './init.js';
export { setupValidateCommand } from './validate.js';
