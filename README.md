# @cushin/api-codegen

Type-safe API client generator for React/Next.js applications with automatic hooks and server actions generation.

## Features

- 🎯 **Type-Safe**: Full TypeScript support with Zod schema validation
- 🔄 **Auto-Generated**: Generate React Query hooks, Server Actions, and Server Queries
- 🚀 **Framework Agnostic**: Works with Vite, Next.js, and more
- 🔐 **Auth Built-in**: Token refresh, automatic retry with customizable callbacks
- 📦 **Zero Config**: Simple configuration with sensible defaults
- 🎨 **Customizable**: Custom templates and generation options

## Installation

```bash
npm install @cushin/api-codegen ky zod
# or
pnpm add @cushin/api-codegen ky zod
# or
yarn add @cushin/api-codegen ky zod
```

For React Query support (client-side):
```bash
npm install @tanstack/react-query
```

## Quick Start

### 1. Initialize Configuration

```bash
npx @cushin/api-codegen init --provider vite
# or for Next.js
npx @cushin/api-codegen init --provider nextjs
```

This creates `api-codegen.config.js`:

```js
/** @type {import('@cushin/api-codegen').UserConfig} */
export default {
  provider: 'vite',
  endpoints: './lib/api/config/endpoints.ts',
  output: './lib/api/generated',
  baseUrl: process.env.VITE_API_URL,
  generateHooks: true,
  generateClient: true,
};
```

### 2. Define Your API Endpoints

Create your endpoints configuration file:

```typescript
// lib/api/config/endpoints.ts
import { z } from 'zod';
import { defineConfig, defineEndpoint } from '@cushin/api-codegen';

// Define your schemas
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

const CreateUserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

// Define your endpoints
export const apiConfig = defineConfig({
  baseUrl: 'https://api.example.com',
  endpoints: {
    // GET request
    getUser: defineEndpoint({
      path: '/users/:id',
      method: 'GET',
      params: z.object({ id: z.string() }),
      response: UserSchema,
      tags: ['users', 'query'],
      description: 'Get user by ID',
    }),

    // GET with query params
    listUsers: defineEndpoint({
      path: '/users',
      method: 'GET',
      query: z.object({
        page: z.number().optional(),
        limit: z.number().optional(),
      }),
      response: z.array(UserSchema),
      tags: ['users', 'query'],
    }),

    // POST request
    createUser: defineEndpoint({
      path: '/users',
      method: 'POST',
      body: CreateUserSchema,
      response: UserSchema,
      tags: ['users', 'mutation'],
    }),

    // PUT request with params
    updateUser: defineEndpoint({
      path: '/users/:id',
      method: 'PUT',
      params: z.object({ id: z.string() }),
      body: CreateUserSchema,
      response: UserSchema,
      tags: ['users', 'mutation'],
    }),

    // DELETE request
    deleteUser: defineEndpoint({
      path: '/users/:id',
      method: 'DELETE',
      params: z.object({ id: z.string() }),
      response: z.object({ success: z.boolean() }),
      tags: ['users', 'mutation'],
    }),
  },
});
```

### 3. Generate Code

```bash
npx @cushin/api-codegen generate
```

This generates:
- `generated/types.ts` - Type definitions
- `generated/client.ts` - API client
- `generated/hooks.ts` - React Query hooks
- `generated/actions.ts` - Server Actions (Next.js only)
- `generated/queries.ts` - Server Queries (Next.js only)

### 4. Initialize Client (Vite)

```typescript
// lib/auth/provider.tsx
import { initializeAPIClient } from '@/lib/api/generated/client';

export function AuthProvider({ children }) {
  useEffect(() => {
    initializeAPIClient({
      getTokens: () => {
        const token = localStorage.getItem('access_token');
        return token ? { accessToken: token } : null;
      },
      setTokens: (tokens) => {
        localStorage.setItem('access_token', tokens.accessToken);
      },
      clearTokens: () => {
        localStorage.removeItem('access_token');
      },
      onAuthError: () => {
        router.push('/login');
      },
      onRefreshToken: async () => {
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });
        const data = await response.json();
        return data.accessToken;
      },
    });
  }, []);

  return <>{children}</>;
}
```

### 5. Use Generated Hooks

```typescript
// components/UserList.tsx
import { useListUsers, useCreateUser, useDeleteUser } from '@/lib/api/generated/hooks';

export function UserList() {
  // Query hook
  const { data: users, isLoading } = useListUsers({
    page: 1,
    limit: 10,
  });

  // Mutation hooks
  const createUser = useCreateUser({
    onSuccess: () => {
      console.log('User created!');
    },
  });

  const deleteUser = useDeleteUser();

  const handleCreate = () => {
    createUser.mutate({
      name: 'John Doe',
      email: 'john@example.com',
    });
  };

  const handleDelete = (id: string) => {
    deleteUser.mutate({ id });
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <button onClick={handleCreate}>Create User</button>
      {users?.map((user) => (
        <div key={user.id}>
          {user.name}
          <button onClick={() => handleDelete(user.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
```

