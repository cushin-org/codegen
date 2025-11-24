import ora from 'ora';
import chalk from 'chalk';

export const createSpinner = (text: string) => {
  return ora(text).start();
};

export const succeedSpinner = (spinner: ReturnType<typeof ora>, message: string) => {
  spinner.succeed(chalk.green(message));
};

export const failSpinner = (spinner: ReturnType<typeof ora>, message: string) => {
  spinner.fail(chalk.red(message));
};

export const warnSpinner = (spinner: ReturnType<typeof ora>, message: string) => {
  spinner.warn(chalk.yellow(message));
};
