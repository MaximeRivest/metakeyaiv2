import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { SystemAgentClient, createSystemAgent } from './system-agent-client';
import { SpellRunner } from './spell-runner';
import { RuntimeManager } from './runtime-manager';
import { ProviderManager } from './provider-manager';
import { ClipboardManager } from './clipboard-manager';

class MetaKeyApp {
  private systemAgent: SystemAgentClient | null = null;
  private spellRunner: SpellRunner | null = null;
  private runtimeManager: RuntimeManager | null = null;
  private providerManager: ProviderManager | null = null;
  private clipboardManager: ClipboardManager | null = null;
  private mainWindow: BrowserWindow | null = null;

  async initialize() {
    console.log('🚀 Initializing MetaKey AI...');

    try {
      // Initialize core managers
      this.runtimeManager = new RuntimeManager();
      this.providerManager = new ProviderManager();
      this.clipboardManager = new ClipboardManager();
      
      // Initialize spell runner
      this.spellRunner = new SpellRunner(
        this.runtimeManager,
        this.providerManager
      );

      // Initialize system agent
      console.log('🔧 Starting System Agent...');
      this.systemAgent = await createSystemAgent(
        path.join(__dirname, '..', 'system-agent', 'target', 'release')
      );

      // Set up event handlers
      this.setupSystemAgentEvents();
      
      // Register default hotkeys
      await this.registerDefaultHotkeys();
      
      // Create main window (minimal for now)
      this.createMainWindow();
      
      console.log('✅ MetaKey AI initialized successfully!');
      console.log('Try pressing Ctrl+Alt+Q to trigger the default spell');

    } catch (error) {
      console.error('❌ Failed to initialize MetaKey AI:', error);
      app.quit();
    }
  }

  private setupSystemAgentEvents() {
    if (!this.systemAgent) return;

    this.systemAgent.on('hotkey', async (event) => {
      console.log(`🔥 Hotkey triggered: ${event.id} (${event.shortcut})`);
      await this.handleHotkey(event.id);
    });

    this.systemAgent.on('clipboard', (event) => {
      console.log(`📋 Clipboard changed: ${event.text.substring(0, 50)}...`);
      this.clipboardManager?.addToHistory(event.text, event.timestamp);
    });

    this.systemAgent.on('error', (error) => {
      console.error('🔴 System agent error:', error);
    });
  }

  private async registerDefaultHotkeys() {
    if (!this.systemAgent) return;

    const hotkeys = [
      { id: 'spell_default', shortcut: 'ctrl+alt+q' },
      { id: 'settings', shortcut: 'f1' },
      { id: 'clipboard_left', shortcut: 'ctrl+alt+left' },
      { id: 'clipboard_right', shortcut: 'ctrl+alt+right' },
      { id: 'whisper', shortcut: 'ctrl+alt+w' },
      { id: 'echo', shortcut: 'ctrl+alt+e' },
    ];

    for (const hotkey of hotkeys) {
      try {
        await this.systemAgent.registerHotkey(hotkey.id, hotkey.shortcut);
        console.log(`✅ Registered hotkey: ${hotkey.shortcut} → ${hotkey.id}`);
      } catch (error) {
        console.error(`❌ Failed to register hotkey ${hotkey.shortcut}:`, error);
      }
    }
  }

  private async handleHotkey(hotkeyId: string) {
    try {
      switch (hotkeyId) {
        case 'spell_default':
          await this.runDefaultSpell();
          break;
        case 'settings':
          this.openSettings();
          break;
        case 'clipboard_left':
          await this.cycleClipboard(-1);
          break;
        case 'clipboard_right':
          await this.cycleClipboard(1);
          break;
        case 'whisper':
          await this.triggerWhisper();
          break;
        case 'echo':
          await this.triggerEcho();
          break;
        default:
          console.warn(`Unknown hotkey: ${hotkeyId}`);
      }
    } catch (error) {
      console.error(`Error handling hotkey ${hotkeyId}:`, error);
    }
  }

  private async runDefaultSpell() {
    console.log('🪄 Running default spell...');
    
    if (!this.spellRunner || !this.systemAgent) {
      console.error('Spell runner or system agent not initialized');
      return;
    }

    try {
      // Get current clipboard content
      const clipboardText = this.clipboardManager?.getCurrentContent() || '';
      
      if (!clipboardText.trim()) {
        console.log('📋 Clipboard is empty, using example text');
        // For demo purposes, use example text
        const exampleText = `
        MetaKey AI is a cross-platform desktop assistant that lives in the clipboard/hot-key layer, 
        runs user-provided "spells" (text→text), "whispers" (speech→text), "echoes" (text→speech) 
        and "incantations" (multi-step wizards), and can be extended in any programming language. 
        This document freezes MVP functionality and all public contracts for v1.0.
        `;
        
        // Execute the text summarizer spell
        const result = await this.spellRunner.executeSpell(
          'examples/spells/text-summarizer',
          exampleText
        );
        
        // Put result back in clipboard
        await this.systemAgent.setClipboard(result.output);
        console.log('✅ Default spell completed:', result.output);
      } else {
        // Execute the text summarizer spell with clipboard content
        const result = await this.spellRunner.executeSpell(
          'examples/spells/text-summarizer',
          clipboardText
        );
        
        // Put result back in clipboard
        await this.systemAgent.setClipboard(result.output);
        console.log('✅ Default spell completed:', result.output);
      }
      
    } catch (error) {
      console.error('❌ Default spell failed:', error);
    }
  }

  private openSettings() {
    console.log('⚙️ Opening settings...');
    // TODO: Implement settings window
  }

  private async cycleClipboard(direction: number) {
    console.log(`📋 Cycling clipboard ${direction > 0 ? 'forward' : 'backward'}`);
    
    if (!this.clipboardManager || !this.systemAgent) return;
    
    const nextItem = this.clipboardManager.cycle(direction);
    if (nextItem) {
      await this.systemAgent.setClipboard(nextItem);
      console.log(`📋 Switched to: ${nextItem.substring(0, 50)}...`);
    }
  }

  private async triggerWhisper() {
    console.log('🎤 Whisper (Speech-to-Text) triggered...');
    // TODO: Implement whisper functionality
  }

  private async triggerEcho() {
    console.log('🔊 Echo (Text-to-Speech) triggered...');
    // TODO: Implement echo functionality
  }

  private createMainWindow() {
    // Create a minimal window for now
    this.mainWindow = new BrowserWindow({
      width: 400,
      height: 300,
      show: false, // Hidden by default
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // Load a simple HTML page
    this.mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
    
    // Hide on blur
    this.mainWindow.on('blur', () => {
      this.mainWindow?.hide();
    });
  }

  async shutdown() {
    console.log('🔄 Shutting down MetaKey AI...');
    
    try {
      if (this.systemAgent) {
        await this.systemAgent.stop();
      }
      
      if (this.mainWindow) {
        this.mainWindow.close();
      }
      
      console.log('✅ MetaKey AI shut down successfully');
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
    }
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
  // Keep app running even when all windows are closed
  // This is typical for system tray applications
});

app.on('activate', () => {
  // On macOS, re-create window when dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    metaKeyApp.initialize();
  }
}); 