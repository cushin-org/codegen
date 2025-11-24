import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';

export interface GenerateCommandContext {
  loadConfig: (configPath?: string) => Promise<any>;
  validateConfig: (config: any) => void;
  CodegenCore: any;
}

export function setupGenerateCommand(
  program: Command,
  context: GenerateCommandContext,
): Command {
  return program
    .command('generate')
    .alias('gen')
    .description('Generate API client code from configuration')
    .option('-c, --config <path>', 'Path to configuration file')
    .option('-w, --watch', 'Watch for changes and regenerate')
    .action(async (options) => {
      const spinner = ora('Loading configuration...').start();

      try {
        // Load configuration
        const config = await context.loadConfig(options.config);

        if (!config) {
          spinner.fail(
            chalk.red(
              'No configuration file found. Please create an api-codegen.config.js file.',
            ),
          );
          process.exit(1);
        }

        spinner.text = 'Validating configuration...';
        context.validateConfig(config);

        spinner.text = 'Loading API endpoints...';
        const codegen = new context.CodegenCore(config);

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
}
