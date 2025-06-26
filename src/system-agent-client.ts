import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import * as path from 'path';

/**
 * Events emitted by the System Agent
 */
export interface AgentEvents {
  hotkey: { id: string; shortcut: string };
  clipboard: { text: string; timestamp: number };
  ready: void;
  error: { message: string; code?: string };
}

/**
 * Commands that can be sent to the System Agent
 */
export interface AgentCommands {
  register_hotkey: { id: string; shortcut: string };
  unregister_hotkey: { id: string };
  set_clipboard: { text: string };
  set_clipboard_monitoring: { enabled: boolean };
  quit: void;
}

/**
 * Response from the System Agent
 */
export interface AgentResponse {
  status: 'success' | 'error';
  command: string;
  message?: string;
  error?: string;
  code?: string;
}

/**
 * TypeScript client for MetaKey AI System Agent
 * Handles JSON IPC communication over stdin/stdout as per specification
 */
export class SystemAgentClient extends EventEmitter {
  private process: ChildProcess | null = null;
  private isReady = false;

  constructor(private agentPath: string) {
    super();
  }

  /**
   * Start the system agent and establish IPC connection
   */
  async start(): Promise<void> {
    if (this.process) {
      throw new Error('System agent is already running');
    }

    return new Promise((resolve, reject) => {
      // Spawn the system agent process
      this.process = spawn(this.agentPath, [], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      if (!this.process.stdin || !this.process.stdout || !this.process.stderr) {
        reject(new Error('Failed to establish stdio pipes with system agent'));
        return;
      }

      // Handle process lifecycle
      this.process.on('error', (error) => {
        this.emit('error', error);
        reject(error);
      });

      this.process.on('exit', (code, signal) => {
        console.log(`System agent exited with code ${code}, signal ${signal}`);
        this.cleanup();
      });

      // Handle stderr for debugging
      this.process.stderr.on('data', (data) => {
        console.error('System agent stderr:', data.toString());
      });

      // Set up stdout event parsing
      let buffer = '';
      this.process.stdout.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.trim()) {
            this.handleAgentMessage(line.trim());
          }
        }
      });

      // Wait for ready signal
      this.once('ready', () => {
        this.isReady = true;
        resolve();
      });

      // Timeout if agent doesn't start
      setTimeout(() => {
        if (!this.isReady) {
          reject(new Error('System agent failed to start within timeout'));
        }
      }, 5000);
    });
  }

  /**
   * Stop the system agent gracefully
   */
  async stop(): Promise<void> {
    if (!this.process) {
      return;
    }

    try {
      await this.sendCommand('quit', {});
      
      // Wait for graceful exit
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          this.process?.kill('SIGTERM');
          resolve();
        }, 2000);

        this.process?.once('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    } catch (error) {
      console.error('Error during graceful shutdown:', error);
      this.process?.kill('SIGTERM');
    }

    this.cleanup();
  }

  /**
   * Register a global hotkey
   */
  async registerHotkey(id: string, shortcut: string): Promise<AgentResponse> {
    return this.sendCommand('register_hotkey', { id, shortcut });
  }

  /**
   * Unregister a global hotkey
   */
  async unregisterHotkey(id: string): Promise<AgentResponse> {
    return this.sendCommand('unregister_hotkey', { id });
  }

  /**
   * Set clipboard content
   */
  async setClipboard(text: string): Promise<AgentResponse> {
    return this.sendCommand('set_clipboard', { text });
  }

  /**
   * Enable or disable clipboard monitoring
   */
  async setClipboardMonitoring(enabled: boolean): Promise<AgentResponse> {
    return this.sendCommand('set_clipboard_monitoring', { enabled });
  }

  /**
   * Send a command to the system agent
   */
  private async sendCommand<T extends keyof AgentCommands>(
    command: T,
    params: AgentCommands[T]
  ): Promise<AgentResponse> {
    if (!this.process?.stdin) {
      throw new Error('System agent is not running');
    }

    const commandObj = { command, ...params };
    const commandJson = JSON.stringify(commandObj) + '\n';
    
    return new Promise((resolve, reject) => {
      // Listen for response (simplified - in reality you'd match by request ID)
      const responseHandler = (response: AgentResponse) => {
        if (response.command === command) {
          this.removeListener('response', responseHandler);
          resolve(response);
        }
      };

      this.once('response', responseHandler);
      
      // Send command
      this.process!.stdin!.write(commandJson);

      // Timeout
      setTimeout(() => {
        this.removeListener('response', responseHandler);
        reject(new Error(`Command ${command} timed out`));
      }, 5000);
    });
  }

  /**
   * Handle incoming messages from the system agent
   */
  private handleAgentMessage(line: string): void {
    try {
      const message = JSON.parse(line);

      // Handle events
      if (message.event) {
        switch (message.event) {
          case 'hotkey':
            this.emit('hotkey', { id: message.id, shortcut: message.shortcut });
            break;
          case 'clipboard':
            this.emit('clipboard', { text: message.text, timestamp: message.timestamp });
            break;
          case 'ready':
            this.emit('ready');
            break;
          case 'error':
            this.emit('error', { message: message.message, code: message.code });
            break;
          default:
            console.warn('Unknown event from system agent:', message);
        }
      }

      // Handle command responses
      if (message.status) {
        this.emit('response', message as AgentResponse);
      }

    } catch (error) {
      console.error('Failed to parse system agent message:', line, error);
      this.emit('error', { message: 'Failed to parse agent message', code: 'PARSE_ERROR' });
    }
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    this.process = null;
    this.isReady = false;
    this.removeAllListeners();
  }

  /**
   * Check if the system agent is running and ready
   */
  get ready(): boolean {
    return this.isReady && this.process !== null;
  }
}

/**
 * Factory function to create and start a system agent client
 * This would be called from the Electron Main Process
 */
export async function createSystemAgent(resourcesPath: string): Promise<SystemAgentClient> {
  // Determine the correct binary path based on platform
  const platform = process.platform;
  let binaryName: string;

  switch (platform) {
    case 'win32':
      binaryName = 'system-agent.exe';
      break;
    case 'darwin':
    case 'linux':
      binaryName = 'system-agent';
      break;
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }

  const agentPath = path.join(resourcesPath, 'bin', platform, binaryName);
  const client = new SystemAgentClient(agentPath);
  
  await client.start();
  return client;
}

// Usage example for Electron Main Process:
/*
import { createSystemAgent } from './system-agent-client';

async function initializeAgent() {
  try {
    const agent = await createSystemAgent(process.resourcesPath);
    
    // Register hotkeys as per specification
    await agent.registerHotkey('spell_default', 'ctrl+alt+q');
    await agent.registerHotkey('settings', 'f1');
    await agent.registerHotkey('clipboard_left', 'ctrl+alt+left');
    await agent.registerHotkey('clipboard_right', 'ctrl+alt+right');
    await agent.registerHotkey('whisper', 'ctrl+alt+w');
    await agent.registerHotkey('echo', 'ctrl+alt+e');
    
    // Listen for events
    agent.on('hotkey', (event) => {
      console.log(`Hotkey triggered: ${event.id} (${event.shortcut})`);
      handleHotkey(event.id);
    });
    
    agent.on('clipboard', (event) => {
      console.log(`Clipboard changed: ${event.text.substring(0, 50)}...`);
      updateClipboardHistory(event.text, event.timestamp);
    });
    
    agent.on('error', (error) => {
      console.error('System agent error:', error);
    });
    
    return agent;
  } catch (error) {
    console.error('Failed to initialize system agent:', error);
    throw error;
  }
}
*/ 