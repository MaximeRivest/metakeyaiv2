/* eslint-disable no-unused-vars */

/**
 * Defines the names of all IPC channels, following a `domain:action` pattern.
 * This provides a clear, organized, and type-safe way to manage inter-process communication.
 */
export enum IpcChannel {
  // Theme Engine
  SET_THEME = 'theme:set',
  LOAD_THEME = 'theme:load-theme',

  // Unified Widget State Management
  WIDGET_STATE_UPDATE = 'widget:state-update',
  
  // Application State Management
  APP_STATE_UPDATE = 'app:state-update',

  // System Agent -> Main Process
  AGENT_KEY_EVENT = 'agent:key-event',
  
  // Hotkey Engine -> Main Process -> Renderer
  HOTKEY_TRIGGERED = 'hotkey:triggered',

  // Overlay Edit Mode
  OVERLAY_TOGGLE_EDIT_MODE = 'overlay:toggle-edit-mode',
  OVERLAY_EDIT_MODE_CHANGED = 'overlay:edit-mode-changed',
  OVERLAY_WIDGET_DRAG_END = 'overlay:widget-drag-end',

  // Generic Navigation
  NAVIGATION_INPUT = 'navigation:input',
  WIDGET_ACTION_REQUEST = 'widget:action-request',
}

/**
 * Application modes that drive the UI state
 */
export enum AppMode {
  IDLE = 'idle',
  SPELLBOOK = 'spellbook',
  ECHOES = 'echoes',
  SETTINGS = 'settings',
  EDIT = 'edit'
}

/**
 * State sources that widgets can bind to
 */
export enum WidgetStateSource {
  NONE = 'none',
  STATUS = 'status',
  SPELLBOOK = 'spellbook',
  ECHOES = 'echoes', 
  SETTINGS = 'settings',
  KEY_STREAM = 'key-stream',
  NOTIFICATIONS = 'notifications',
  STATS = 'stats'
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
  stateSource: WidgetStateSource;
  size: 'orb' | 'mini' | 'small' | 'medium' | 'full';
  x?: number | string;
  y?: number | string;
  // Optional visibility condition based on app mode
  visibleInModes?: AppMode[];
}

export interface DisplayLayout {
  primary?: WidgetConfig[];
  secondary?: WidgetConfig[][];
}

export interface ThemeLayouts {
  // Key is the number of displays, e.g., "1", "2". "default" can be a fallback.
  [displayCount: string]: DisplayLayout;
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
  tokensUrl?: string; // The custom protocol URL for loading in renderer
  layouts?: ThemeLayouts;
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

export interface SpellbookEntry {
  spellId: string;
  spellTitle: string;
  shortcut: string;
}

/**
 * Icon names for spellbook menu items
 */
export enum SpellbookMenuIcon {
  SPELLS = 'book-open',
  ECHOES = 'clock-rotate-left',
  THEMES = 'palette',
  SETTINGS = 'settings',
  SEARCH = 'search',
  FAVORITES = 'heart'
}

export interface SpellbookMenuItem {
  id: string;
  label: string;
  icon: SpellbookMenuIcon;
  hotkey?: string;
}

/**
 * Unified widget state update payload
 */
export interface WidgetStateUpdatePayload {
  target: { widgetId: string } | { stateSource: WidgetStateSource };
  state: any;
}

/**
 * Application state that drives the entire UI
 */
export interface AppState {
  mode: AppMode;
  status: OverlayStatus;
  spellbook: {
    isVisible: boolean;
    entries: SpellbookEntry[];
    menu: SpellbookMenuItem[];
    selectedMenu: string;
    selectedSpell: number;
    navigationMode: 'menu' | 'grid';
  };
  echoes: {
    isVisible: boolean;
    currentTrack?: string;
    speed: number;
    voice: string;
  };
  settings: {
    isVisible: boolean;
    currentPanel: string;
  };
  keyStream: {
    pressedKeys: string;
  };
  stats: {
    tokensPerSecond: number;
    backgroundTasks: number;
    totalTracks: number;
    currentTrackClipboard: number;
    totalClipboard: number;
    pressedKeys?: string;
  };
}

/**
 * Navigation input payload for unified keyboard handling
 */
export interface NavigationInputPayload {
  key: string;
  mode: AppMode;
}

/**
 * Widget action request payload for generic widget interactions
 */
export interface WidgetActionRequestPayload {
  widgetId: string;
  action: string;
  payload?: any;
}

/**
 * A map of IPC channel names to their listener function signatures.
 * This is used by the preload script to strongly type the `window.ipc.on` method,
 * preventing mismatches between sent and received data.
 */
export type IpcListenerSignatures = {
  [IpcChannel.SET_THEME]: (payload: ThemeAndLayout) => void;
  [IpcChannel.WIDGET_STATE_UPDATE]: (payload: WidgetStateUpdatePayload) => void;
  [IpcChannel.APP_STATE_UPDATE]: (payload: AppState) => void;
  [IpcChannel.AGENT_KEY_EVENT]: (payload: KeyEvent) => void;
  [IpcChannel.HOTKEY_TRIGGERED]: (payload: HotkeyTriggeredPayload) => void;
  [IpcChannel.OVERLAY_EDIT_MODE_CHANGED]: (payload: EditModePayload) => void;
  [IpcChannel.NAVIGATION_INPUT]: (payload: NavigationInputPayload) => void;
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
  [IpcChannel.WIDGET_ACTION_REQUEST]: (payload: WidgetActionRequestPayload) => Promise<void>;
}; 