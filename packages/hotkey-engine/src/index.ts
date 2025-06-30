import { EventEmitter } from 'events';
import { HotkeyBinding } from 'config-engine';
import { SystemAgentService } from 'system-agent-engine';

export interface HotkeyEngineOptions {
  systemAgentService: SystemAgentService;
}

export class HotkeyEngine extends EventEmitter {
  private options: HotkeyEngineOptions;
  private bindings: Map<string, HotkeyBinding> = new Map();
  private actions: Map<string, (binding: HotkeyBinding) => Promise<void> | void> = new Map();

  constructor(options: HotkeyEngineOptions) {
    super();
    this.options = options;
    this.options.systemAgentService.on('hotkey_pressed', (event: { id: string }) => this.onHotkey(event.id));
  }

  private onHotkey(id: string) {
    const binding = this.bindings.get(id);
    if (binding) {
      const handler = this.actions.get(binding.actionId);
      if (handler) {
        const result = handler(binding);
        if (result instanceof Promise) {
          result.catch(err => {
            console.error(`[HotkeyEngine] Error executing async action for hotkey "${id}":`, err);
          });
        }
      }
    }
  }

  public registerBindings(bindings: HotkeyBinding[]): void {
    console.log(`[HotkeyEngine] Registering ${bindings.length} hotkey bindings using batch operation`);
    
    // Step 1: Unregister all existing hotkeys with a single command
    this.options.systemAgentService.unregisterAllHotkeys();
    
    // Step 2: Register new hotkeys in batch, but only for actions that have handlers
    const hotkeysToRegister = bindings
      .filter(binding => this.actions.has(binding.actionId))
      .map(binding => ({
        id: binding.shortcut,  // Use shortcut as the unique ID
        shortcut: binding.shortcut
      }));
    
    if (hotkeysToRegister.length > 0) {
      this.options.systemAgentService.registerHotkeys(hotkeysToRegister);
    }
    
    this.bindings = new Map(bindings.map(b => [b.shortcut, b]));
    console.log(`[HotkeyEngine] Successfully registered ${hotkeysToRegister.length} hotkeys`);
  }

  public registerAction(actionId: string, handler: (binding: HotkeyBinding) => Promise<void> | void): void {
    this.actions.set(actionId, handler);
  }

  public getBindings(): HotkeyBinding[] {
    return Array.from(this.bindings.values());
  }
} 