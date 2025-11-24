# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Structure

This is a monorepo using **pnpm workspaces** with the following packages:

```
packages/
├── cli/                 # Shared CLI library (@cushin/cli)
│   └── src/
│       ├── commands/    # CLI command implementations
│       └── utils/       # Shared CLI utilities
└── api-codegen/         # API codegen package (@cushin/api-codegen)
    └── src/
        ├── config/      # Configuration loading and validation
        ├── core/        # CodegenCore orchestration
        ├── generators/  # All specialized code generators
        └── runtime/     # Runtime HTTP client
```

## Quick Reference: Common Commands

**Build & Development (from root):**
```bash
pnpm build              # Build all packages
pnpm dev                # Start watch mode for all packages
pnpm typecheck          # Type check all packages
pnpm lint               # Lint all packages
pnpm test               # Run tests in all packages
```

**Build & Development (specific package):**
```bash
pnpm -F @cushin/cli build          # Build CLI package only
pnpm -F @cushin/api-codegen build  # Build api-codegen package only
pnpm -F @cushin/api-codegen dev    # Watch mode for api-codegen
```

**Code Quality:**
- ESLint enforces TypeScript best practices in each package
- Biome handles formatting (double quotes, space indentation)
- Each package has its own eslintrc.js and biome.json
- Use `npm link` to test the CLI in other projects

## Project Overview

**Cushin Monorepo** - A modular code generator framework for type-safe API clients in React/Next.js applications.

### Packages

#### @cushin/cli (Shared CLI Library)
- **Purpose**: Reusable CLI command infrastructure for all Cushin generators
- **Exports**: CLI command setup functions, spinner utilities
- **Commands**: `generate`, `init`, `validate` (abstract implementations)
- **Dependencies**: commander, chalk, ora

#### @cushin/api-codegen (API Code Generator)
- **Purpose**: Generate type-safe API clients from Zod endpoint definitions
- **Exports**: Public API for programmatic use, runtime client utilities
- **CLI**: Implements Cushin CLI commands for API codegen
- **Generates**: React Query hooks, Server Actions, server utilities, type definitions
- **Peer Deps**: `ky` (HTTP client), `zod` (schema validation)

## Architecture at a Glance

### Generation Pipeline

The system follows a **schema-driven architecture** where Zod schemas are the single source of truth:

```
1. User defines endpoints with Zod schemas in config
2. CodegenCore loads the endpoint definitions via Jiti
3. CodeGenerator orchestrates specialized generators in sequence:
   - TypesGenerator      → generates type helpers
   - ClientGenerator     → generates HTTP client methods
   - QueryKeysGenerator  → generates React Query key factory
   - QueryOptionsGenerator → generates query options factory
   - HooksGenerator      → generates React hooks (uses Q.Keys + Q.Options)
   - PrefetchGenerator   → generates prefetch utilities
   - ServerActionsGenerator → [Next.js only] generates server actions
   - ServerQueriesGenerator → [Next.js only] generates server queries
```

### Core Modules (in @cushin/api-codegen)

