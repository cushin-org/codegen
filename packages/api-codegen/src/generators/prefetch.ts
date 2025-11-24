import fs from "fs/promises";
import path from "path";
import { BaseGenerator } from "./base.js";
import type { APIEndpoint } from "@cushin/api-runtime";

export class PrefetchGenerator extends BaseGenerator {
  async generate(): Promise<void> {
    const content = this.generateContent();
    const outputPath = path.join(this.context.config.outputDir, "prefetchs.ts");

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, content, "utf-8");
  }

  private generateContent(): string {
    const content = `// Auto-generated prefetch utilities
import { type QueryClient } from '@tanstack/react-query';
${this.hasQueryOptions() ? "import { apiQueryOptions } from './query-options';" : ""}
import { z } from 'zod';
import { apiConfig } from '../config/endpoints';

${this.generatePrefetchFunctions()}
`;
    return content;
  }

  private generatePrefetchFunctions(): string {
    const funcs: string[] = [];
    Object.entries(this.context.apiConfig.endpoints).forEach(
      ([name, endpoint]) => {
        if (endpoint.method === "GET")
          funcs.push(this.generatePrefetchFunction(name, endpoint));
      },
    );
    return funcs.join("\n\n");
  }

  private generatePrefetchFunction(
    name: string,
    endpoint: APIEndpoint,
  ): string {
    const prefetchName = `prefetch${this.capitalize(name)}`;
    const resource = this.getResourceFromEndpoint(name, endpoint);
    const optionName = this.getEndpointKeyName(name);
    const inferParams = this.inferNonNull(
      `typeof apiConfig.endpoints.${name}.params`,
    );
    const inferQuery = this.inferNonNull(
      `typeof apiConfig.endpoints.${name}.query`,
    );

    const params: string[] = ["queryClient: QueryClient"];
    const optionParams: string[] = [];

    if (endpoint.params) {
      params.push(`params: ${inferParams}`);
      optionParams.push("params");
    }
    if (endpoint.query) {
      params.push(`filters?: ${inferQuery}`);
      optionParams.push("filters");
    }

    return `export const ${prefetchName} = async (${params.join(",\n  ")}) => {
  return await queryClient.ensureQueryData(apiQueryOptions.${resource}.${optionName}(${optionParams.join(", ")}));
};`;
  }
}
