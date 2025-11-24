import ky, { HTTPError } from "ky";
import type { APIConfig, APIEndpoint } from "../config/schema.js";

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface AuthCallbacks {
  getTokens: () => Promise<AuthTokens | null>;
  onAuthError?: () => void;
  onRefreshToken?: () => Promise<void>;
}

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any,
  ) {
    super(message);
    this.name = "APIError";
  }
}

export class AuthError extends APIError {
  constructor(message: string = "Authentication failed") {
    super(message, 401);
    this.name = "AuthError";
  }
}

export class APIClient {
  private client: typeof ky;
  private isRefreshing = false;
  private refreshPromise: Promise<void> | null = null;
  private hooks: any;

  constructor(
    private config: APIConfig,
    private authCallbacks?: AuthCallbacks,
  ) {
    this.hooks = {
      beforeRequest: [
        async (request: Request) => {
          const tokens = await this.authCallbacks?.getTokens();
          if (tokens?.accessToken) {
            request.headers.set(
              "Authorization",
              `Bearer ${tokens.accessToken}`,
            );
          }
        },
      ],
      beforeRetry: [
        async ({ request, error, retryCount }: any) => {
          if (error instanceof HTTPError && error.response.status === 401) {
            if (retryCount === 1 && this.authCallbacks) {
              try {
                await this.refreshTokens();
                const tokens = await this.authCallbacks.getTokens();
                if (tokens?.accessToken) {
                  request.headers.set(
                    "Authorization",
                    `Bearer ${tokens.accessToken}`,
                  );
                }
              } catch (refreshError) {
                this.authCallbacks.onAuthError?.();
                throw new AuthError();
              }
            } else {
              this.authCallbacks?.onAuthError?.();
              throw new AuthError();
            }
          }
        },
      ],
      beforeError: [
        async (error: any) => {
          const { response } = error;
          if (response?.body) {
            try {
              const body = await response.json();
              error.message =
                (body as Error).message || `HTTP ${response.status}`;
            } catch {
              // Keep original message
            }
          }
          return error;
        },
      ],
    };

    this.client = ky.create({
      prefixUrl: this.config.baseUrl,
      headers: {
        "Content-Type": "application/json",
      },
      retry: {
        limit: 2,
        methods: ["get", "post", "put", "delete", "patch"],
        statusCodes: [401],
      },
      hooks: this.hooks,
    });
  }

  private async refreshTokens(): Promise<void> {
    if (!this.authCallbacks) {
      throw new AuthError("No auth callbacks provided");
    }

    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;

    this.refreshPromise = (async () => {
      try {
        if (this.authCallbacks?.onRefreshToken) {
          await this.authCallbacks.onRefreshToken();
        } else {
          throw new AuthError("No refresh token handler provided");
        }
      } catch (error) {
        throw error;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private buildPath(path: string, params?: Record<string, any>): string {
    if (!params) return path;

    let finalPath = path;
    Object.entries(params).forEach(([key, value]) => {
      finalPath = finalPath.replace(
        `:${key}`,
        encodeURIComponent(String(value)),
      );
    });

    return finalPath;
  }

  private getEndpointBaseUrl(endpoint: APIEndpoint): string {
    return endpoint.baseUrl || this.config.baseUrl!;
  }

  private getClientForEndpoint(endpoint: APIEndpoint): typeof ky {
    const endpointBaseUrl = this.getEndpointBaseUrl(endpoint);

    if (endpointBaseUrl === this.config.baseUrl) {
      return this.client;
    }

    return ky.create({
      prefixUrl: endpointBaseUrl,
      headers: {
        "Content-Type": "application/json",
      },
      retry: {
        limit: 2,
        methods: ["get", "post", "put", "delete", "patch"],
        statusCodes: [401],
      },
      hooks: this.hooks,
    });
  }

  async request<T>(
    endpoint: APIEndpoint,
    params?: Record<string, any>,
    query?: Record<string, any>,
    body?: any,
  ): Promise<T> {
    try {
      const path = this.buildPath(endpoint.path, params);
      const client = this.getClientForEndpoint(endpoint);

      const options: Record<string, any> = {
        method: endpoint.method,
      };

      if (query && Object.keys(query).length > 0) {
        const searchParams = new URLSearchParams();
        Object.entries(query).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, String(value));
          }
        });
        if (searchParams.toString()) {
          options.searchParams = searchParams;
        }
      }

      if (body && endpoint.method !== "GET") {
        if (endpoint.body) {
          const validatedBody = endpoint.body.parse(body);
          options.json = validatedBody;
        } else {
          options.json = body;
        }
      }

      const response = await client(path, options);
      const data = await response.json();

      if (endpoint.response) {
        return endpoint.response.parse(data);
      }

      return data as T;
    } catch (error) {
      if (error instanceof HTTPError) {
        const errorData = await error.response.json().catch(() => ({}));
        throw new APIError(
          errorData.message || error.message,
          error.response.status,
          errorData,
        );
      }

      if (error instanceof AuthError) {
        throw error;
      }

      throw new APIError(
        error instanceof Error ? error.message : "Network error",
        0,
      );
    }
  }

  updateAuthCallbacks(authCallbacks: AuthCallbacks) {
    this.authCallbacks = authCallbacks;
  }

  async refreshAuth(): Promise<void> {
    if (!this.authCallbacks) {
      throw new AuthError("No auth callbacks provided");
    }
    await this.refreshTokens();
  }

  generateMethods() {
    const methods: any = {};

    Object.entries(this.config.endpoints).forEach(([name, endpoint]) => {
      if (endpoint.method === "GET") {
        if (endpoint.params && endpoint.query) {
          methods[name] = (params: any, query?: any): Promise<any> => {
            return this.request(endpoint, params, query);
          };
        } else if (endpoint.params) {
          methods[name] = (params: any): Promise<any> => {
            return this.request(endpoint, params);
          };
        } else if (endpoint.query) {
          methods[name] = (query?: any): Promise<any> => {
            return this.request(endpoint, undefined, query);
          };
        } else {
          methods[name] = (): Promise<any> => {
            return this.request(endpoint);
          };
        }
      } else {
        if (endpoint.params && endpoint.body) {
          methods[name] = (params: any, body: any): Promise<any> => {
            return this.request(endpoint, params, undefined, body);
          };
        } else if (endpoint.params) {
          methods[name] = (params: any): Promise<any> => {
            return this.request(endpoint, params);
          };
        } else if (endpoint.body) {
          methods[name] = (body: any): Promise<any> => {
            return this.request(endpoint, undefined, undefined, body);
          };
        } else {
          methods[name] = (): Promise<any> => {
            return this.request(endpoint);
          };
        }
      }
    });

    return methods;
  }
}

export function createAPIClient(
  config: APIConfig,
  authCallbacks?: AuthCallbacks,
) {
  const instance = new APIClient(config, authCallbacks);
  const methods = instance.generateMethods();

  return {
    ...methods,
    refreshAuth: () => instance.refreshAuth(),
    updateAuthCallbacks: (newCallbacks: AuthCallbacks) =>
      instance.updateAuthCallbacks(newCallbacks),
  };
}
