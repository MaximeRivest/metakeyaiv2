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
import { IpcChannel, OverlayStatus, Theme, KeyEvent, OverlayContent, HotkeyTriggeredPayload, EditModePayload, WidgetConfig, ThemeAndLayout, SpellbookEntry, SpellbookMenuItem } from 'shared-types';
import { Draggable } from './lib/draggable';
import { BaseWidget, MainHUDView, NotificationsView, StatsView, SpellbookView } from './views';

declare global {
  interface Window {
    ipc: {
      on(channel: IpcChannel.OVERLAY_SET_STATUS, listener: (status: OverlayStatus) => void): () => void;
      on(channel: IpcChannel.OVERLAY_SHOW_CONTENT, listener: (content: OverlayContent) => void): () => void;
      on(channel: IpcChannel.SET_THEME, listener: (payload: ThemeAndLayout) => void): () => void;
      on(channel: IpcChannel.HOTKEY_TRIGGERED, listener: (payload: HotkeyTriggeredPayload) => void): () => void;
      on(channel: IpcChannel.OVERLAY_EDIT_MODE_CHANGED, listener: (payload: EditModePayload) => void): () => void;
      on(channel: IpcChannel.SPELLBOOK_UPDATE, listener: (payload: { spells: SpellbookEntry[]; menu: SpellbookMenuItem[] }) => void): () => void;
      on(channel: IpcChannel.SPELL_START, listener: (payload: { spellId: string; metadata: any }) => void): () => void;
      on(channel: IpcChannel.SPELL_SUCCESS, listener: (payload: { spellId: string; metadata: any; result: { output: string } }) => void): () => void;
      on(channel: IpcChannel.SPELL_ERROR, listener: (payload: { spellId: string; metadata: any; error: Error }) => void): () => void;
      invoke(channel: IpcChannel.OVERLAY_WIDGET_DRAG_END, payload: { widgetId: string, x: number, y: number }): Promise<void>;
      invoke(channel: IpcChannel.LOAD_THEME, themeId: string): Promise<Theme>;
      invoke(channel: IpcChannel.SPELLBOOK_CLOSE_REQUEST): Promise<void>;
      invoke(channel: IpcChannel.SPELL_EXECUTE, payload: { spellId: string }): Promise<void>;
    };
  }
}

class Renderer {
  private overlayRoot: HTMLElement;
  private activeDraggables: Draggable[] = [];
  private widgets: BaseWidget[] = [];
  
  // Widget instances
  private mainHUDView: MainHUDView | null = null;
  private notificationsView: NotificationsView | null = null;
  private statsView: StatsView | null = null;
  private spellbookView: SpellbookView | null = null;

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
    // Clean up existing widgets
    this.cleanupWidgets();
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
        
        // Remove default position classes if custom coordinates are provided
        if (widgetConfig.x !== undefined && widgetConfig.y !== undefined) {
          widgetEl.style.left = `${widgetConfig.x}px`;
          widgetEl.style.top = `${widgetConfig.y}px`;
          
          if (widgetConfig.widgetId === 'main-hud') {
            widgetEl.style.transform = 'none'; // Override centering
          }
        }
        
