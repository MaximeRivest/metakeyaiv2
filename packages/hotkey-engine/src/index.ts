import { SystemAgentService } from 'system-agent-engine';
import { HotkeyBinding } from 'config-engine';

type ActionHandler = (binding: HotkeyBinding) => void;

export interface HotkeyEngineOptions {
  systemAgentService: SystemAgentService;
}

export class HotkeyEngine {
  private options: HotkeyEngineOptions;
  private actions: Map<string, ActionHandler> = new Map();
  private bindings: Map<string, HotkeyBinding> = new Map();

  constructor(options: HotkeyEngineOptions) {
    this.options = options;
    // The agent now sends the unique shortcut string as the ID.
    this.options.systemAgentService.on('hotkey_pressed', (event: { id: string }) => {
      this.handleHotkeyPress(event.id);
    });
  }

  public registerAction(actionId: string, handler: ActionHandler): void {
    if (this.actions.has(actionId)) {
      console.warn(`Action "${actionId}" is already registered. Overwriting.`);
    }
    this.actions.set(actionId, handler);
  }

  public registerBindings(bindings: HotkeyBinding[]): void {
    // Unregister each previously registered binding individually.
    for (const oldBinding of this.bindings.values()) {
      this.options.systemAgentService.unregisterHotkey(oldBinding.shortcut, oldBinding.shortcut);
    }
    this.bindings.clear();
    
    for (const binding of bindings) {
      if (this.actions.has(binding.actionId)) {
        // Tell the system agent to use the shortcut as the unique ID.
        this.options.systemAgentService.registerHotkey(binding.shortcut, binding.shortcut);
      }
    }
    this.bindings = new Map(bindings.map(b => [b.shortcut, b]));
  }

  private handleHotkeyPress(shortcutId: string): void {
    // The hotkeyId from the agent is the unique shortcut string.
    const binding = this.bindings.get(shortcutId);

    if (binding) {
      const handler = this.actions.get(binding.actionId);
      if (handler) {
        // Execute the handler with the specific payload for this shortcut.
        handler(binding);
      } else {
        console.warn(`No action handler found for actionId: ${binding.actionId}`);
      }
    } else {
      console.warn(`No binding found for hotkey press: ${shortcutId}`);
    }
  }
} 