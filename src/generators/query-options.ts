import fs from "fs/promises";
import path from "path";
import { BaseGenerator } from "./base.js";

export class QueryOptionsGenerator extends BaseGenerator {
  async generate(): Promise<void> {
    const content = this.generateContent();
    const outputPath = path.join(
      this.context.config.outputDir,
      "query-options.ts",
    );

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, content, "utf-8");
  }
  private generateContent(): string {
    const outputPath = path.join(this.context.config.outputDir, "types.ts");
    const endpointsPath = path.join(this.context.config.endpointsPath);
    const relativePath = path
      .relative(path.dirname(outputPath), endpointsPath)
      .replace(/\\/g, "/");
    const content = `// Auto-generated query options
import { queryOptions } from '@tanstack/react-query';
import { apiClient } from './client';
import { queryKeys } from './query-keys';
import { z } from 'zod';
import { apiConfig } from '${relativePath}';

${this.generateQueryOptionsContent()}

export const apiQueryOptions = {
${this.generateQueryOptionsExports()}
} as const;
`;

    return content;
  }

  private generateQueryOptionsContent(): string {
    const groups = this.groupEndpointsByResource();
    const options: string[] = [];

    Object.entries(groups).forEach(([resource, endpoints]) => {
      const queries = endpoints.filter(
        ({ endpoint }) => endpoint.method === "GET",
      );
      if (queries.length === 0) return;

      const resourceOptions: string[] = [];
      queries.forEach(({ name, endpoint }) => {
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
        let apiCall = "";

        if (endpoint.params && endpoint.query) {
          params.push(`params: ${inferParams}`, `filters?: ${inferQuery}`);
          apiCall = `apiClient.${name}(params, filters)`;
        } else if (endpoint.params) {
          params.push(`params: ${inferParams}`);
          apiCall = `apiClient.${name}(params)`;
        } else if (endpoint.query) {
          params.push(`filters?: ${inferQuery}`);
          apiCall = `apiClient.${name}(filters)`;
        } else {
          apiCall = `apiClient.${name}()`;
        }

        const keyCall = this.generateQueryKeyCall(resource, name, endpoint);

        resourceOptions.push(`  ${optionName}: (${params.join(", ")}) =>
    queryOptions({
      queryKey: ${keyCall},
      queryFn: (): Promise<${inferResponse}> => ${apiCall},
      staleTime: 1000 * 60 * 5,
    }),`);
      });

      options.push(
        `const ${resource}QueryOptions = {\n${resourceOptions.join("\n")}\n};\n`,
      );
    });

    return options.join("\n");
  }

  private generateQueryOptionsExports(): string {
    const groups = this.groupEndpointsByResource();
    const exports: string[] = [];

    Object.keys(groups).forEach((resource) => {
      const hasQueries = groups[resource].some(
        ({ endpoint }) => endpoint.method === "GET",
      );
      if (hasQueries) exports.push(`  ${resource}: ${resource}QueryOptions,`);
    });

    return exports.join("\n");
  }
}
