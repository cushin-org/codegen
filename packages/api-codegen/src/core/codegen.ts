import { createJiti } from "jiti";
import type { APIConfig } from "@cushin/api-runtime";
import type { ResolvedConfig } from "../config/index.js";
import { CodeGenerator } from "../generators/index.js";
import { fileURLToPath } from "url";

export class CodegenCore {
  constructor(private config: ResolvedConfig) {}

  async execute(): Promise<void> {
    // Load API configuration
    const apiConfig = await this.loadAPIConfig();

    // Store in config for generators
    this.config.apiConfig = apiConfig;

    // Generate code
    const generator = new CodeGenerator({
      config: this.config,
      apiConfig,
    });

    await generator.generate();
  }

  private async loadAPIConfig(): Promise<APIConfig> {
    try {
      // Use jiti to load TypeScript files
      const jiti = createJiti(fileURLToPath(import.meta.url), {
        interopDefault: true,
      });

      const module = (await jiti.import(this.config.endpointsPath)) as any;

      // Try different export patterns
      const apiConfig =
        module.apiConfig ||
        module.default?.apiConfig ||
        module.default ||
        module;

      if (!apiConfig || !apiConfig.endpoints) {
        throw new Error(
          'Invalid API config: must export an object with "endpoints" property',
        );
      }

      return apiConfig;
    } catch (error) {
      throw new Error(
        `Failed to load endpoints from "${this.config.endpointsPath}": ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
