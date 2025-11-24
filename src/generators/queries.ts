import fs from "fs/promises";
import path from "path";
import { BaseGenerator } from "./base.js";
import type { APIEndpoint } from "../config/schema.js";

export class ServerQueriesGenerator extends BaseGenerator {
  async generate(): Promise<void> {
    const content = this.generateContent();
    const outputPath = path.join(this.context.config.outputDir, "queries.ts");

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, content, "utf-8");
  }

  private generateContent(): string {
    const imports = `import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { serverClient } from './server-client';
import type { 
  APIEndpoints, 
  ExtractParams, 
  ExtractQuery, 
  ExtractResponse 
} from './types';
`;

    const queries: string[] = [];

    Object.entries(this.context.apiConfig.endpoints).forEach(
      ([name, endpoint]) => {
        if (this.isQueryEndpoint(endpoint)) {
          queries.push(this.generateServerQuery(name, endpoint));
        }
      },
    );

    return imports + "\n" + queries.join("\n\n");
  }

  private generateServerQuery(name: string, endpoint: APIEndpoint): string {
    const queryName = `${name}Query`;
    const signature = this.getEndpointSignature(name, endpoint);
    const queryTags = this.getQueryTags(endpoint);

    const paramDef = signature.hasParams
      ? `params: ${signature.paramType}`
      : "";
    const queryDef = signature.hasQuery ? `query?: ${signature.queryType}` : "";
    const paramsList = [paramDef, queryDef].filter(Boolean).join(",\n  ");

    const clientCallArgs: string[] = [];
    if (signature.hasParams) clientCallArgs.push("params");
    if (signature.hasQuery) clientCallArgs.push("query");

    // Generate cache key based on params
    const cacheKeyParts: string[] = [`'${name}'`];
    if (signature.hasParams) cacheKeyParts.push("JSON.stringify(params)");
    if (signature.hasQuery) cacheKeyParts.push("JSON.stringify(query)");

    return `/**
 * ${endpoint.description || `Server query for ${name}`}
 * @tags ${queryTags.join(", ") || "none"}
 */
export const ${queryName} = cache(async (
  ${paramsList}
): Promise<${signature.responseType}> => {
  return unstable_cache(
    async () => serverClient.${name}(${clientCallArgs.join(", ")}),
    [${cacheKeyParts.join(", ")}],
    {
      tags: [${queryTags.map((tag) => `'${tag}'`).join(", ")}],
      revalidate: 3600, // 1 hour default, can be overridden
    }
  )();
});`;
  }
}
