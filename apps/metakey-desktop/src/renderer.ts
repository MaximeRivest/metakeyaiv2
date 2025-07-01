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
import { 
  IpcChannel, 
  Theme, 
  WidgetConfig, 
  ThemeAndLayout, 
  AppState,
  AppMode,
  WidgetStateSource,
  WidgetStateUpdatePayload,
  HotkeyTriggeredPayload,
  EditModePayload
} from 'shared-types';
import { Draggable } from './lib/draggable';
import { BaseWidget, MainHUDView, NotificationsView, StatsView, SpellbookView } from './views';

declare global {
  interface Window {
    ipc: {
      on(channel: IpcChannel.APP_STATE_UPDATE, listener: (state: AppState) => void): () => void;
      on(channel: IpcChannel.WIDGET_STATE_UPDATE, listener: (payload: WidgetStateUpdatePayload) => void): () => void;
      on(channel: IpcChannel.SET_THEME, listener: (payload: ThemeAndLayout) => void): () => void;
      on(channel: IpcChannel.HOTKEY_TRIGGERED, listener: (payload: HotkeyTriggeredPayload) => void): () => void;
      on(channel: IpcChannel.OVERLAY_EDIT_MODE_CHANGED, listener: (payload: EditModePayload) => void): () => void;
      on(channel: string, listener: (...args: any[]) => void): () => void;
      invoke(channel: IpcChannel.OVERLAY_WIDGET_DRAG_END, payload: { widgetId: string, x: number, y: number }): Promise<void>;
      invoke(channel: IpcChannel.LOAD_THEME, themeId: string): Promise<Theme>;
      invoke(channel: string, ...args: any[]): Promise<any>;
    };
  }
}

class Renderer {
  private overlayRoot: HTMLElement;
  private activeDraggables: Draggable[] = [];
  private widgets: BaseWidget[] = [];
  private currentLayout: WidgetConfig[] = [];
  private currentAppState: AppState | null = null;
  
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
    this.currentLayout = [...layout];
    
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
        widgetEl.dataset.stateSource = widgetConfig.stateSource;
        
