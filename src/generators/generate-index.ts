import fs from "fs/promises";
import path from "path";
import { BaseGenerator } from "./base.js";

export class ServerActionsGenerator extends BaseGenerator {
  async generate(): Promise<void> {
    const content = this.generateContent();
    const outputPath = path.join(this.context.config.outputDir, "actions.ts");

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, content, "utf-8");
  }

  private generateContent(): string {
    const outputPath = path.join(this.context.config.outputDir, "types.ts");
    const endpointsPath = path.join(this.context.config.endpointsPath);
    const relativePath = path
      .relative(path.dirname(outputPath), endpointsPath)
      .replace(/\\/g, "/");

    const content = `// Auto-generated exports
export * from './types';
export * from './client';
export * from './query-keys';
${this.hasQueryOptions() ? "export * from './query-options';" : ""}
export * from './hooks';
export * from './prefetchs';
export { z } from 'zod';
export { apiConfig } from '${relativePath}';
`;
    return content;
  }
}
