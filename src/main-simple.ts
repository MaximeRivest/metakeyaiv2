import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { spawn } from 'child_process';

class MetaKeyApp {
  private systemAgentProcess: any = null;
  private mainWindow: BrowserWindow | null = null;

  async initialize() {
    console.log('🚀 Initializing MetaKey AI...');

    try {
      // Start system agent
      await this.startSystemAgent();
      
      // Create main window
      this.createMainWindow();
      
      console.log('✅ MetaKey AI initialized successfully!');
      console.log('Try pressing Ctrl+Alt+Q to trigger the default spell');

    } catch (error) {
      console.error('❌ Failed to initialize MetaKey AI:', error);
      app.quit();
    }
  }

  private async startSystemAgent() {
    console.log('🔧 Starting System Agent...');
    
    const agentPath = path.join(process.cwd(), 'system-agent', 'target', 'release', 'system-agent');
    
    this.systemAgentProcess = spawn(agentPath, [], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Handle agent events
    let buffer = '';
    this.systemAgentProcess.stdout.on('data', (data: Buffer) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          this.handleAgentEvent(line.trim());
        }
      }
    });

    this.systemAgentProcess.stderr.on('data', (data: Buffer) => {
      console.error('System agent stderr:', data.toString());
    });

    this.systemAgentProcess.on('exit', (code: number) => {
      console.log(`System agent exited with code ${code}`);
    });

    // Wait for ready signal
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('System agent failed to start'));
      }, 5000);

      const checkReady = (data: Buffer) => {
        if (data.toString().includes('"event":"ready"')) {
          clearTimeout(timeout);
          this.systemAgentProcess.stdout.removeListener('data', checkReady);
          resolve();
        }
      };

      this.systemAgentProcess.stdout.on('data', checkReady);
    });

    // Register hotkeys
    await this.registerHotkeys();
  }

  private async registerHotkeys() {
    const hotkeys = [
      { id: 'spell_default', shortcut: 'ctrl+alt+q' },
      { id: 'settings', shortcut: 'f1' },
    ];

    for (const hotkey of hotkeys) {
      const command = {
        command: 'register_hotkey',
        id: hotkey.id,
        shortcut: hotkey.shortcut,
      };
      
      this.systemAgentProcess.stdin.write(JSON.stringify(command) + '\n');
      console.log(`✅ Registered hotkey: ${hotkey.shortcut} → ${hotkey.id}`);
    }
  }

  private handleAgentEvent(line: string) {
    try {
      const event = JSON.parse(line);
      
      if (event.event === 'hotkey') {
        console.log(`🔥 Hotkey triggered: ${event.id} (${event.shortcut})`);
        this.handleHotkey(event.id);
      } else if (event.event === 'clipboard') {
        console.log(`📋 Clipboard changed: ${event.text.substring(0, 50)}...`);
      } else if (event.event === 'ready') {
        console.log('🟢 System agent ready');
      } else if (event.event === 'error') {
        console.error('🔴 System agent error:', event.message);
      }
    } catch (error) {
      console.error('Failed to parse agent event:', line);
    }
  }

  private async handleHotkey(hotkeyId: string) {
    switch (hotkeyId) {
      case 'spell_default':
        await this.runDefaultSpell();
        break;
      case 'settings':
        this.openSettings();
        break;
      default:
        console.warn(`Unknown hotkey: ${hotkeyId}`);
    }
  }

  private async runDefaultSpell() {
    console.log('🪄 Running default spell...');
    
    try {
      // For demo, let's run a simple Python script that just echoes input
      const exampleText = "MetaKey AI is a cross-platform desktop assistant for text processing.";
      
      // Check if Python is available
      const pythonPath = await this.findPython();
      if (!pythonPath) {
        console.error('❌ Python not found');
        return;
      }

      // Run the text summarizer spell
      const spellPath = path.join(__dirname, '..', 'examples', 'spells', 'text-summarizer', 'summarize.py');
      const result = await this.runSpell(pythonPath, spellPath, exampleText);
      
      if (result) {
        // Set result back to clipboard
        const setClipboardCommand = {
          command: 'set_clipboard',
          text: result,
        };
        this.systemAgentProcess.stdin.write(JSON.stringify(setClipboardCommand) + '\n');
        console.log('✅ Default spell completed:', result);
      }
      
    } catch (error) {
      console.error('❌ Default spell failed:', error);
    }
  }

  private async findPython(): Promise<string | null> {
    try {
      const { spawn } = require('child_process');
      
      // Try python3 first, then python
      for (const cmd of ['python3', 'python']) {
        try {
          const result = await new Promise<string>((resolve, reject) => {
            const proc = spawn('which', [cmd], { stdio: ['ignore', 'pipe', 'ignore'] });
            let output = '';
            proc.stdout.on('data', (data: Buffer) => {
              output += data.toString();
            });
            proc.on('close', (code: number) => {
              if (code === 0 && output.trim()) {
                resolve(output.trim());
              } else {
                reject();
              }
            });
          });
          return result;
        } catch {
          continue;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  private async runSpell(pythonPath: string, spellPath: string, input: string): Promise<string | null> {
    return new Promise((resolve) => {
      const spellProcess = spawn(pythonPath, [spellPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let output = '';
      let errorOutput = '';

      spellProcess.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });

      spellProcess.stderr.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });

      spellProcess.on('close', (code: number) => {
        if (code === 0 && output.trim()) {
          try {
            const result = JSON.parse(output.trim());
            // Handle our spell's actual output format
            if (result.output) {
              console.log('📝 Spell metadata:', result.metadata);
              resolve(result.output);
            } else if (result.error) {
              console.error('Spell returned error:', result.error);
              resolve(null);
            } else {
              console.error('Unknown spell response format:', result);
              resolve(null);
            }
          } catch (error) {
            console.error('Failed to parse spell output:', output);
            console.error('Raw output was:', output);
            resolve(null);
          }
        } else {
          console.error('Spell failed with code:', code);
          console.error('Error output:', errorOutput);
          console.error('Standard output:', output);
          resolve(null);
        }
      });

      // Send input to spell
      const request = {
        input,
        model: 'llama3.2:1b',
      };
      spellProcess.stdin.write(JSON.stringify(request) + '\n');
      spellProcess.stdin.end();

      // Timeout after 30 seconds
      setTimeout(() => {
        spellProcess.kill();
        resolve(null);
      }, 30000);
    });
  }

  private openSettings() {
    console.log('⚙️ Opening settings...');
    if (this.mainWindow) {
      this.mainWindow.show();
    }
  }

  private createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 400,
      height: 300,
      show: false,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    this.mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
    
    this.mainWindow.on('blur', () => {
      this.mainWindow?.hide();
    });
  }

  async shutdown() {
    console.log('🔄 Shutting down MetaKey AI...');
    
    if (this.systemAgentProcess) {
      const quitCommand = { command: 'quit' };
      this.systemAgentProcess.stdin.write(JSON.stringify(quitCommand) + '\n');
      this.systemAgentProcess.kill();
    }
    
    if (this.mainWindow) {
      this.mainWindow.close();
    }
    
    console.log('✅ MetaKey AI shut down successfully');
  }
}

// Electron app lifecycle
const metaKeyApp = new MetaKeyApp();

app.whenReady().then(async () => {
  await metaKeyApp.initialize();
});

app.on('before-quit', async (event) => {
  event.preventDefault();
  await metaKeyApp.shutdown();
  app.exit();
});

app.on('window-all-closed', () => {
  // Keep running
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    metaKeyApp.initialize();
  }
}); 