        this.overlayRoot.appendChild(widgetEl);
        console.log(`Rendered widget: ${widgetConfig.widgetId}`);
      }
    }
    
    // Initialize widget views
    this.initializeWidgets();

    // If we are in edit mode, make the new widgets draggable
    if (this.overlayRoot.classList.contains('edit-mode')) {
      this.enableDrag();
    }
  }

  private initializeWidgets() {
    // Helper to mount and register widget instances if present
    const addWidget = <T extends BaseWidget>(widget: T | null): void => {
      if (!widget) return;
      widget.mount();
      if (widget.exists()) {
        this.widgets.push(widget);
      }
    };

    // MainHUD
    this.mainHUDView = new MainHUDView(this.overlayRoot);
    addWidget(this.mainHUDView);

    // Notifications
    this.notificationsView = new NotificationsView();
    addWidget(this.notificationsView);

    // Stats
    this.statsView = new StatsView();
    addWidget(this.statsView);

    // SpellBook
    this.spellbookView = new SpellbookView();
    addWidget(this.spellbookView);
  }

  private cleanupWidgets() {
    // Destroy all widget instances
    this.widgets.forEach(widget => widget.destroy());
    this.widgets = [];
    
    this.mainHUDView = null;
    this.notificationsView = null;
    this.statsView = null;
    this.spellbookView = null;
  }

  private enableDrag() {
    this.cleanupDraggables();
    const widgets = this.overlayRoot.querySelectorAll<HTMLElement>('.widget');
    widgets.forEach(widget => {
      widget.style.cursor = 'grab';
      const draggable = new Draggable(widget, {
        onDragEnd: (el, x, y) => {
          const widgetId = el.dataset.widgetId;
          if (widgetId) {
            window.ipc.invoke(IpcChannel.OVERLAY_WIDGET_DRAG_END, { widgetId, x, y });
          }
        }
      });
      this.activeDraggables.push(draggable);
    });
  }

  private disableDrag() {
    this.cleanupDraggables();
    const widgets = this.overlayRoot.querySelectorAll<HTMLElement>('.widget');
    widgets.forEach(widget => {
      widget.style.cursor = 'default';
    });
  }

  private cleanupDraggables() {
    this.activeDraggables.forEach(d => d.destroy());
    this.activeDraggables = [];
  }

  private registerIpcListeners() {
    window.ipc.on(IpcChannel.SET_THEME, ({ theme, layout }: ThemeAndLayout) => {
    const root = document.documentElement;
    for (const [key, value] of Object.entries(theme.tokens)) {
      root.style.setProperty(key, value as string);
    }
      this.renderLayout(layout);
    });

    window.ipc.on(IpcChannel.SPELLBOOK_UPDATE, (payload) => {
      this.spellbookView?.update(payload);
  });

  window.ipc.on(IpcChannel.OVERLAY_SET_STATUS, (payload: OverlayStatus) => {
      this.mainHUDView?.setStatus(payload.status, payload.message);
  });

  window.ipc.on(IpcChannel.OVERLAY_SHOW_CONTENT, (payload: OverlayContent) => {
    if (payload.type === 'SPELL_RESULT') {
        this.mainHUDView?.showContent(payload);
    } else if (payload.type === 'KEY_STREAM') {
        this.statsView?.showPressedKeys(payload.keys || '');
    }
  });
  
  window.ipc.on(IpcChannel.HOTKEY_TRIGGERED, (payload: HotkeyTriggeredPayload) => {
      this.notificationsView?.showNotification(payload);
    });

    window.ipc.on(IpcChannel.SPELL_START, ({ metadata }) => {
      this.mainHUDView?.setStatus('processing', `Casting ${metadata.spellTitle || 'spell'}...`);
    });

    window.ipc.on(IpcChannel.SPELL_SUCCESS, ({ metadata, result }) => {
      this.mainHUDView?.setStatus('success', 'Spell Complete!');
      this.mainHUDView?.showSpellResult(metadata.spellTitle || 'Spell Result', result.output);
    });

    window.ipc.on(IpcChannel.SPELL_ERROR, ({ metadata, error }) => {
      this.mainHUDView?.setStatus('error', error.message || 'An unknown error occurred.');
  });

  window.ipc.on(IpcChannel.OVERLAY_EDIT_MODE_CHANGED, ({ isEditMode }) => {
    if (isEditMode) {
        this.overlayRoot.classList.add('edit-mode');
        this.enableDrag();
    } else {
        this.overlayRoot.classList.remove('edit-mode');
        this.disableDrag();
    }
  });
  }


}

document.addEventListener('DOMContentLoaded', () => {
  if (!window.ipc) {
    console.error('FATAL: The IPC bridge is not available. The preload script likely failed to execute.');
    // Display a user-friendly error message in the UI
    document.body.innerHTML = `<div style="color: red; padding: 20px; font-family: system-ui, sans-serif; background: rgba(0,0,0,0.9); position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 9999; display: flex; align-items: center; justify-content: center;">
      <div style="background: white; padding: 40px; border-radius: 8px; max-width: 500px; text-align: center;">
        <h1 style="color: #d32f2f; margin-bottom: 16px;">Application Error</h1>
        <p style="color: #333; margin-bottom: 16px;">Failed to load a critical component. The IPC bridge between the main process and renderer is not available.</p>
        <p style="color: #666; font-size: 14px;">Please check the developer console for details and restart the application.</p>
      </div>
    </div>`;
    return;
  }
  new Renderer();
});