## Next.js Usage

### Server Components

```typescript
// app/users/page.tsx
import { listUsersQuery } from '@/lib/api/generated/queries';

export default async function UsersPage() {
  const users = await listUsersQuery({ page: 1, limit: 10 });

  return (
    <div>
      {users.map((user) => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
}
```

### Server Actions

```typescript
// app/users/actions.ts
'use client';

import { createUserAction, deleteUserAction } from '@/lib/api/generated/actions';
import { useTransition } from 'react';

export function UserForm() {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (formData: FormData) => {
    startTransition(async () => {
      const result = await createUserAction({
        name: formData.get('name') as string,
        email: formData.get('email') as string,
      });

      if (result.success) {
        console.log('User created:', result.data);
      } else {
        console.error('Error:', result.error);
      }
    });
  };

  return <form action={handleSubmit}>...</form>;
}
```

## Configuration

### Full Configuration Options

```typescript
/** @type {import('@cushin/api-codegen').UserConfig} */
export default {
  // Required: Provider type
  provider: 'vite' | 'nextjs',

  // Required: Path to endpoints configuration
  endpoints: './lib/api/config/endpoints.ts',

  // Required: Output directory
  output: './lib/api/generated',

  // Optional: Base URL (can also be set at runtime)
  baseUrl: process.env.VITE_API_URL,

  // Optional: Generation flags
  generateHooks: true, // Generate React Query hooks
  generateClient: true, // Generate API client
  generateServerActions: true, // Next.js only
  generateServerQueries: true, // Next.js only

  // Optional: Advanced options
  options: {
    useClientDirective: true, // Add 'use client' to generated files
    hookPrefix: 'use', // Prefix for hook names (e.g., useGetUser)
    actionSuffix: 'Action', // Suffix for action names (e.g., createUserAction)
    customImports: {
      // Add custom imports to generated files
      hooks: ['import { customHook } from "./custom"'],
    },
  },
};
```

## CLI Commands

```bash
# Generate code from config
npx @cushin/api-codegen generate

# Generate with specific config file
npx @cushin/api-codegen generate --config ./custom.config.js

# Initialize new config
npx @cushin/api-codegen init --provider nextjs

# Validate configuration
npx @cushin/api-codegen validate
```

## Advanced Usage

### Custom Base URL per Endpoint

```typescript
defineEndpoint({
  path: '/auth/login',
  method: 'POST',
  baseUrl: 'https://auth.example.com', // Override base URL
  body: LoginSchema,
  response: TokenSchema,
});
```

### Multiple Endpoints Files

```typescript
// lib/api/config/modules/users.ts
export const userEndpoints = {
  getUser: defineEndpoint({ ... }),
  createUser: defineEndpoint({ ... }),
};

// lib/api/config/endpoints.ts
import { userEndpoints } from './modules/users';
import { productEndpoints } from './modules/products';

export const apiConfig = defineConfig({
  baseUrl: 'https://api.example.com',
  endpoints: {
    ...userEndpoints,
    ...productEndpoints,
  },
});
```

### Custom Auth Logic

```typescript
initializeAPIClient({
  getTokens: () => {
    // Custom token retrieval
    return yourAuthStore.getTokens();
  },
  setTokens: (tokens) => {
    // Custom token storage
    yourAuthStore.setTokens(tokens);
  },
  clearTokens: () => {
    // Custom cleanup
    yourAuthStore.clearTokens();
  },
  onRefreshToken: async () => {
    // Custom refresh logic
    const newToken = await yourRefreshFunction();
    return newToken;
  },
  onAuthError: () => {
    // Custom error handling
    yourRouter.push('/login');
  },
});
```

## Type Safety

All generated code is fully typed:

```typescript
// IntelliSense knows the exact shape
const { data } = useGetUser({ id: '123' });
//     ^? { id: string; name: string; email: string; }

// TypeScript will error on invalid params
const { data } = useGetUser({ id: 123 }); // ❌ Type error
const { data } = useGetUser({ wrongParam: '123' }); // ❌ Type error

// Mutation inputs are also typed
createUser.mutate({
  name: 'John',
  email: 'invalid', // ❌ Type error: invalid email format
});
```

## Best Practices

1. **Organize endpoints by feature/module**
2. **Use descriptive endpoint names**
3. **Add descriptions to endpoints for better documentation**
4. **Use tags for query invalidation**
5. **Define reusable schemas**
6. **Keep baseUrl in environment variables**

## Contributing

Contributions are welcome! Please read our contributing guide.

## License

MIT © Le Viet Hoang
