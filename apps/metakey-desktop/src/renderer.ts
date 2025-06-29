/**
 * This file will automatically be loaded by webpack and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/latest/tutorial/process-model
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.js` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import './index.css';
import { IpcChannel, OverlayStatus, Theme, KeyEvent, OverlayContent, HotkeyTriggeredPayload, EditModePayload, WidgetConfig, ThemeAndLayout } from 'shared-types';

declare global {
  interface Window {
    ipc: {
      on(channel: IpcChannel.OVERLAY_SET_STATUS, listener: (status: OverlayStatus) => void): () => void;
      on(channel: IpcChannel.OVERLAY_SHOW_CONTENT, listener: (content: OverlayContent) => void): () => void;
      on(channel: IpcChannel.SET_THEME, listener: (payload: ThemeAndLayout) => void): () => void;
      on(channel: IpcChannel.HOTKEY_TRIGGERED, listener: (payload: HotkeyTriggeredPayload) => void): () => void;
      on(channel: IpcChannel.OVERLAY_EDIT_MODE_CHANGED, listener: (payload: EditModePayload) => void): () => void;
    };
  }
}

class Renderer {
  private overlayRoot: HTMLElement;

  // These elements are dynamic, so we need methods to find them.
  private get statusMessageEl() { return document.querySelector<HTMLElement>('.status-message'); }
  private get contentDisplayEl() { return document.querySelector<HTMLElement>('#content-display'); }
  private get contentTitleEl() { return document.querySelector<HTMLElement>('#content-title'); }
  private get contentBodyEl() { return document.querySelector<HTMLElement>('#content-body'); }
  private get pressedKeysDisplayEl() { return document.querySelector<HTMLElement>('#pressed-keys-display'); }
  private get hotkeyTriggerDisplayEl() { return document.querySelector<HTMLElement>('#hotkey-trigger-display'); }

  constructor() {
    this.overlayRoot = document.getElementById('overlay-root');
    if (!this.overlayRoot) {
      console.error('#overlay-root not found -- check your HTML');
      return;
    }

    this.init();
  }

  private init() {
    console.log('👋 This message is being logged by "renderer.ts", included via webpack');

    const themeStyleTag = document.createElement('link');
    themeStyleTag.rel = 'stylesheet';
    document.head.appendChild(themeStyleTag);

    this.registerIpcListeners();
  }
  
  private renderLayout(layout: WidgetConfig[]) {
    // Clear any existing widgets
    this.overlayRoot.innerHTML = '';
    
    for (const widgetConfig of layout) {
      const template = document.getElementById(`template-${widgetConfig.component}`) as HTMLTemplateElement;
      if (!template) {
        console.warn(`Widget template for component "${widgetConfig.component}" not found.`);
        continue;
      }
      
      const widgetFragment = template.content.cloneNode(true) as DocumentFragment;
      const widgetEl = widgetFragment.querySelector<HTMLElement>('.widget');
      
      if (widgetEl) {
        widgetEl.dataset.widgetId = widgetConfig.widgetId;
        widgetEl.dataset.size = widgetConfig.size;
        this.overlayRoot.appendChild(widgetEl);
        console.log(`Rendered widget: ${widgetConfig.widgetId}`);
      }
    }
  }

  private registerIpcListeners() {
    window.ipc.on(IpcChannel.SET_THEME, ({ theme, layout }: ThemeAndLayout) => {
      const root = document.documentElement;
      for (const [key, value] of Object.entries(theme.tokens)) {
        root.style.setProperty(key, value as string);
      }
      this.renderLayout(layout);
    });

    window.ipc.on(IpcChannel.OVERLAY_SET_STATUS, (payload: OverlayStatus) => {
      const { statusMessageEl, contentDisplayEl, pressedKeysDisplayEl } = this;
      if (!statusMessageEl) return;

      // Hide content displays when a new status comes in.
      if (contentDisplayEl) contentDisplayEl.style.display = 'none';
      if (pressedKeysDisplayEl) pressedKeysDisplayEl.style.display = 'none';
      statusMessageEl.style.display = 'block';

      // Remove all state classes first
      this.overlayRoot.classList.remove('success', 'error', 'idle', 'processing', 'listening');

      // Add the current state class
      if (payload.status) {
        this.overlayRoot.classList.add(payload.status);
      }

      if (payload.message) {
        statusMessageEl.innerHTML = payload.message;
      } else {
        statusMessageEl.innerHTML = '';
      }
    });

    window.ipc.on(IpcChannel.OVERLAY_SHOW_CONTENT, (payload: OverlayContent) => {
      // When showing specific content, hide the generic status message
      const { statusMessageEl } = this;
      if (statusMessageEl) {
        statusMessageEl.style.display = 'none';
      }

      if (payload.type === 'SPELL_RESULT') {
        const { contentDisplayEl, contentTitleEl, contentBodyEl } = this;
        if (contentDisplayEl && contentTitleEl && contentBodyEl) {
          contentTitleEl.innerText = payload.title;
          contentBodyEl.innerText = payload.body; // For now, just text. Markdown later.
          contentDisplayEl.style.display = 'block';
        }
      } else if (payload.type === 'KEY_STREAM') {
        const { pressedKeysDisplayEl } = this;
        if (pressedKeysDisplayEl) {
          if (payload.keys && payload.keys.length > 0) {
            pressedKeysDisplayEl.innerText = payload.keys;
            pressedKeysDisplayEl.style.display = 'block';
          } else {
            pressedKeysDisplayEl.style.display = 'none';
          }
        }
      }
    });
    
    window.ipc.on(IpcChannel.HOTKEY_TRIGGERED, (payload: HotkeyTriggeredPayload) => {
      const { hotkeyTriggerDisplayEl } = this;
      if (hotkeyTriggerDisplayEl) {
        hotkeyTriggerDisplayEl.style.opacity = '1'; // Make container visible
        
        const triggerEl = document.createElement('div');
        triggerEl.className = 'trigger-item';
        triggerEl.innerText = `[${payload.shortcut}] → ${payload.spellTitle}`;
        
        hotkeyTriggerDisplayEl.appendChild(triggerEl);
        
        const duration = getComputedStyle(document.documentElement)
          .getPropertyValue('--mx-hotkey-trigger-duration') || '3000ms';
        
        const durationMs = parseFloat(duration);

        setTimeout(() => {
          triggerEl.remove();
          // Hide container if no more items
          if (hotkeyTriggerDisplayEl.childElementCount === 0) {
            hotkeyTriggerDisplayEl.style.opacity = '0';
          }
        }, durationMs);
      }
    });

    window.ipc.on(IpcChannel.OVERLAY_EDIT_MODE_CHANGED, ({ isEditMode }) => {
      if (isEditMode) {
        this.overlayRoot.classList.add('edit-mode');
      } else {
        this.overlayRoot.classList.remove('edit-mode');
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new Renderer();
});
