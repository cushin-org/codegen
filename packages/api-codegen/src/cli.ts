#!/usr/bin/env node

import { Command } from 'commander';
import { setupCLIProgram, setupGenerateCommand, setupInitCommand, setupValidateCommand } from '@cushin/codegen-cli';
import { loadConfig, validateConfig } from './config/index.js';
import { CodegenCore } from './core/codegen.js';
import path from 'path';

const program = new Command();

// Setup base program
setupCLIProgram(program);

// Setup commands with context
const context = {
  loadConfig,
  validateConfig,
  CodegenCore,
  pathToFileURL: (filePath: string) => new URL(`file://${path.resolve(filePath)}`),
};

setupGenerateCommand(program, context);
setupInitCommand(program);
setupValidateCommand(program, context);

program.parse();
