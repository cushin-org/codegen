import { cosmiconfig } from "cosmiconfig";
import path from "path";
import type { APIConfig } from "@cushin/api-runtime";

export interface UserConfig {
  /**
   * Base URL for API requests
   */
  baseUrl?: string;

  /**
   * Path to the endpoints configuration file
   */
  endpoints: string;

  /**
   * Provider type: 'vite' | 'nextjs'
   */
  provider: "vite" | "nextjs";

  /**
   * Output directory for generated files
   */
  output: string;

  /**
   * Whether to generate React Query hooks (for client-side)
   * @default true for vite, nextjs
   */
  generateHooks?: boolean;

  /**
   * Whether to generate server actions (Next.js only)
   * @default true for nextjs, false for vite
   */
  generateServerActions?: boolean;

  /**
   * Whether to generate server queries (Next.js only)
   * @default true for nextjs, false for vite
   */
  generateServerQueries?: boolean;

  /**
   * Whether to generate API client
   * @default true
   */
  generateClient?: boolean;

  /**
   * Whether to generate prefetch utilities
   * @default true
   */
  generatePrefetch?: boolean;

  /**
   * Custom templates directory
   */
  templatesDir?: string;

  /**
   * Additional options
   */
  options?: {
    /**
     * Use 'use client' directive
     */
    useClientDirective?: boolean;

    /**
     * Custom imports to add to generated files
     */
    customImports?: Record<string, string[]>;

    /**
     * Prefix for generated hook names
     */
    hookPrefix?: string;

    /**
     * Suffix for generated action names
     */
    actionSuffix?: string;
  };
}

export interface ResolvedConfig extends UserConfig {
  rootDir: string;
  endpointsPath: string;
  outputDir: string;
  apiConfig?: APIConfig;
}

const explorer = cosmiconfig("api-codegen", {
  searchPlaces: [
    "api-codegen.config.js",
    "api-codegen.config.mjs",
    "api-codegen.config.ts",
    "api-codegen.config.json",
    ".api-codegenrc",
    ".api-codegenrc.json",
    ".api-codegenrc.js",
  ],
});

export async function loadConfig(
  configPath?: string,
): Promise<ResolvedConfig | null> {
  try {
    const result = configPath
      ? await explorer.load(configPath)
      : await explorer.search();

    if (!result || !result.config) {
      return null;
    }

    const userConfig = result.config as UserConfig;
    const rootDir = path.dirname(result.filepath);

    // Resolve paths
    const endpointsPath = path.resolve(rootDir, userConfig.endpoints);
    const outputDir = path.resolve(rootDir, userConfig.output);

    // Set defaults based on provider
    const generateHooks = userConfig.generateHooks ?? true;
    const generateServerActions =
      userConfig.generateServerActions ?? userConfig.provider === "nextjs";
    const generateServerQueries =
      userConfig.generateServerQueries ?? userConfig.provider === "nextjs";
    const generateClient = userConfig.generateClient ?? true;
    const generatePrefetch = userConfig.generatePrefetch ?? true;

    return {
      ...userConfig,
      rootDir,
      endpointsPath,
      outputDir,
      generateHooks,
      generateServerActions,
      generateServerQueries,
      generateClient,
      generatePrefetch,
    };
  } catch (error) {
    throw new Error(
      `Failed to load config: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Validate user config
 */
export function validateConfig(config: UserConfig): void {
  if (!config.endpoints) {
    throw new Error('Config error: "endpoints" path is required');
  }

  if (!config.provider) {
    throw new Error(
      'Config error: "provider" must be specified (vite or nextjs)',
    );
  }

  if (!["vite", "nextjs"].includes(config.provider)) {
    throw new Error(
      'Config error: "provider" must be either "vite" or "nextjs"',
    );
  }

  if (!config.output) {
    throw new Error('Config error: "output" directory is required');
  }
}