| Module | Purpose | Key Files |
|--------|---------|-----------|
| **config/** | Configuration loading and validation | `schema.ts` (endpoint types), `index.ts` (loading) |
| **core/** | Orchestration engine | `codegen.ts` (CodegenCore class) |
| **generators/** | Specialized code generators | `base.ts` (shared logic), `types.ts`, `client.ts`, `hooks.ts`, `actions.ts`, `queries.ts`, `query-keys.ts`, `query-options.ts`, `prefetch.ts`, `index.ts` (orchestrator) |
| **runtime/** | Runtime HTTP client | `client.ts` (APIClient, auth token handling) |

### Generator Dependencies

- **TypesGenerator** must run first (provides type helpers for all others)
- **ClientGenerator** must run second (provides HTTP client)
- **QueryKeysGenerator** → **QueryOptionsGenerator** → **HooksGenerator** (chain dependency)
- **PrefetchGenerator** depends on QueryOptionsGenerator
- Server generators (Actions, Queries) run last and are Next.js-specific only

## Important Design Patterns

### 1. Schema-Driven Type Safety
All type information flows from Zod schemas:
- Endpoint definitions use Zod schemas for `params`, `query`, `body`, and `response`
- TypesGenerator creates type extraction helpers (`ExtractParams`, `ExtractQuery`, etc.)
- All generated code uses these helpers to maintain type safety
- Runtime client validates request/response bodies using the same schemas

### 2. Provider-Aware Generation
The `provider` config determines which generators are active:
- **Vite**: Client-side hooks, prefetch utilities, client
- **Next.js**: Additionally generates server actions, server queries, server-client
- Different output files per provider (e.g., `server-client.ts` only for Next.js)

### 3. Resource-Based Organization
Query keys and cache invalidation are hierarchical:
- Resources extracted from endpoint paths (e.g., `/users/:id` → `users`)
- Query keys: `queryKeys.{resource}.{endpoint}()`
- Mutations auto-invalidate related queries by resource
- Tags used for finer-grained cache control

### 4. Lazy Client Initialization
- API client is lazy-initialized via `initializeAPIClient()` callback
- Allows runtime configuration of auth tokens, error handling
- Bearer token automatically injected in Authorization header
- Token refresh with deduplication prevents concurrent refreshes

### 5. Per-Endpoint Base URL Support
Endpoints can override the global baseUrl:
```typescript
defineEndpoint({
  path: '/auth/login',
  baseUrl: 'https://auth.example.com',  // Override
  // ...
})
```

## CLI Package (@cushin/cli)

### Structure
```
packages/cli/src/
├── commands/
│   ├── index.ts         # setupCLIProgram() and command exports
│   ├── generate.ts      # setupGenerateCommand()
│   ├── init.ts          # setupInitCommand()
│   └── validate.ts      # setupValidateCommand()
└── utils/
    └── spinner.ts       # Spinner utility functions
```

### CLI Command Architecture

Commands are implemented as setup functions that take a `Command` object and optional context:

```typescript
interface GenerateCommandContext {
  loadConfig: (configPath?: string) => Promise<any>;
  validateConfig: (config: any) => void;
  CodegenCore: any;
}

setupGenerateCommand(program: Command, context: GenerateCommandContext)
```

This design allows different packages to implement the same CLI commands with their own logic.

### Extending with New Commands

To add a new command to @cushin/cli:

1. Create `packages/cli/src/commands/my-command.ts`
2. Export `setupMyCommand(program, context?)` function
3. Add export to `packages/cli/src/commands/index.ts`
4. Use in packages like @cushin/api-codegen

## API Codegen Package (@cushin/api-codegen)

### CLI Integration

The CLI is implemented in `src/cli.ts`:
```typescript
// Imports setupGenerateCommand, setupInitCommand, etc. from @cushin/cli
setupGenerateCommand(program, { loadConfig, validateConfig, CodegenCore });
setupInitCommand(program);
setupValidateCommand(program, { loadConfig, validateConfig, CodegenCore });
```

### Programmatic Usage

The package exports all configuration types and utilities:
```typescript
import { defineConfig, defineEndpoint, CodegenCore } from '@cushin/api-codegen';
import { createAPIClient } from '@cushin/api-codegen/client';
```

## Generator Implementation Details

### BaseGenerator (@cushin/api-codegen/src/generators/base.ts)
All generators extend this abstract class:
- **`isQuery(endpoint)`**: Detects GET endpoints (queries vs mutations)
- **`getResourceFromPath(path)`**: Extracts resource name from endpoint path
- **`camelCase(str)`**: Converts path segments to camelCase names
- **`getTypePath(endpoint)`**: Calculates relative import paths for types

### Key Methods When Adding a New Generator
- `async generate(): Promise<void>` - Main implementation (required)
- Use `this.config` for configuration access
- Use `this.endpoints` to access all endpoint definitions
- Use `this.resolvedConfig.output` for output directory path
- Call `await this.ensureOutputDir()` before writing files

### File Output Locations
All generated files go to `config.output` directory (e.g., `./lib/api/generated/`):
```
generated/
├── types.ts              # Type helpers
├── client.ts             # API client (Vite + Next.js)
├── server-client.ts      # Server-side client (Next.js only)
├── query-keys.ts         # React Query key factory
├── query-options.ts      # Query options factory
├── hooks.ts              # React hooks
├── prefetch.ts           # Prefetch utilities
├── actions.ts            # Server actions (Next.js only)
└── queries.ts            # Server queries (Next.js only)
```

## Configuration and CLI

### Configuration File (api-codegen.config.js)
```javascript
export default {
  provider: 'vite' | 'nextjs',                    // Required
  endpoints: './lib/api/config/endpoints.ts',     // Required
  output: './lib/api/generated',                  // Required
  baseUrl: process.env.VITE_API_URL,              // Optional
  generateHooks: true,        // Generate React hooks
  generateClient: true,       // Generate API client
  generateServerActions: true,  // Next.js only
  generateServerQueries: true,  // Next.js only
  generatePrefetch: true,
}
```

### CLI Commands (from @cushin/api-codegen)
- **`generate [options]`**: Generate code from config (supports `--watch`)
- **`init --provider vite|nextjs`**: Create template config file
- **`validate`**: Validate config and endpoint definitions

## Endpoint Definition API

Endpoints are defined using two helper functions:

### `defineConfig(config)`
- Creates the main API configuration object
- Contains `baseUrl` and `endpoints` dictionary

### `defineEndpoint(config)`
Each endpoint has:
- **`path`**: API path with `:paramName` placeholders
- **`method`**: HTTP method (GET, POST, PUT, DELETE, PATCH, etc.)
- **`params`**: Zod schema for path parameters (optional)
- **`query`**: Zod schema for query parameters (optional)
- **`body`**: Zod schema for request body (optional)
- **`response`**: Zod schema for response type (required)
- **`tags`**: Array of tags for cache invalidation (optional)
- **`description`**: Endpoint description (optional)
- **`baseUrl`**: Override global baseUrl (optional)

## Linting and Formatting

- **Linter**: ESLint with @typescript-eslint
  - No explicit `any` types allowed (rule off for dev flexibility)
  - Unused variables warned (prefix with `_` to suppress)
  - Module boundary types not required
  - Console logging is allowed

- **Formatter**: Biome
  - Double quotes for strings
  - Space indentation (not tabs)
  - Organize imports on save

Run `pnpm lint` to check code before committing.

## Testing

Currently manual testing is required. Automated tests coming soon.

**Manual Testing Workflow:**
```bash
pnpm build                    # Build all packages
cd packages/api-codegen
npm link                      # Link package locally
cd /path/to/test/project
npm link @cushin/api-codegen  # Link in test project
npx @cushin/api-codegen generate  # Test generation
```

Test both Vite and Next.js projects to ensure provider-specific features work correctly.

## Common Tasks

### Adding a New Generator
1. Create `packages/api-codegen/src/generators/my-generator.ts` extending `BaseGenerator`
2. Implement `async generate(): Promise<void>` method
3. Register in `packages/api-codegen/src/generators/index.ts` → `CodeGenerator.generate()`
4. Add config flag if needed in `packages/api-codegen/src/config/index.ts`
5. Update README with new output file description
6. Test with both Vite and Next.js projects

### Modifying Type Generation
- Changes to TypesGenerator may affect all other generators (it provides type helpers)
- Always ensure backward compatibility with existing generated code
- Test that all generated files still have correct imports

### Adding a New CLI Command
1. Create `packages/cli/src/commands/my-command.ts` with `setupMyCommand()` function
2. Export from `packages/cli/src/commands/index.ts`
3. Use in `packages/api-codegen/src/cli.ts` by calling the setup function
4. Update CLI help text
5. Document in README.md and CONTRIBUTING.md
6. Test with `npm link` locally

### Debugging Generation
- Use `npx @cushin/api-codegen validate` to check configuration loading
- Check `packages/api-codegen/src/core/codegen.ts` for orchestration logic
- Individual generators can be tested in isolation by checking their output
- Watch mode (`pnpm dev` then `npx api-codegen generate --watch`) helpful for iterating

## Adding New Codegen Packages

To add a new code generator (e.g., `@cushin/graphql-codegen`):

1. Create `packages/graphql-codegen/` with similar structure to `api-codegen`
2. Depend on `@cushin/cli` for CLI infrastructure
3. Implement custom `config/`, `core/`, and `generators/`
4. Create `src/cli.ts` that uses `setupCLIProgram()` and command setup functions
5. Add to `pnpm-workspace.yaml` (automatically picked up from `packages/*`)
6. Update root `package.json` scripts if needed

## Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `test:` Test changes
- `chore:` Build/tooling changes

Example: `feat: add watch mode for generate command`

## References

- **README.md**: User documentation with examples
- **QUICKSTART.md**: 5-minute getting started guide
- **CONTRIBUTING.md**: Detailed contribution guidelines
- **CHANGELOG.md**: Version history and changes
