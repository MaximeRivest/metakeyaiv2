import { EventEmitter } from 'events';
import { AppState, AppMode, OverlayStatus, SpellbookEntry, SpellbookMenuItem, WidgetStateSource } from 'shared-types';

/**
 * Central application state manager that drives the entire UI.
 * This replaces the previous distributed state management approach.
 */
export class AppStateManager extends EventEmitter {
  private state: AppState;

  constructor() {
    super();
    this.state = this.createInitialState();
  }

  private createInitialState(): AppState {
    return {
      mode: AppMode.IDLE,
      status: {
        status: 'idle',
        message: 'Ready'
      },
      spellbook: {
        isVisible: false,
        entries: [],
        menu: [],
        selectedMenu: 'spells',
        selectedSpell: 0,
        navigationMode: 'menu'
      },
      echoes: {
        isVisible: false,
        speed: 1.0,
        voice: 'default'
      },
      settings: {
        isVisible: false,
        currentPanel: 'general'
      },
      keyStream: {
        pressedKeys: ''
      },
      stats: {
        tokensPerSecond: 0,
        backgroundTasks: 0,
        totalTracks: 1,
        currentTrackClipboard: 0,
        totalClipboard: 0
      }
    };
  }

  /**
   * Get the current application state
   */
  public getState(): AppState {
    return { ...this.state };
  }

  /**
   * Set the application mode and update visibility accordingly
   */
  public setMode(mode: AppMode): void {
    const previousMode = this.state.mode;
    this.state.mode = mode;

    // Update visibility states based on mode
    this.state.spellbook.isVisible = mode === AppMode.SPELLBOOK;
    this.state.echoes.isVisible = mode === AppMode.ECHOES;
    this.state.settings.isVisible = mode === AppMode.SETTINGS;

    this.emit('state-changed', this.state);
    this.emit('mode-changed', { previous: previousMode, current: mode });
  }

  /**
   * Update the application status
   */
  public setStatus(status: OverlayStatus): void {
    this.state.status = { ...status };
    this.emit('state-changed', this.state);
    this.emit('status-changed', status);
  }

  /**
   * Update the key stream display
   */
  public setKeyStream(keys: string): void {
    this.state.keyStream.pressedKeys = keys;
    this.emit('state-changed', this.state);
    this.emit('key-stream-changed', keys);
  }

  /**
   * Update spellbook data
   */
  public updateSpellbook(entries: SpellbookEntry[], menu: SpellbookMenuItem[]): void {
    this.state.spellbook.entries = [...entries];
    this.state.spellbook.menu = [...menu];
    this.emit('state-changed', this.state);
    this.emit('spellbook-data-changed', { entries, menu });
  }

  /**
   * Navigate within the spellbook
   */
  public navigateSpellbook(direction: 'up' | 'down' | 'left' | 'right' | 'enter' | 'escape'): void {
    const spellbook = this.state.spellbook;
    
    if (!spellbook.isVisible) return;

    if (spellbook.navigationMode === 'menu') {
      this.handleMenuNavigation(direction);
    } else {
      this.handleGridNavigation(direction);
    }

    this.emit('state-changed', this.state);
    this.emit('spellbook-navigation-changed', spellbook);
  }

  private handleMenuNavigation(direction: string): void {
    const spellbook = this.state.spellbook;
    const menuCount = spellbook.menu.length;
    const currentMenuIndex = spellbook.menu.findIndex(m => m.id === spellbook.selectedMenu);

    switch (direction) {
      case 'left':
        const prevIndex = Math.max(0, currentMenuIndex - 1);
        spellbook.selectedMenu = spellbook.menu[prevIndex]?.id || spellbook.selectedMenu;
        break;
      case 'right':
        const nextIndex = Math.min(menuCount - 1, currentMenuIndex + 1);
        spellbook.selectedMenu = spellbook.menu[nextIndex]?.id || spellbook.selectedMenu;
        break;
      case 'down':
      case 'enter':
        if (spellbook.selectedMenu === 'spells' && spellbook.entries.length > 0) {
          spellbook.navigationMode = 'grid';
          spellbook.selectedSpell = 0;
        }
        break;
      case 'escape':
        this.setMode(AppMode.IDLE);
        break;
    }
  }

  private handleGridNavigation(direction: string): void {
    const spellbook = this.state.spellbook;
    const spellCount = spellbook.entries.length;
    
    if (spellCount === 0) return;

    // Calculate grid dimensions (assuming 3 columns for now)
    const columns = 3;
    const rows = Math.ceil(spellCount / columns);
    const currentRow = Math.floor(spellbook.selectedSpell / columns);
    const currentCol = spellbook.selectedSpell % columns;

    switch (direction) {
      case 'up':
        if (currentRow > 0) {
          spellbook.selectedSpell = Math.max(0, spellbook.selectedSpell - columns);
        } else {
          spellbook.navigationMode = 'menu';
        }
        break;
      case 'down':
        if (currentRow < rows - 1) {
          spellbook.selectedSpell = Math.min(spellCount - 1, spellbook.selectedSpell + columns);
        }
        break;
      case 'left':
        spellbook.selectedSpell = Math.max(0, spellbook.selectedSpell - 1);
        break;
      case 'right':
        spellbook.selectedSpell = Math.min(spellCount - 1, spellbook.selectedSpell + 1);
        break;
      case 'enter':
        this.emit('spell-execute-request', spellbook.entries[spellbook.selectedSpell]);
        this.setMode(AppMode.IDLE);
        break;
      case 'escape':
        this.setMode(AppMode.IDLE);
        break;
    }
  }

  /**
   * Update statistics
   */
  public updateStats(stats: Partial<AppState['stats']>): void {
    this.state.stats = { ...this.state.stats, ...stats };
    this.emit('state-changed', this.state);
    this.emit('stats-changed', this.state.stats);
  }

  /**
   * Get state for a specific widget source
   */
  public getStateForSource(source: WidgetStateSource): any {
    switch (source) {
      case WidgetStateSource.STATUS:
        return this.state.status;
      case WidgetStateSource.SPELLBOOK:
        return this.state.spellbook;
      case WidgetStateSource.ECHOES:
        return this.state.echoes;
      case WidgetStateSource.SETTINGS:
        return this.state.settings;
      case WidgetStateSource.KEY_STREAM:
        return this.state.keyStream;
      case WidgetStateSource.STATS:
        return this.state.stats;
      case WidgetStateSource.NOTIFICATIONS:
        return { notifications: [] }; // This would be managed separately
      case WidgetStateSource.NONE:
      default:
        return {};
    }
  }

  /**
   * Check if a widget should be visible based on current mode
   */
  public isWidgetVisible(visibleInModes?: AppMode[]): boolean {
    if (!visibleInModes || visibleInModes.length === 0) {
      return true; // Always visible if no conditions specified
    }
    return visibleInModes.includes(this.state.mode);
  }
} 