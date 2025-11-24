import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';

export interface ValidateCommandContext {
  loadConfig: (configPath?: string) => Promise<any>;
  validateConfig: (config: any) => void;
  CodegenCore: any;
  pathToFileURL?: (filePath: string) => URL;
}

export function setupValidateCommand(
  program: Command,
  context: ValidateCommandContext,
): Command {
  return program
    .command('validate')
    .description('Validate your API endpoints configuration')
    .option('-c, --config <path>', 'Path to configuration file')
    .action(async (options) => {
      const spinner = ora('Loading configuration...').start();

      try {
        const config = await context.loadConfig(options.config);

        if (!config) {
          spinner.fail(chalk.red('No configuration file found'));
          process.exit(1);
        }

        spinner.text = 'Validating configuration...';
        context.validateConfig(config);

        spinner.text = 'Loading API endpoints...';

        new context.CodegenCore(config);

        // Just load to validate
        const pathToFileURL =
          context.pathToFileURL ||
          ((filePath: string) => new URL(`file://${path.resolve(filePath)}`));
        const apiConfigModule = await import(pathToFileURL(config.endpointsPath).href);
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
}
