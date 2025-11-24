import fs from 'fs/promises';
import path from 'path';
import { BaseGenerator } from './base.js';

export class ClientGenerator extends BaseGenerator {
  async generate(): Promise<void> {
    await this.generateClientFile();
    
    if (this.context.config.provider === 'nextjs') {
      await this.generateServerClientFile();
    }
  }

  private async generateClientFile(): Promise<void> {
    const content = this.generateClientContent();
    const outputPath = path.join(this.context.config.outputDir, 'client.ts');

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, content, 'utf-8');
  }

  private async generateServerClientFile(): Promise<void> {
    const content = this.generateServerClientContent();
    const outputPath = path.join(this.context.config.outputDir, 'server-client.ts');

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, content, 'utf-8');
  }

  private generateClientContent(): string {
    const useClientDirective = this.context.config.options?.useClientDirective ?? true;
    const outputPath = path.join(this.context.config.outputDir, 'types.ts');
    const endpointsPath = path.join(this.context.config.endpointsPath);
    const relativePath = path.relative(path.dirname(outputPath), endpointsPath).replace(/\\/g, '/');
    
    return `${useClientDirective ? "'use client';\n" : ''}
import { createAPIClient } from '@cushin/api-codegen/client';
import type { AuthCallbacks } from '@cushin/api-codegen/client';
import { apiConfig } from '${relativePath}';
import type { APIEndpoints } from './types';
import { z } from 'zod';

// Type-safe API client methods
type APIClientMethods = {
  [K in keyof APIEndpoints]: APIEndpoints[K] extends {
    method: infer M;
    params?: infer P;
    query?: infer Q;
    body?: infer B;
    response: infer R;
  }
    ? M extends 'GET'
      ? P extends { _type: any }
        ? Q extends { _type: any }
          ? (params: P['_type'], query?: Q['_type']) => Promise<R['_type']>
          : (params: P['_type']) => Promise<R['_type']>
        : Q extends { _type: any }
          ? (query?: Q['_type']) => Promise<R['_type']>
          : () => Promise<R['_type']>
      : P extends { _type: any }
        ? B extends { _type: any }
          ? (params: P['_type'], body: B['_type']) => Promise<R['_type']>
          : (params: P['_type']) => Promise<R['_type']>
        : B extends { _type: any }
          ? (body: B['_type']) => Promise<R['_type']>
          : () => Promise<R['_type']>
    : never;
};

// Export singleton instance (will be initialized later)
export let baseClient: APIClientMethods & {
  refreshAuth: () => Promise<void>;
  updateAuthCallbacks: (callbacks: AuthCallbacks) => void;
};

export const apiClient = {
${this.generateApiClientMethods()}
};

/**
 * Initialize API client with auth callbacks
 * Call this function in your auth provider setup
 * 
 * @example
 * const authCallbacks = {
 *   getTokens: () => getStoredTokens(),
 *   setTokens: (tokens) => storeTokens(tokens),
 *   clearTokens: () => clearStoredTokens(),
 *   onAuthError: () => router.push('/login'),
 *   onRefreshToken: async () => {
 *     const newToken = await refreshAccessToken();
 *     return newToken;
 *   },
 * };
 * 
 * initializeAPIClient(authCallbacks);
 */
export const initializeAPIClient = (authCallbacks: AuthCallbacks) => {
  baseClient = createAPIClient(apiConfig, authCallbacks) as any;
  return baseClient;
};

// Export for custom usage
export { createAPIClient };
export type { AuthCallbacks };
`;
  }

  private generateServerClientContent(): string {
    return `import { createAPIClient } from '@cushin/api-codegen/client';
import { apiConfig } from '../config/endpoints';
import type { APIEndpoints } from './types';

// Type-safe API client methods for server-side
type APIClientMethods = {
  [K in keyof APIEndpoints]: APIEndpoints[K] extends {
    method: infer M;
    params?: infer P;
    query?: infer Q;
    body?: infer B;
    response: infer R;
  }
    ? M extends 'GET'
      ? P extends { _type: any }
        ? Q extends { _type: any }
          ? (params: P['_type'], query?: Q['_type']) => Promise<R['_type']>
          : (params: P['_type']) => Promise<R['_type']>
        : Q extends { _type: any }
          ? (query?: Q['_type']) => Promise<R['_type']>
          : () => Promise<R['_type']>
      : P extends { _type: any }
        ? B extends { _type: any }
          ? (params: P['_type'], body: B['_type']) => Promise<R['_type']>
          : (params: P['_type']) => Promise<R['_type']>
        : B extends { _type: any }
          ? (body: B['_type']) => Promise<R['_type']>
          : () => Promise<R['_type']>
    : never;
};

/**
 * Server-side API client (no auth, direct API calls)
 * Use this in Server Components, Server Actions, and Route Handlers
 */
export const serverClient = createAPIClient(apiConfig) as APIClientMethods;
`;
  }

  private generateApiClientMethods(): string {
    const methods: string[] = [];

    Object.entries(this.context.apiConfig.endpoints).forEach(([name, endpoint]) => {
      const inferParams = this.inferNonNull(
        `typeof apiConfig.endpoints.${name}.params`,
      );
      const inferQuery = this.inferNonNull(
        `typeof apiConfig.endpoints.${name}.query`,
      );
      const inferBody = this.inferNonNull(
        `typeof apiConfig.endpoints.${name}.body`,
      );
      const inferResponse = this.inferNonNull(
        `typeof apiConfig.endpoints.${name}.response`,
      );

      if (endpoint.method === "GET") {
        if (endpoint.params && endpoint.query) {
          methods.push(`  ${name}: (params: ${inferParams}, query?: ${inferQuery}): Promise<${inferResponse}> => 
    (baseClient as any).${name}(params, query),`);
        } else if (endpoint.params) {
          methods.push(`  ${name}: (params: ${inferParams}): Promise<${inferResponse}> => 
    (baseClient as any).${name}(params),`);
        } else if (endpoint.query) {
          methods.push(`  ${name}: (query?: ${inferQuery}): Promise<${inferResponse}> => 
    (baseClient as any).${name}(query),`);
        } else {
          methods.push(`  ${name}: (): Promise<${inferResponse}> => 
    (baseClient as any).${name}(),`);
        }
      } else {
        if (endpoint.params && endpoint.body) {
          methods.push(`  ${name}: (params: ${inferParams}, body: ${inferBody}): Promise<${inferResponse}> => 
    (baseClient as any).${name}(params, body),`);
        } else if (endpoint.params) {
          methods.push(`  ${name}: (params: ${inferParams}): Promise<${inferResponse}> => 
    (baseClient as any).${name}(params),`);
        } else if (endpoint.body) {
          methods.push(`  ${name}: (body: ${inferBody}): Promise<${inferResponse}> => 
    (baseClient as any).${name}(body),`);
        } else {
          methods.push(`  ${name}: (): Promise<${inferResponse}> => 
    (baseClient as any).${name}(),`);
        }
      }
    });

    return methods.join("\n");
  }

}
