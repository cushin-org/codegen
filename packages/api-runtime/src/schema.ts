import type { z } from "zod";

export type HTTPMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

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
export function defineEndpoints<T extends Record<string, APIEndpoint>>(
  endpoints: T,
): T {
  return endpoints;
}
