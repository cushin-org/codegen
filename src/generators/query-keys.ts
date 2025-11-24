import fs from "fs/promises";
import path from "path";
import { BaseGenerator } from "./base.js";

export class QueryKeysGenerator extends BaseGenerator {
  async generate(): Promise<void> {
    const content = this.generateContent();
    const outputPath = path.join(
      this.context.config.outputDir,
      "query-keys.ts",
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
    const content = `// Auto-generated query keys
import { z } from 'zod';
import { apiConfig } from '${relativePath}';

export const queryKeys = {
${this.generateQueryKeysContent()}
} as const;
`;
    return content;
  }

  private generateQueryKeysContent(): string {
    const resourceGroups = this.groupEndpointsByResource();
    const keys: string[] = [];

    Object.entries(resourceGroups).forEach(([resource, endpoints]) => {
      const queryEndpoints = endpoints.filter(
        ({ endpoint }) => endpoint.method === "GET",
      );
      if (queryEndpoints.length === 0) return;

      const resourceKeys: string[] = [`    all: ['${resource}'] as const,`];
      const added = new Set<string>();

      queryEndpoints.forEach(({ name, endpoint }) => {
        const keyName = this.getEndpointKeyName(name);
        if (added.has(keyName)) return;
        const inferParams = this.inferNonNull(
          `typeof apiConfig.endpoints.${name}.params`,
        );
        const inferQuery = this.inferNonNull(
          `typeof apiConfig.endpoints.${name}.query`,
        );

        if (endpoint.params || endpoint.query) {
          const params: string[] = [];
          if (endpoint.params) params.push(`params?: ${inferParams}`);
          if (endpoint.query) params.push(`query?: ${inferQuery}`);

          resourceKeys.push(`    ${keyName}: (${params.join(", ")}) =>
      ['${resource}', '${keyName}', ${endpoint.params ? "params" : "undefined"}, ${endpoint.query ? "query" : "undefined"}] as const,`);
        } else {
          resourceKeys.push(
            `    ${keyName}: () => ['${resource}', '${keyName}'] as const,`,
          );
        }
        added.add(keyName);
      });

      keys.push(`  ${resource}: {\n${resourceKeys.join("\n")}\n  },`);
    });

    return keys.join("\n");
  }
}
