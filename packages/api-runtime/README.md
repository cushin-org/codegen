# @cushin/api-runtime

Runtime utilities for Cushin API codegen - provides type-safe HTTP client and schema helpers that can be used in both browser and Node.js environments.

## Features

- 🌐 **Browser-compatible** - No Node.js dependencies, works in any JavaScript environment
- 🔐 **Built-in auth** - Token management with automatic refresh
- 📝 **Type-safe** - Full TypeScript support with Zod schema validation
- 🎯 **Lightweight** - Minimal bundle size, only depends on `ky` and `zod`

## Installation

```bash
npm install @cushin/api-runtime ky zod
```

## Usage

### Define your API configuration

```typescript
import { defineConfig, defineEndpoint } from "@cushin/api-runtime";
import { z } from "zod";

export const apiConfig = defineConfig({
  baseUrl: "https://api.example.com",
  endpoints: {
    getUser: defineEndpoint({
      path: "/users/:id",
      method: "GET",
      params: z.object({ id: z.string() }),
      response: z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
      }),
    }),
  },
});
```

### Create API client

```typescript
import { createAPIClient } from "@cushin/api-runtime";
import { apiConfig } from "./api-config";

const client = createAPIClient(apiConfig, {
  getTokens: async () => ({
    accessToken: localStorage.getItem("token") || "",
  }),
  onAuthError: () => {
    // Redirect to login
  },
  onRefreshToken: async () => {
    // Refresh your token
  },
});

// Use the client
const user = await client.getUser({ id: "123" });
```

## Key Components

### `createAPIClient(config, authCallbacks?)`

Creates a type-safe API client with automatic token injection and refresh.

### `defineConfig(config)`

Helper function to define your API configuration with type inference.

### `defineEndpoint(config)`

Helper function to define individual endpoints with full type safety.

## Why separate from @cushin/api-codegen?

The runtime code needs to be imported by your web application, while the code generation tools (`@cushin/api-codegen`) contain Node.js-specific code (file system, path manipulation, etc.) that cannot be bundled for the browser.

By separating the runtime into its own package:
- ✅ Your web app can import runtime code without bundling Node.js dependencies
- ✅ Smaller bundle size for your application
- ✅ Clear separation of concerns

## Related Packages

- **[@cushin/api-codegen](../api-codegen)** - CLI tool to generate type-safe API clients
- **[@cushin/codegen-cli](../cli)** - Shared CLI utilities

## License

MIT
