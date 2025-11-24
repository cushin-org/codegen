import fs from "fs/promises";
import path from "path";
import { BaseGenerator } from "./base.js";

export class SchemaGenerator extends BaseGenerator {
  async generate(): Promise<void> {
    const content = this.generateContent();
    const outputPath = path.join(this.context.config.outputDir, "schema.ts");

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, content, "utf-8");
  }

  private generateContent(): string {
    const content = `// Auto-generated schema definitions

import type { z } from 'zod';

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface APIEndpoint {
  path: string;
  method: HTTPMethod;
  baseUrl?: string;
  params?: z.ZodType<any>;
  query?: z.ZodType<any>;
  body?: z.ZodType<any>;
  response: z.ZodType<any>;
  tags?: string[];
  description?: string;
}

export interface APIConfig {
  baseUrl?: string;
  endpoints: Record<string, APIEndpoint>;
}

export type EndpointConfig<
  TPath extends string = string,
  TMethod extends HTTPMethod = HTTPMethod,
  TParams = undefined,
  TQuery = undefined,
  TBody = undefined,
  TResponse = any,
> = {
  path: TPath;
  method: TMethod;
  baseUrl?: string;
  params?: z.ZodType<TParams>;
  query?: z.ZodType<TQuery>;
  body?: z.ZodType<TBody>;
  response: z.ZodType<TResponse>;
  tags?: string[];
  description?: string;
};

/**
 * Helper function to define API configuration with type safety
 */
export function defineConfig<T extends APIConfig>(config: T): T {
  return config;
}

/**
 * Helper function to define a single endpoint with type inference
 */
export function defineEndpoint<
  TPath extends string,
  TMethod extends HTTPMethod,
  TParams = undefined,
  TQuery = undefined,
  TBody = undefined,
  TResponse = any,
>(
  config: EndpointConfig<TPath, TMethod, TParams, TQuery, TBody, TResponse>,
): EndpointConfig<TPath, TMethod, TParams, TQuery, TBody, TResponse> {
  return config;
}

/**
 * Helper to define multiple endpoints
 */
export function defineEndpoints<
  T extends Record<string, APIEndpoint>,
>(endpoints: T): T {
  return endpoints;
}
  }
  `;
    return content;
  }
}
