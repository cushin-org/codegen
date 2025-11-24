import fs from "fs/promises";
import path from "path";
import { BaseGenerator } from "./base.js";
import type { APIEndpoint } from "@cushin/api-runtime";

export class ServerActionsGenerator extends BaseGenerator {
  async generate(): Promise<void> {
    const content = this.generateContent();
    const outputPath = path.join(this.context.config.outputDir, 'actions.ts');

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, content, 'utf-8');
  }

  private generateContent(): string {
    const imports = `'use server';

import { revalidateTag, revalidatePath } from 'next/cache';
import { serverClient } from './server-client';
import type { 
  APIEndpoints, 
  ExtractBody, 
  ExtractParams, 
  ExtractResponse 
} from './types';

export type ActionResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string };
`;

    const actions: string[] = [];

    Object.entries(this.context.apiConfig.endpoints).forEach(([name, endpoint]) => {
      if (this.isMutationEndpoint(endpoint)) {
        actions.push(this.generateServerAction(name, endpoint));
      }
    });

    return imports + '\n' + actions.join('\n\n');
  }

  private generateServerAction(name: string, endpoint: APIEndpoint): string {
    const actionSuffix = this.context.config.options?.actionSuffix || 'Action';
    const actionName = `${name}${actionSuffix}`;
    const signature = this.getEndpointSignature(name, endpoint);
    const invalidationTags = this.getInvalidationTags(endpoint);

    let inputType = '';
    let inputParam = '';
    if (signature.hasParams && signature.hasBody) {
      inputType = `input: { params: ${signature.paramType}; body: ${signature.bodyType} }`;
      inputParam = 'input';
    } else if (signature.hasParams) {
      inputType = `params: ${signature.paramType}`;
      inputParam = 'params';
    } else if (signature.hasBody) {
      inputType = `body: ${signature.bodyType}`;
      inputParam = 'body';
    }

    const revalidateStatements = invalidationTags.length > 0
      ? invalidationTags
          .map((tag) => `    revalidateTag('${tag}');`)
          .join('\n')
      : '    // No automatic revalidations';

    return `/**
 * ${endpoint.description || `Server action for ${name}`}
 * @tags ${endpoint.tags?.join(', ') || 'none'}
 */
export async function ${actionName}(
  ${inputType}
): Promise<ActionResult<${signature.responseType}>> {
  try {
    const result = await serverClient.${name}(${inputParam ? inputParam : ''});
    
    // Revalidate related data
${revalidateStatements}
    
    return { success: true, data: result };
  } catch (error) {
    console.error('[Server Action Error]:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}`;
  }
}
