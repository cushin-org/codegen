#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig, validateConfig } from './config/index.js';
import { CodegenCore } from './core/codegen.js';
import fs from 'fs/promises';
import path from 'path';

const program = new Command();

program
  .name('api-codegen')
  .description('Generate type-safe API client code from endpoint definitions')
  .version('1.0.0');

program
  .command('generate')
  .alias('gen')
  .description('Generate API client code from configuration')
  .option('-c, --config <path>', 'Path to configuration file')
  .option('-w, --watch', 'Watch for changes and regenerate')
  .action(async (options) => {
    const spinner = ora('Loading configuration...').start();

    try {
      // Load configuration
      const config = await loadConfig(options.config);

      if (!config) {
        spinner.fail(
          chalk.red(
            'No configuration file found. Please create an api-codegen.config.js file.',
          ),
        );
        process.exit(1);
      }

      spinner.text = 'Validating configuration...';
      validateConfig(config);

      spinner.text = 'Loading API endpoints...';
      const codegen = new CodegenCore(config);

      spinner.text = 'Generating code...';
      await codegen.execute();

      spinner.succeed(
        chalk.green(
          `✨ Code generated successfully in ${chalk.cyan(config.outputDir)}`,
        ),
      );

      // Print generated files
      console.log(chalk.dim('\nGenerated files:'));
      const files = await fs.readdir(config.outputDir);
      files.forEach((file) => {
        console.log(chalk.dim(`  • ${file}`));
      });

      if (options.watch) {
        console.log(chalk.yellow('\n👀 Watching for changes...'));
        // TODO: Implement watch mode
        spinner.info(chalk.dim('Watch mode not yet implemented'));
      }
    } catch (error) {
      spinner.fail(chalk.red('Failed to generate code'));
      console.error(
        chalk.red('\n' + (error instanceof Error ? error.message : String(error))),
      );
      if (error instanceof Error && error.stack) {
        console.error(chalk.dim(error.stack));
      }
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize a new api-codegen configuration')
  .option('-p, --provider <provider>', 'Provider type (vite or nextjs)', 'vite')
  .action(async (options) => {
    const spinner = ora('Creating configuration file...').start();

    try {
      const configContent = generateConfigTemplate(options.provider);
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

program
  .command('validate')
  .description('Validate your API endpoints configuration')
  .option('-c, --config <path>', 'Path to configuration file')
  .action(async (options) => {
    const spinner = ora('Loading configuration...').start();

    try {
      const config = await loadConfig(options.config);

      if (!config) {
        spinner.fail(chalk.red('No configuration file found'));
        process.exit(1);
      }

      spinner.text = 'Validating configuration...';
      validateConfig(config);

      spinner.text = 'Loading API endpoints...';

      new CodegenCore(config);

      // Just load to validate
      const apiConfigModule = await import(
        pathToFileURL(config.endpointsPath).href
      );
      const apiConfig =
        apiConfigModule.apiConfig ||
        apiConfigModule.default?.apiConfig ||
        apiConfigModule.default;

      if (!apiConfig || !apiConfig.endpoints) {
        throw new Error('Invalid endpoints configuration');
      }

      const endpointCount = Object.keys(apiConfig.endpoints).length;

      spinner.succeed(
        chalk.green(
          `✨ Configuration is valid! Found ${endpointCount} endpoint${endpointCount === 1 ? '' : 's'}`,
        ),
      );

      // Print endpoint summary
      console.log(chalk.dim('\nEndpoints:'));
      Object.entries(apiConfig.endpoints).forEach(([name, endpoint]: [string, any]) => {
        console.log(
          chalk.dim(
            `  • ${chalk.cyan(name)}: ${endpoint.method} ${endpoint.path}`,
          ),
        );
      });
    } catch (error) {
      spinner.fail(chalk.red('Validation failed'));
      console.error(
        chalk.red('\n' + (error instanceof Error ? error.message : String(error))),
      );
      process.exit(1);
    }
  });

function generateConfigTemplate(provider: string): string {
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

function pathToFileURL(filePath: string): URL {
  return new URL(`file://${path.resolve(filePath)}`);
}

program.parse();
