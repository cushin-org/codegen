import fs from "fs/promises";
import path from "path";
import { BaseGenerator } from "./base.js";
import type { APIEndpoint } from "@cushin/api-runtime";

export class HooksGenerator extends BaseGenerator {
  async generate(): Promise<void> {
    const content = this.generateContent();
    const outputPath = path.join(this.context.config.outputDir, "hooks.ts");

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, content, "utf-8");
  }

  private generateContent(): string {
    const useClientDirective =
      this.context.config.options?.useClientDirective ?? true;
    const outputPath = path.join(this.context.config.outputDir, "types.ts");
    const endpointsPath = path.join(this.context.config.endpointsPath);
    const relativePath = path
      .relative(path.dirname(outputPath), endpointsPath)
      .replace(/\\/g, "/");

    const content = `${useClientDirective ? "'use client';\n" : ""}
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import { queryKeys } from "./query-keys";
import { apiQueryOptions } from "./query-options";
import { z } from "zod";
import { apiConfig } from "${relativePath}";

${this.generateQueryHooks()}
${this.generateMutationHooks()}
`;

    return content;
  }

  private generateQueryHooks(): string {
    const hooks: string[] = [];
    Object.entries(this.context.apiConfig.endpoints).forEach(
      ([name, endpoint]) => {
        if (endpoint.method === "GET")
          hooks.push(this.generateQueryHook(name, endpoint));
      },
    );
    return hooks.join("\n\n");
  }

  private generateQueryHook(name: string, endpoint: APIEndpoint): string {
    const hookName = `use${this.capitalize(name)}`;
    const resource = this.getResourceFromEndpoint(name, endpoint);
    const optionName = this.getEndpointKeyName(name);
    const inferParams = this.inferNonNull(
      `typeof apiConfig.endpoints.${name}.params`,
    );
    const inferQuery = this.inferNonNull(
      `typeof apiConfig.endpoints.${name}.query`,
    );
    const inferResponse = this.inferNonNull(
      `typeof apiConfig.endpoints.${name}.response`,
    );

    const params: string[] = [];
    const optionParams: string[] = [];

    const queryTags = this.getQueryTags(endpoint);

    if (endpoint.params) {
      params.push(`params: ${inferParams}`);
      optionParams.push("params");
    }
    if (endpoint.query) {
      params.push(`filters?: ${inferQuery}`);
      optionParams.push("filters");
    }

    params.push(`options?: {
    enabled?: boolean;
    select?: <TData = ${inferResponse}>(data: ${inferResponse}) => TData;
  }`);

    return `/**
 * ${endpoint.description || `Query hook for ${name}`}
 * @tags ${queryTags.join(", ") || "none"}
 */
export function ${hookName}(${params.join(",\n  ")}) {
  return useQuery({
    ...apiQueryOptions.${resource}.${optionName}(${optionParams.join(", ")}),
    ...options,
  });
}`;
  }

  private generateMutationHooks(): string {
    const hooks: string[] = [];
    Object.entries(this.context.apiConfig.endpoints).forEach(
      ([name, endpoint]) => {
        if (endpoint.method !== "GET")
          hooks.push(this.generateMutationHook(name, endpoint));
      },
    );
    return hooks.join("\n\n");
  }

  private generateMutationHook(name: string, endpoint: APIEndpoint): string {
    const hookName = `use${this.capitalize(name)}`;
    const resource = this.getResourceFromEndpoint(name, endpoint);
    const inferParams = this.inferNonNull(
      `typeof apiConfig.endpoints.${name}.params`,
    );
    const inferBody = this.inferNonNull(
      `typeof apiConfig.endpoints.${name}.body`,
    );
    const inferResponse = this.inferNonNull(
      `typeof apiConfig.endpoints.${name}.response`,
    );

    const resourceHasQueries = this.resourceHasQueryEndpoints(resource);

    let inputType: string;
    let fnBody: string;

    if (endpoint.params && endpoint.body) {
      inputType = `{ params: ${inferParams}; body: ${inferBody}; }`;
      fnBody = `({ params, body }: ${inputType}) => apiClient.${name}(params, body)`;
    } else if (endpoint.params) {
      inputType = `${inferParams}`;
      fnBody = `(params: ${inputType}) => apiClient.${name}(params)`;
    } else if (endpoint.body) {
      inputType = `${inferBody}`;
      fnBody = `(body: ${inputType}) => apiClient.${name}(body)`;
    } else {
      inputType = "void";
      fnBody = `() => apiClient.${name}()`;
    }

    const invalidate = resourceHasQueries
      ? `queryClient.invalidateQueries({ queryKey: queryKeys.${resource}.all });`
      : "";

    return `/**
 * ${endpoint.description || `Mutation hook for ${name}`}
 * @tags ${endpoint.tags?.join(", ") || "none"}
 */
    export function ${hookName}(options?: {
      onSuccess?: (data: ${inferResponse}, variables: ${inputType}, context: unknown) => void;
      onError?: (error: Error, variables: ${inputType}, context: unknown) => void;
      onSettled?: (data: ${inferResponse} | undefined, error: Error | null, variables: ${inputType}, context: unknown) => void;
      onMutate?: (variables: ${inputType}) => Promise<unknown> | unknown;
    }) {
      ${invalidate ? "const queryClient = useQueryClient();" : ""}
      return useMutation({
	mutationFn: ${fnBody},
	onSuccess: (data, variables, context) => {
	  ${invalidate}
	  options?.onSuccess?.(data, variables, context);
	},
	onError: options?.onError,
	onSettled: options?.onSettled,
	onMutate: options?.onMutate,
      });
    }`;
  }
}
