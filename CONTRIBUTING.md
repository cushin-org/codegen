# Contributing to @cushin/api-codegen

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- pnpm (recommended) or npm

### Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/yourusername/api-codegen.git
   cd api-codegen
   ```

3. Install dependencies:
   ```bash
   pnpm install
   ```

4. Build the package:
   ```bash
   pnpm build
   ```

5. Link for local testing:
   ```bash
   npm link
   ```

## Project Structure

```
src/
├── cli/              # CLI commands and interface
├── config/           # Configuration loading and validation
├── core/             # Core codegen logic
├── generators/       # Code generators (hooks, actions, queries, etc.)
├── runtime/          # Runtime client code
├── templates/        # Code templates
└── utils/            # Utility functions

examples/             # Example configurations
dist/                 # Build output
```

## Development Workflow

### Making Changes

1. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes

3. Build and test:
   ```bash
   pnpm build
   pnpm typecheck
   ```

4. Test locally in a sample project:
   ```bash
   # In api-codegen directory
   npm link

   # In your test project
   npm link @cushin/api-codegen
   npx @cushin/api-codegen generate
   ```

### Code Style

- Use TypeScript for all source files
- Follow existing code style
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions small and focused

### Commit Messages

Follow conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `test:` Test changes
- `chore:` Build/tooling changes

Example:
```
feat: add watch mode for generate command
fix: resolve path handling on Windows
docs: update README with new examples
```

## Adding Features

### Adding a New Generator

1. Create a new file in `src/generators/`:
   ```typescript
   import { BaseGenerator } from './base.js';
   
   export class MyNewGenerator extends BaseGenerator {
     async generate(): Promise<void> {
       // Implementation
     }
   }
   ```

2. Register it in `src/generators/index.ts`

3. Add configuration options in `src/config/index.ts`

4. Update CLI if needed

5. Add documentation and examples

### Adding a New CLI Command

1. Add command in `src/cli.ts`:
   ```typescript
   program
     .command('my-command')
     .description('Description')
     .action(async () => {
       // Implementation
     });
   ```

2. Add tests

3. Update README

## Testing

Currently manual testing is required. Automated tests coming soon.

### Manual Testing

1. Create a test project
2. Link the package: `npm link @cushin/api-codegen`
3. Create a test config
4. Run: `npx @cushin/api-codegen generate`
5. Verify generated code
6. Test in both Vite and Next.js projects

## Pull Request Process

1. Update documentation if needed
2. Add your changes to CHANGELOG.md
3. Ensure the build passes: `pnpm build`
4. Create a pull request with:
   - Clear description of changes
   - Any breaking changes noted
   - Examples if applicable

## Release Process

Maintainers will handle releases:

1. Update version in package.json
2. Update CHANGELOG.md
3. Create git tag
4. Publish to npm

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions or ideas
- Check existing issues and discussions first

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the code, not the person
- Help others learn and grow

Thank you for contributing! 🎉
