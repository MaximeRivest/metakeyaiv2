import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export interface SystemAgentEvent {
  event: 'hotkey_pressed' | 'key_press' | 'key_release';
  // Add other potential properties from the agent's JSON output
  [key: string]: any;
}

export class SystemAgentService extends EventEmitter {
  private agentProcess: ChildProcess | null = null;
  private buffer = '';

  constructor() {
    super();
  }

  public start(agentPath: string): void {
    if (this.agentProcess) {
      console.warn('System Agent is already running.');
      return;
    }

    this.agentProcess = spawn(agentPath);

    this.agentProcess.stdout?.on('data', this.handleStdout.bind(this));
    this.agentProcess.stderr?.on('data', this.handleError.bind(this));
    this.agentProcess.on('close', this.handleClose.bind(this));
  }

  public stop(): void {
    if (this.agentProcess) {
      console.log('[SystemAgentEngine] Stopping system-agent process...');
      this.agentProcess.kill();
    this.agentProcess = null;
  }
  }

  private handleStdout(data: Buffer): void {
    console.log(`[system-agent-stdout]: ${data.toString().trim()}`);
    const messages = data.toString().trim().split('\n');
    for (const message of messages) {
      if (message) {
      try {
        const event: SystemAgentEvent = JSON.parse(message);
        this.emit('event', event); // A generic event
        // Emit specific events based on the payload
        if (event.event) {
          this.emit(event.event, event);
        } else if (event.event_type) {
          // Legacy or different event format
           const eventName = event.event_type.toLowerCase().replace(/_/g, '-');
          this.emit(eventName, event);
        }
      } catch (err) {
        console.error('Error parsing message from system agent:', message, err);
        this.emit('error', { message: 'Error parsing agent message', data: message });
       }
      }
    }
  }

  private handleError(data: Buffer): void {
    const errorMessage = data.toString();
    // Don't treat all stderr as a crash-worthy error.
    // The agent uses stderr for logging, which is common for native binaries.
    // We'll just print it to the console for debugging purposes.
    console.log(`[system-agent-stderr]: ${errorMessage.trim()}`);
  }

  public registerHotkey(shortcut: string, id: string): void {
    if (!this.agentProcess) {
      console.error('Cannot register hotkey: System Agent is not running.');
      return;
    }

    const command = {
      command: 'register',
      shortcut: shortcut,
      id: id,
    };

    this.agentProcess.stdin?.write(JSON.stringify(command) + '\n');
    console.log(`Sent command to register hotkey "${shortcut}" with id "${id}"`);
  }

  public unregisterHotkey(shortcut: string, id: string): void {
    if (!this.agentProcess) {
      // It's okay if the agent is not running, we just can't send the command.
      return;
    }
    console.log(`Sending command to unregister hotkey "${shortcut}" with id "${id}"`);
    const command = {
      command: 'unregister',
      shortcut: shortcut,
      id: id,
    };
    this.agentProcess.stdin?.write(JSON.stringify(command) + '\n');
  }

  public unregisterAllHotkeys(): void {
    if (!this.agentProcess) {
      return;
    }
    console.log('Sending command to unregister all hotkeys');
    const command = { command: 'unregister_all' };
    this.agentProcess.stdin?.write(JSON.stringify(command) + '\n');
  }

  public registerHotkeys(bindings: { id: string; shortcut: string }[]): void {
    if (!this.agentProcess) {
      console.error('Cannot register hotkeys: System Agent is not running.');
      return;
    }

    const command = {
      command: 'register_batch',
      hotkeys: bindings,
    };

    this.agentProcess.stdin?.write(JSON.stringify(command) + '\n');
    console.log(`Sent command to register ${bindings.length} hotkeys in batch`);
  }

  private handleClose(code: number): void {
    if (code !== 0) {
      const closeMessage = `System agent exited with code ${code}`;
      console.error(closeMessage);
      this.emit('error', { message: closeMessage, code });
    } else {
      console.log('System agent exited gracefully.');
    }
    this.agentProcess = null;
  }
} 