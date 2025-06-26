import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import { RuntimeManager } from './runtime-manager';
import { ProviderManager } from './provider-manager';

export interface SpellManifest {
  id: string;
  type: 'spell' | 'whisper' | 'echo' | 'incantation';
  name?: string;
  description?: string;
  version?: string;
  entry: string;
  runtime: string;
  shortcut?: string;
  permissions: {
    filesystem: 'full' | 'ro' | 'none';
    network: 'full' | 'none';
    subprocess: boolean;
    shell: boolean;
    microphone?: boolean;
  };
  providers_supported: string[];
  default_provider?: string;
  author?: {
    name: string;
    email?: string;
    url?: string;
  };
  models?: Record<string, string[]>;
  prompt_template?: string;
  max_tokens?: number;
}

export interface SpellRequest {
  input: string;
  model?: string;
  api_key?: string;
  config?: Record<string, any>;
}

export interface SpellResult {
  status: 'success' | 'error';
  output?: string;
  metadata?: {
    t?: number;
    model_used?: string;
    tokens_used?: number;
    [key: string]: any;
  };
  error?: {
    code: string;
    message: string;
    details?: string;
  };
}

export class SpellRunner {
  constructor(
    private runtimeManager: RuntimeManager,
    private providerManager: ProviderManager
  ) {}

  /**
   * Execute a spell with the given input
   */
  async executeSpell(spellPath: string, input: string): Promise<SpellResult> {
    const startTime = Date.now();
    
    try {
      // Load and validate spell manifest
      const manifest = await this.loadSpellManifest(spellPath);
      
      // Resolve runtime for the spell
      const runtimePath = await this.runtimeManager.resolveRuntime(manifest.runtime);
      
      // Get provider configuration
      const providerConfig = await this.providerManager.getProviderConfig(
        manifest.providers_supported,
        manifest.default_provider
      );
      
      // Prepare spell request
      const request: SpellRequest = {
        input,
        model: providerConfig.model,
        api_key: providerConfig.api_key,
        config: providerConfig.config,
      };
      
      // Execute the spell
      const result = await this.runSpellProcess(
        runtimePath,
        path.join(spellPath, manifest.entry),
        request
      );
      
      // Add execution metadata
      if (result.status === 'success' && result.metadata) {
        result.metadata.total_time = Date.now() - startTime;
        result.metadata.spell_id = manifest.id;
      }
      
      return result;
      
    } catch (error) {
      console.error('Spell execution failed:', error);
      return {
        status: 'error',
        error: {
          code: 'EXECUTION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error instanceof Error ? error.stack : undefined,
        },
        metadata: {
          total_time: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Load and parse spell manifest
   */
  private async loadSpellManifest(spellPath: string): Promise<SpellManifest> {
    const manifestPath = path.join(spellPath, 'plugin.json');
    
    try {
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent) as SpellManifest;
      
      // Validate required fields
      if (!manifest.id || !manifest.type || !manifest.entry || !manifest.runtime) {
        throw new Error('Invalid manifest: missing required fields');
      }
      
      return manifest;
    } catch (error) {
      throw new Error(`Failed to load spell manifest from ${manifestPath}: ${error}`);
    }
  }

  /**
   * Execute spell as subprocess following JSON IPC protocol
   */
  private async runSpellProcess(
    runtimePath: string,
    scriptPath: string,
    request: SpellRequest
  ): Promise<SpellResult> {
    return new Promise((resolve, reject) => {
      // Spawn the spell process
      const process = spawn(runtimePath, [scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: path.dirname(scriptPath),
      });

      let stdout = '';
      let stderr = '';
      let resultParsed = false;

      // Set up timeout
      const timeout = setTimeout(() => {
        process.kill('SIGTERM');
        if (!resultParsed) {
          resolve({
            status: 'error',
            error: {
              code: 'TIMEOUT',
              message: 'Spell execution timed out',
            },
          });
        }
      }, 30000); // 30 second timeout

      // Handle process events
      process.on('error', (error) => {
        clearTimeout(timeout);
        if (!resultParsed) {
          resolve({
            status: 'error',
            error: {
              code: 'PROCESS_ERROR',
              message: `Failed to start spell process: ${error.message}`,
            },
          });
        }
      });

      process.on('exit', (code, signal) => {
        clearTimeout(timeout);
        
        if (resultParsed) return;

        if (code === 0) {
          // Try to parse stdout as JSON
          try {
            const result = JSON.parse(stdout.trim()) as SpellResult;
            resolve(result);
          } catch (error) {
            resolve({
              status: 'error',
              error: {
                code: 'PARSE_ERROR',
                message: 'Failed to parse spell output as JSON',
                details: stdout,
              },
            });
          }
        } else {
          resolve({
            status: 'error',
            error: {
              code: 'NON_ZERO_EXIT',
              message: `Spell process exited with code ${code}`,
              details: stderr,
            },
          });
        }
      });

      // Collect stdout
      process.stdout?.on('data', (data) => {
        stdout += data.toString();
        
        // Check if we have a complete JSON response
        const lines = stdout.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && (trimmed.startsWith('{') || trimmed.startsWith('['))) {
            try {
              const result = JSON.parse(trimmed) as SpellResult;
              if (result.status && !resultParsed) {
                resultParsed = true;
                clearTimeout(timeout);
                process.kill('SIGTERM');
                resolve(result);
                return;
              }
            } catch {
              // Not valid JSON yet, continue collecting
            }
          }
        }
      });

      // Collect stderr
      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      // Send request to spell via stdin
      const requestJson = JSON.stringify(request) + '\n';
      process.stdin?.write(requestJson);
      process.stdin?.end();
    });
  }

  /**
   * List available spells in the spells directory
   */
  async listSpells(spellsDir: string): Promise<SpellManifest[]> {
    try {
      const entries = await fs.readdir(spellsDir, { withFileTypes: true });
      const spells: SpellManifest[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          try {
            const spellPath = path.join(spellsDir, entry.name);
            const manifest = await this.loadSpellManifest(spellPath);
            spells.push(manifest);
          } catch (error) {
            console.warn(`Failed to load spell ${entry.name}:`, error);
          }
        }
      }

      return spells;
    } catch (error) {
      console.error('Failed to list spells:', error);
      return [];
    }
  }

  /**
   * Validate spell permissions before execution
   */
  validateSpellPermissions(manifest: SpellManifest): boolean {
    // In a production system, this would check user-granted permissions
    // For now, we'll just log the required permissions
    console.log(`Spell ${manifest.id} requires permissions:`, manifest.permissions);
    
    // TODO: Implement actual permission checking
    return true;
  }
} 