        // Remove default position classes if custom coordinates are provided
        if (widgetConfig.x !== undefined && widgetConfig.y !== undefined) {
          if (typeof widgetConfig.x === 'string' && widgetConfig.x.endsWith('%')) {
            widgetEl.style.left = `calc(${widgetConfig.x} - ${widgetEl.offsetWidth / 2}px)`;
          } else {
            widgetEl.style.left = `${widgetConfig.x}px`;
          }
          if (typeof widgetConfig.y === 'string' && widgetConfig.y.endsWith('%')) {
            widgetEl.style.top = `calc(${widgetConfig.y} - ${widgetEl.offsetHeight / 2}px)`;
          } else {
            widgetEl.style.top = `${widgetConfig.y}px`;
          }
          widgetEl.style.transform = 'none';
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

    // Apply current app state to newly rendered widgets
    if (this.currentAppState) {
      this.updateWidgetVisibility(this.currentAppState);
      this.updateWidgetStates(this.currentAppState);
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

  private updateWidgetVisibility(state: AppState): void {
    for (const widgetConfig of this.currentLayout) {
      const widgetEl = document.querySelector(`[data-widget-id="${widgetConfig.widgetId}"]`) as HTMLElement;
      if (!widgetEl) continue;

      const shouldBeVisible = this.isWidgetVisible(widgetConfig, state.mode);
      widgetEl.style.display = shouldBeVisible ? 'block' : 'none';
    }
  }

  private isWidgetVisible(widgetConfig: WidgetConfig, currentMode: AppMode): boolean {
    if (!widgetConfig.visibleInModes || widgetConfig.visibleInModes.length === 0) {
      return true; // Always visible if no conditions specified
    }
    return widgetConfig.visibleInModes.includes(currentMode);
  }

  private updateWidgetStates(state: AppState): void {
    // Update each widget with its relevant state slice
    for (const widgetConfig of this.currentLayout) {
      const stateData = this.getStateForSource(state, widgetConfig.stateSource);
      this.updateWidgetWithState(widgetConfig, stateData);
    }
  }

  private getStateForSource(state: AppState, source: WidgetStateSource): any {
    switch (source) {
      case WidgetStateSource.STATUS:
        return state.status;
      case WidgetStateSource.SPELLBOOK:
        return state.spellbook;
      case WidgetStateSource.ECHOES:
        return state.echoes;
      case WidgetStateSource.SETTINGS:
        return state.settings;
      case WidgetStateSource.KEY_STREAM:
        return state.keyStream;
      case WidgetStateSource.STATS:
        return state.stats;
      case WidgetStateSource.NOTIFICATIONS:
        return { notifications: [] }; // This would be managed separately
      case WidgetStateSource.NONE:
      default:
        return {};
    }
  }

  private updateWidgetWithState(widgetConfig: WidgetConfig, stateData: any): void {
    const { widgetId, stateSource } = widgetConfig;

    switch (stateSource) {
      case WidgetStateSource.STATUS:
        if (this.mainHUDView) {
          this.mainHUDView.setStatus(stateData.status, stateData.message);
        }
        break;
             case WidgetStateSource.SPELLBOOK:
         if (this.spellbookView) {
           this.spellbookView.updateState(stateData);
         }
         break;
      case WidgetStateSource.KEY_STREAM:
        if (this.statsView) {
          this.statsView.showPressedKeys(stateData.pressedKeys || '');
        }
        break;
      case WidgetStateSource.STATS:
        if (this.statsView) {
          this.statsView.updateStats(stateData);
        }
        break;
    }
  }

  private registerIpcListeners() {
    window.ipc.on(IpcChannel.SET_THEME, ({ theme, layout }: ThemeAndLayout) => {
      // Load the theme CSS file
      const existingThemeLink = document.head.querySelector('link[data-theme-tokens]');
      if (existingThemeLink) {
        existingThemeLink.remove();
      }
      
      const themeLink = document.createElement('link');
      themeLink.rel = 'stylesheet';
      // Use custom protocol URL for renderer, fallback to file path for packaged app
      themeLink.href = theme.tokensUrl || `file://${theme.tokens}`;
      themeLink.setAttribute('data-theme-tokens', '');
      document.head.appendChild(themeLink);
      
      // Wait for CSS to load before rendering layout
      themeLink.onload = () => {
        console.log(`✅ Theme CSS loaded successfully: ${theme.name}`);
        this.renderLayout(layout);
      };
      
      // Handle CSS load errors
      themeLink.onerror = () => {
        console.error(`❌ Failed to load theme CSS: ${theme.name}`);
        this.renderLayout(layout);
      };
      
      // Fallback in case onload doesn't fire
      setTimeout(() => {
        this.renderLayout(layout);
      }, 100);
    });

    // Listen for unified app state updates
    window.ipc.on(IpcChannel.APP_STATE_UPDATE, (state: AppState) => {
      console.log('App state updated:', state);
      this.currentAppState = state;
      
      // Update widget visibility based on current mode
      this.updateWidgetVisibility(state);
      
      // Update each widget with its relevant state
      this.updateWidgetStates(state);
    });

    // Listen for individual widget state updates (for targeted updates)
    window.ipc.on(IpcChannel.WIDGET_STATE_UPDATE, (payload: WidgetStateUpdatePayload) => {
      const { target, state } = payload;
      
      if ('widgetId' in target) {
        // Update specific widget by ID
        const widgetConfig = this.currentLayout.find(w => w.widgetId === target.widgetId);
        if (widgetConfig) {
          this.updateWidgetWithState(widgetConfig, state);
        }
      } else if ('stateSource' in target) {
        // Update all widgets with this state source
        const widgetsToUpdate = this.currentLayout.filter(w => w.stateSource === target.stateSource);
        for (const widgetConfig of widgetsToUpdate) {
          this.updateWidgetWithState(widgetConfig, state);
        }
      }
    });

    window.ipc.on(IpcChannel.HOTKEY_TRIGGERED, (payload: HotkeyTriggeredPayload) => {
      this.notificationsView?.showNotification(payload);
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
        <h1 style="color:rgb(219, 38, 38); margin-bottom: 16px;">Application Error</h1>
        <p style="color: #333; margin-bottom: 16px;">Failed to load a critical component. The IPC bridge between the main process and renderer is not available.</p>
        <p style="color: #666; font-size: 14px;">Please check the developer console for details and restart the application.</p>
      </div>
    </div>`;
    return;
  }
  new Renderer();
});
