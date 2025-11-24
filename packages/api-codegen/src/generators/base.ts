import type { APIConfig, APIEndpoint } from "@cushin/api-runtime";
import type { ResolvedConfig } from "../config/index.js";

export interface GeneratorContext {
  config: ResolvedConfig;
  apiConfig: APIConfig;
}

export abstract class BaseGenerator {
  constructor(protected context: GeneratorContext) {}

  abstract generate(): Promise<void>;

  protected isQueryEndpoint(endpoint: APIEndpoint): boolean {
    return endpoint.method === "GET";
  }

  protected isMutationEndpoint(endpoint: APIEndpoint): boolean {
    return !this.isQueryEndpoint(endpoint);
  }

  protected capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  protected getQueryTags(endpoint: APIEndpoint): string[] {
    return endpoint.tags || [];
  }

  protected getInvalidationTags(endpoint: APIEndpoint): string[] {
    const tags = endpoint.tags || [];
    return tags.filter((tag) => tag !== "query" && tag !== "mutation");
  }

  protected hasParams(endpoint: APIEndpoint): boolean {
    return !!endpoint.params;
  }

  protected hasQuery(endpoint: APIEndpoint): boolean {
    return !!endpoint.query;
  }

  protected hasBody(endpoint: APIEndpoint): boolean {
    return !!endpoint.body;
  }

  protected getEndpointSignature(
    name: string,
    endpoint: APIEndpoint,
  ): {
    hasParams: boolean;
    hasQuery: boolean;
    hasBody: boolean;
    paramType: string;
    queryType: string;
    bodyType: string;
    responseType: string;
  } {
    const hasParams = this.hasParams(endpoint);
    const hasQuery = this.hasQuery(endpoint);
    const hasBody = this.hasBody(endpoint);

    return {
      hasParams,
      hasQuery,
      hasBody,
      paramType: hasParams ? `ExtractParams<APIEndpoints['${name}']>` : "never",
      queryType: hasQuery ? `ExtractQuery<APIEndpoints['${name}']>` : "never",
      bodyType: hasBody ? `ExtractBody<APIEndpoints['${name}']>` : "never",
      responseType: `ExtractResponse<APIEndpoints['${name}']>`,
    };
  }

  protected generateMutationCall(
    name: string,
    hasParams: boolean,
    hasBody: boolean,
  ): string {
    if (hasParams && hasBody) {
      return `return apiClient.${name}(input.params, input.body);`;
    } else if (hasParams) {
      return `return apiClient.${name}(input);`;
    } else if (hasBody) {
      return `return apiClient.${name}(input);`;
    } else {
      return `return apiClient.${name}();`;
    }
  }

  protected inferNonNull(expr: string): string {
    return `z.infer<NonNullable<${expr}>>`;
  }

  protected toCamelCase(str: string): string {
    return str
      .toLowerCase()
      .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""))
      .replace(/^./, (c) => c.toLowerCase());
  }

  protected getResourceFromEndpoint(
    _name: string,
    endpoint: APIEndpoint,
  ): string {
    const tag = endpoint.tags?.find((t) => t !== "query" && t !== "mutation");
    if (tag) return this.toCamelCase(tag);
    const match = endpoint.path.match(/^\/([^/]+)/);
    return match ? this.toCamelCase(match[1]) : "general";
  }

  protected groupEndpointsByResource() {
    const groups: Record<
      string,
      Array<{ name: string; endpoint: APIEndpoint }>
    > = {};
    Object.entries(this.context.apiConfig.endpoints).forEach(
      ([name, endpoint]) => {
        const res = this.getResourceFromEndpoint(name, endpoint);
        if (!groups[res]) groups[res] = [];
        groups[res].push({ name, endpoint });
      },
    );
    return groups;
  }

  protected resourceHasQueryEndpoints(resource: string): boolean {
    return (
      this.groupEndpointsByResource()[resource]?.some(
        ({ endpoint }) => endpoint.method === "GET",
      ) ?? false
    );
  }

  protected getEndpointKeyName(name: string): string {
    return name.startsWith("get")
      ? name[3].toLowerCase() + name.slice(4)
      : name;
  }

  protected generateQueryKeyCall(
    resource: string,
    name: string,
    endpoint: APIEndpoint,
  ): string {
    const key = this.getEndpointKeyName(name);
    const args: string[] = [];
    if (endpoint.params) args.push("params");
    if (endpoint.query) args.push("filters");
    return args.length
      ? `queryKeys.${resource}.${key}(${args.join(", ")})`
      : `queryKeys.${resource}.${key}()`;
  }

  protected hasQueryOptions() {
    return Object.values(this.context.apiConfig.endpoints).some(
      (e) => e.method === "GET",
    );
  }
}
