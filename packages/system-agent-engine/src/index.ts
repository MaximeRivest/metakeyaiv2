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

    this.agentProcess.stdout?.on('data', this.handleData.bind(this));
    this.agentProcess.stderr?.on('data', this.handleError.bind(this));
    this.agentProcess.on('close', this.handleClose.bind(this));
  }

  public stop(): void {
    this.agentProcess?.kill();
    this.agentProcess = null;
  }

  private handleData(data: Buffer): void {
    this.buffer += data.toString();
    let boundary = this.buffer.indexOf('\n');

    while (boundary !== -1) {
      const message = this.buffer.substring(0, boundary).trim();
      this.buffer = this.buffer.substring(boundary + 1);
      boundary = this.buffer.indexOf('\n');

      if (!message) continue;

      try {
        const event: SystemAgentEvent = JSON.parse(message);
        this.emit('event', event); // A generic event
        // Emit specific events based on the payload
        if (event.event) {
          this.emit(event.event, event);
        } else if (event.event_type) {
          // Legacy or different event format
          const eventName = event.event_type.toLowerCase().replace('_', '-');
          this.emit(eventName, event);
        }
      } catch (err) {
        console.error('Error parsing message from system agent:', message, err);
        this.emit('error', { message: 'Error parsing agent message', data: message });
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
    const command = { command: 'unregister_all' };
    this.agentProcess.stdin?.write(JSON.stringify(command) + '\n');
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