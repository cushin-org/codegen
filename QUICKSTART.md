# Quick Start Guide

Get started with `@cushin/api-codegen` in 5 minutes!

## Installation

```bash
npm install @cushin/api-codegen ky zod @tanstack/react-query
```

## Step 1: Initialize Config

```bash
npx @cushin/api-codegen init --provider vite
```

This creates `api-codegen.config.js`:

```js
export default {
  provider: 'vite',
  endpoints: './lib/api/config/endpoints.ts',
  output: './lib/api/generated',
  baseUrl: process.env.VITE_API_URL,
  generateHooks: true,
  generateClient: true,
};
```

## Step 2: Define Endpoints

Create `lib/api/config/endpoints.ts`:

```typescript
import { z } from 'zod';
import { defineConfig, defineEndpoint } from '@cushin/api-codegen';

const TodoSchema = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean(),
});

export const apiConfig = defineConfig({
  baseUrl: 'https://api.example.com',
  endpoints: {
    // GET /todos
    listTodos: defineEndpoint({
      path: '/todos',
      method: 'GET',
      response: z.array(TodoSchema),
      tags: ['todos'],
    }),

    // POST /todos
    createTodo: defineEndpoint({
      path: '/todos',
      method: 'POST',
      body: z.object({
        title: z.string(),
        completed: z.boolean().default(false),
      }),
      response: TodoSchema,
      tags: ['todos'],
    }),
  },
});
```

## Step 3: Generate Code

```bash
npx @cushin/api-codegen generate
```

This creates:
- ✅ `lib/api/generated/types.ts`
- ✅ `lib/api/generated/client.ts`
- ✅ `lib/api/generated/hooks.ts`

## Step 4: Setup Client

In your app entry point or auth provider:

```typescript
// src/main.tsx or src/App.tsx
import { initializeAPIClient } from '@/lib/api/generated/client';

// Initialize once on app startup
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
    window.location.href = '/login';
  },
  onRefreshToken: async () => {
    // Your refresh logic here
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    const data = await response.json();
    return data.accessToken;
  },
});
```

## Step 5: Use in Components

```typescript
import { useListTodos, useCreateTodo } from '@/lib/api/generated/hooks';

export function TodoList() {
  // Query
  const { data: todos, isLoading } = useListTodos();

  // Mutation
  const createTodo = useCreateTodo();

  const handleCreate = () => {
    createTodo.mutate({
      title: 'New Todo',
      completed: false,
    });
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <button onClick={handleCreate}>Add Todo</button>
      {todos?.map((todo) => (
        <div key={todo.id}>{todo.title}</div>
      ))}
    </div>
  );
}
```

## That's it! 🎉

You now have:
- ✅ Type-safe API calls
- ✅ Automatic React Query hooks
- ✅ Token refresh handling
- ✅ Auto-generated documentation from your schemas

## Next Steps

- [Read full documentation](./README.md)
- [See more examples](./examples/)
- [Learn about advanced features](./README.md#advanced-usage)

## Common Issues

### "Cannot find module '@cushin/api-codegen'"

Make sure you've installed the package:
```bash
npm install @cushin/api-codegen
```

### Generated files not found

Run the generate command:
```bash
npx @cushin/api-codegen generate
```

### TypeScript errors in generated files

Make sure you have `zod` and `ky` installed:
```bash
npm install ky zod
```

### API calls not authenticated

Make sure you've called `initializeAPIClient()` before making any API calls.
