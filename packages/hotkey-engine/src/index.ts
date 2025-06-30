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
    // Unregister each previously registered binding individually.
    for (const oldBinding of this.bindings.values()) {
      this.options.systemAgentService.unregisterHotkey(oldBinding.shortcut, oldBinding.shortcut);
    }
    
    for (const binding of bindings) {
      if (this.actions.has(binding.actionId)) {
        // Tell the system agent to use the shortcut as the unique ID.
        this.options.systemAgentService.registerHotkey(binding.shortcut, binding.shortcut);
      }
    }
    this.bindings = new Map(bindings.map(b => [b.shortcut, b]));
  }

  public registerAction(actionId: string, handler: (binding: HotkeyBinding) => Promise<void> | void): void {
    this.actions.set(actionId, handler);
  }

  public getBindings(): HotkeyBinding[] {
    return Array.from(this.bindings.values());
  }
} 