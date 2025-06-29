/* eslint-disable no-unused-vars */

/**
 * Defines the names of all IPC channels, following a `domain:action` pattern.
 * This provides a clear, organized, and type-safe way to manage inter-process communication.
 */
export enum IpcChannel {
  // Theme Engine
  SET_THEME = 'theme:set-theme',
  LOAD_THEME = 'theme:load-theme',

  // Overlay State & Content
  OVERLAY_SET_STATUS = 'overlay:set-status',
  OVERLAY_SHOW_CONTENT = 'overlay:show-content',

  // System Agent -> Main Process
  AGENT_KEY_EVENT = 'agent:key-event',
  
  // Hotkey Engine -> Main Process -> Renderer
  HOTKEY_TRIGGERED = 'hotkey:triggered',

  // Overlay Edit Mode
  OVERLAY_TOGGLE_EDIT_MODE = 'overlay:toggle-edit-mode',
  OVERLAY_EDIT_MODE_CHANGED = 'overlay:edit-mode-changed',
  OVERLAY_WIDGET_DRAG_END = 'overlay:widget-drag-end',
}

/**
 * Represents the general status of the application, often shown in a small
 * part of the overlay like the "orb".
 */
export interface OverlayStatus {
  status: 'idle' | 'listening' | 'processing' | 'success' | 'error';
  message?: string;
}

export interface WidgetConfig {
  widgetId: string;
  component: string;
  size: 'orb' | 'mini' | 'small' | 'medium' | 'full';
  x?: number;
  y?: number;
}

export interface ThemeLayout {
  primary?: WidgetConfig[];
  secondary?: WidgetConfig[];
}

/**
 * Defines the different kinds of rich content the overlay can display.
 * This allows for a flexible and extensible presentation layer.
 */
export type OverlayContent = {
  id: string; // Unique ID for this content, can be used for updates/dismissal
  type: 'SPELL_RESULT';
  title: string;
  body: string;
  format: 'plaintext' | 'markdown' | 'diff';
} | {
  id: string;
  type: 'KEY_STREAM';
  keys: string;
};

/**
 * The data payload for a single keyboard event from the system agent.
 */
export interface KeyEvent {
  event_type: 'KeyPress' | 'KeyRelease';
  key: string;
}

/**
 * The data payload that describes a theme.
 */
export interface Theme {
  id: string; // The directory name of the theme
  name: string; // The human-readable name from theme.json
  tokens: string; // The absolute path to the tokens.css file
  layout?: ThemeLayout;
}

/**
 * The data payload sent to a renderer process to apply a theme and a specific layout.
 */
export interface ThemeAndLayout {
  theme: Theme;
  layout: WidgetConfig[];
}

/**
 * The data payload when a registered hotkey is successfully triggered.
 */
export interface HotkeyTriggeredPayload {
  shortcut: string;
  actionId: string;
  spellTitle?: string;
}

/**
 * The data payload for the edit mode state change.
 */
export interface EditModePayload {
  isEditMode: boolean;
}

/**
 * A map of IPC channel names to their listener function signatures.
 * This is used by the preload script to strongly type the `window.ipc.on` method,
 * preventing mismatches between sent and received data.
 */
export type IpcListenerSignatures = {
  [IpcChannel.SET_THEME]: (payload: ThemeAndLayout) => void;
  [IpcChannel.OVERLAY_SET_STATUS]: (payload: OverlayStatus) => void;
  [IpcChannel.OVERLAY_SHOW_CONTENT]: (payload: OverlayContent) => void;
  [IpcChannel.AGENT_KEY_EVENT]: (event: KeyEvent) => void;
  [IpcChannel.HOTKEY_TRIGGERED]: (payload: HotkeyTriggeredPayload) => void;
  [IpcChannel.OVERLAY_EDIT_MODE_CHANGED]: (payload: EditModePayload) => void;
};

/**
 * Defines the signatures for IPC handlers that can be invoked from a renderer
 * process and return a promise (i.e., using `ipcMain.handle`).
 */
export type IpcInvokeSignatures = {
  [IpcChannel.LOAD_THEME]: (themeId: string) => Promise<Theme>;
  [IpcChannel.OVERLAY_WIDGET_DRAG_END]: (payload: {
    widgetId: string;
    x: number;
    y: number;
  }) => Promise<void>;
}; 