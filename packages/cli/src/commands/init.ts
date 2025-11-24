import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';

export interface InitCommandContext {
  generateConfigTemplate?: (provider: string) => string;
}

export function setupInitCommand(
  program: Command,
  context?: InitCommandContext,
): Command {
  return program
    .command('init')
    .description('Initialize a new api-codegen configuration')
    .option('-p, --provider <provider>', 'Provider type (vite or nextjs)', 'vite')
    .action(async (options) => {
      const spinner = ora('Creating configuration file...').start();

      try {
        const configContent =
          context?.generateConfigTemplate?.(options.provider) ||
          generateDefaultConfigTemplate(options.provider);
        const configPath = path.join(process.cwd(), 'api-codegen.config.js');

        // Check if config already exists
        try {
          await fs.access(configPath);
          spinner.warn(
            chalk.yellow(
              'Configuration file already exists at api-codegen.config.js',
            ),
          );
          return;
        } catch {
          // File doesn't exist, continue
        }

        await fs.writeFile(configPath, configContent, 'utf-8');

        spinner.succeed(
          chalk.green('✨ Configuration file created: api-codegen.config.js'),
        );

        console.log(chalk.dim('\nNext steps:'));
        console.log(chalk.dim('  1. Update the endpoints path in the config'));
        console.log(chalk.dim('  2. Run: npx @cushin/api-codegen generate'));
      } catch (error) {
        spinner.fail(chalk.red('Failed to create configuration file'));
        console.error(
          chalk.red('\n' + (error instanceof Error ? error.message : String(error))),
        );
        process.exit(1);
      }
    });
}

function generateDefaultConfigTemplate(provider: string): string {
  return `/** @type {import('@cushin/api-codegen').UserConfig} */
export default {
  // Provider: 'vite' or 'nextjs'
  provider: '${provider}',

  // Path to your API endpoints configuration
  endpoints: './lib/api/config/endpoints.ts',

  // Output directory for generated files
  output: './lib/api/generated',

  // Base URL for API requests (optional, can be set at runtime)
  baseUrl: process.env.VITE_API_URL || process.env.NEXT_PUBLIC_API_URL,

  // Generation options
  generateHooks: true,
  generateClient: true,
  ${provider === 'nextjs' ? `generateServerActions: true,
  generateServerQueries: true,` : ''}

  // Advanced options
  options: {
    useClientDirective: true,
    hookPrefix: 'use',
    actionSuffix: 'Action',
  },
};
`;
}
