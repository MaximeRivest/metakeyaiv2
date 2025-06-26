import * as path from 'path';
import * as fs from 'fs/promises';
import { spawn } from 'child_process';

export interface RuntimeConfig {
  name: string;
  executable: string;
  version?: string;
  managed: boolean; // Whether this runtime is managed by MetaKey AI
  userProvided: boolean; // Whether this runtime was provided by the user
}

export class RuntimeManager {
  private runtimeCache = new Map<string, string>();
  private userRuntimePaths = new Map<string, string>();

  constructor() {
    // Initialize with default runtime search paths
    this.loadUserRuntimePaths();
  }

  /**
   * Resolve runtime path for a given language following the specification
   * Priority: user-provided > app-managed > system-wide
   */
  async resolveRuntime(language: string): Promise<string> {
    // Check cache first
    if (this.runtimeCache.has(language)) {
      return this.runtimeCache.get(language)!;
    }

    let runtimePath: string | null = null;

    try {
      // 1. Check user-provided runtime path
      const userPath = this.userRuntimePaths.get(language);
      if (userPath && await this.validateRuntimePath(userPath)) {
        runtimePath = userPath;
        console.log(`✅ Using user-provided ${language} runtime: ${userPath}`);
      }

      // 2. Check app-managed runtime
      if (!runtimePath) {
        const managedPath = await this.getManagedRuntimePath(language);
        if (managedPath && await this.validateRuntimePath(managedPath)) {
          runtimePath = managedPath;
          console.log(`✅ Using managed ${language} runtime: ${managedPath}`);
        }
      }

      // 3. Check system-wide runtime
      if (!runtimePath) {
        const systemPath = await this.findSystemRuntime(language);
        if (systemPath && await this.validateRuntimePath(systemPath)) {
          runtimePath = systemPath;
          console.log(`✅ Using system ${language} runtime: ${systemPath}`);
        }
      }

      if (!runtimePath) {
        throw new Error(`No ${language} runtime found. Please install ${language} or configure a runtime path.`);
      }

      // Cache the resolved path
      this.runtimeCache.set(language, runtimePath);
      return runtimePath;

    } catch (error) {
      throw new Error(`Failed to resolve ${language} runtime: ${error}`);
    }
  }

  /**
   * Set user-provided runtime path
   */
  setUserRuntimePath(language: string, runtimePath: string): void {
    this.userRuntimePaths.set(language, runtimePath);
    this.runtimeCache.delete(language); // Clear cache
    this.saveUserRuntimePaths();
  }

  /**
   * Get managed runtime path (installed by MetaKey AI recipes)
   */
  private async getManagedRuntimePath(language: string): Promise<string | null> {
    // This would point to app data directory in production
    const appDataDir = path.join(process.cwd(), '.metakey'); // Simplified for demo
    const managedRuntimeDir = path.join(appDataDir, 'runtimes', language);

    const possiblePaths = this.getRuntimeExecutablePaths(language, managedRuntimeDir);

    for (const execPath of possiblePaths) {
      try {
        await fs.access(execPath);
        return execPath;
      } catch {
        // Try next path
      }
    }

    return null;
  }

  /**
   * Find system-wide runtime installation
   */
  private async findSystemRuntime(language: string): Promise<string | null> {
    const possibleNames = this.getRuntimeExecutableNames(language);

    for (const name of possibleNames) {
      try {
        // Use 'which' on Unix or 'where' on Windows to find executable
        const command = process.platform === 'win32' ? 'where' : 'which';
        const result = await this.execCommand(`${command} ${name}`);
        
        if (result.trim()) {
          return result.trim().split('\n')[0]; // Take first result
        }
      } catch {
        // Command failed, try next
      }
    }

    return null;
  }

  /**
   * Get possible executable names for a runtime
   */
  private getRuntimeExecutableNames(language: string): string[] {
    switch (language.toLowerCase()) {
      case 'python':
        return ['python3', 'python', 'python.exe'];
      case 'node':
      case 'nodejs':
        return ['node', 'node.exe'];
      case 'julia':
        return ['julia', 'julia.exe'];
      case 'ruby':
        return ['ruby', 'ruby.exe'];
      case 'go':
        return ['go', 'go.exe'];
      case 'rust':
        return ['cargo', 'cargo.exe'];
      default:
        return [language, `${language}.exe`];
    }
  }

  /**
   * Get possible executable paths for managed runtimes
   */
  private getRuntimeExecutablePaths(language: string, runtimeDir: string): string[] {
    const binDir = path.join(runtimeDir, 'bin');
    const names = this.getRuntimeExecutableNames(language);
    
    return names.map(name => path.join(binDir, name));
  }

  /**
   * Validate that a runtime path exists and is executable
   */
  private async validateRuntimePath(runtimePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(runtimePath);
      return stats.isFile();
    } catch {
      return false;
    }
  }

  /**
   * Execute a command and return stdout
   */
  private execCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const [cmd, ...args] = command.split(' ');
      const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'ignore'] });
      
      let output = '';
      child.stdout?.on('data', (data) => {
        output += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Command failed with code ${code}`));
        }
      });
      
      child.on('error', reject);
    });
  }

  /**
   * Load user runtime paths from storage
   */
  private loadUserRuntimePaths(): void {
    // In production, this would load from a config file or database
    // For now, we'll use hardcoded defaults
    
    // Try to detect system Python
    this.findSystemRuntime('python').then(pythonPath => {
      if (pythonPath) {
        console.log(`🐍 Found system Python: ${pythonPath}`);
      }
    }).catch(() => {
      console.warn('⚠️ No system Python found. Install Python or configure runtime path.');
    });
  }

  /**
   * Save user runtime paths to storage
   */
  private saveUserRuntimePaths(): void {
    // In production, this would save to a config file or database
    console.log('💾 Runtime paths saved (demo mode)');
  }

  /**
   * Get runtime information for debugging
   */
  async getRuntimeInfo(language: string): Promise<RuntimeConfig | null> {
    try {
      const runtimePath = await this.resolveRuntime(language);
      
      return {
        name: language,
        executable: runtimePath,
        managed: runtimePath.includes('.metakey'),
        userProvided: this.userRuntimePaths.has(language),
      };
    } catch {
      return null;
    }
  }

  /**
   * List all available runtimes
   */
  async listAvailableRuntimes(): Promise<RuntimeConfig[]> {
    const languages = ['python', 'node', 'julia', 'ruby', 'go'];
    const runtimes: RuntimeConfig[] = [];

    for (const language of languages) {
      const info = await this.getRuntimeInfo(language);
      if (info) {
        runtimes.push(info);
      }
    }

    return runtimes;
  }

  /**
   * Check if a runtime is available
   */
  async isRuntimeAvailable(language: string): Promise<boolean> {
    try {
      await this.resolveRuntime(language);
      return true;
    } catch {
      return false;
    }
  }
} 