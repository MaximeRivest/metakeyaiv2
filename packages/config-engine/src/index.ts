import { app } from 'electron';
import path from 'path';
import fse from 'fs-extra';
import { Theme, WidgetConfig, DisplayLayout, ThemeLayouts } from 'shared-types';

export interface HotkeyBinding {
  shortcut: string;
  actionId: string;
  payload?: any;
}

export type WidgetPositionConfig = Record<string, { x: number; y: number }>;

export interface PathService {
  getUserDataPath(): string;
  getSpellsDirectory(): string;
  getThemesDirectory(): string;
  getHotkeysDirectory(): string;
  getHotkeyBindings(setNames: string[]): Promise<HotkeyBinding[]>;
  updateWidgetPositionInTheme(themeId: string, displayCount: number, widgetId: string, x: number, y: number): Promise<void>;
}

export class ConfigService implements PathService {
  private readonly userDataPath: string;
  private readonly spellsDirectory: string;
  private readonly themesDirectory: string;
  private readonly hotkeysDirectory: string;

  constructor() {
    this.userDataPath = app.getPath('userData');
    this.spellsDirectory = path.join(this.userDataPath, 'spells');
    this.themesDirectory = path.join(this.userDataPath, 'themes');
    this.hotkeysDirectory = path.join(this.userDataPath, 'hotkeys');
  }

  /**
   * Ensures the necessary user data directories exist.
   * If user directories are empty, it copies the stock assets into them.
   */
  public async initialize(stockAssetDirectories: {
    spells: string,
    themes: string,
    hotkeys: string,
  }): Promise<void> {
    await fse.ensureDir(this.spellsDirectory);
    await fse.ensureDir(this.themesDirectory);
    await fse.ensureDir(this.hotkeysDirectory);

    await this.syncStockAssets(stockAssetDirectories.spells, this.spellsDirectory, 'spells');
    await this.syncStockAssets(stockAssetDirectories.themes, this.themesDirectory, 'themes');
    await this.syncStockAssets(stockAssetDirectories.hotkeys, this.hotkeysDirectory, 'hotkeys');
  }

  public getSpellsDirectory(): string {
    return this.spellsDirectory;
  }

  public getThemesDirectory(): string {
    return this.themesDirectory;
  }

  public getUserDataPath(): string {
    return this.userDataPath;
  }

  public getHotkeysDirectory(): string {
    return this.hotkeysDirectory;
  }

  private async syncStockAssets(from: string, to: string, type: string): Promise<void> {
    const userFiles = await fse.readdir(to);
    if (userFiles.length === 0) {
      console.log(`No user ${type} found. Copying stock assets...`);
      await fse.copy(from, to, {
        overwrite: false,
        errorOnExist: false,
      });
    }
  }

  public async getHotkeyBindings(setNames: string[]): Promise<HotkeyBinding[]> {
    const finalBindings = new Map<string, HotkeyBinding>();

    for (const setName of setNames) {
      const filePath = path.join(this.hotkeysDirectory, `${setName}.json`);
      try {
        const fileContent = await fse.readFile(filePath, 'utf-8');
        const bindings = JSON.parse(fileContent) as HotkeyBinding[];
        for (const binding of bindings) {
          // The shortcut itself is the unique identifier to prevent duplicates.
          finalBindings.set(binding.shortcut, binding);
        }
      } catch (e) {
        if (e.code === 'ENOENT') {
          // This is not a critical error; the hotkey set might just not exist.
          console.warn(`[ConfigService] Hotkey set "${setName}" not found at ${filePath}`);
        } else {
          console.error(`[ConfigService] Error loading hotkey set "${setName}":`, e);
        }
      }
    }

    if (finalBindings.size === 0) {
      // This is a guard against a common issue where no hotkeys are loaded.
      // If you expect hotkeys and see this, check your `setNames` and file paths.
      console.warn(`[ConfigService] Warning: No hotkey bindings were loaded for sets: ${setNames.join(', ')}`);
    }

    return Array.from(finalBindings.values());
  }

  public async updateWidgetPositionInTheme(themeId: string, displayCount: number, widgetId: string, x: number, y: number): Promise<void> {
    const themeManifestPath = path.join(this.themesDirectory, themeId, 'theme.json');
    try {
      const theme: Theme = await fse.readJson(themeManifestPath);

      if (!theme.layouts) {
        console.warn(`[ConfigService] Theme "${themeId}" has no layouts property. Cannot save widget position.`);
        return;
      }
      
      const layoutKey = this.findLayoutKeyForDisplayCount(theme.layouts, displayCount);
      const layoutToUpdate = theme.layouts[layoutKey];

      if (!layoutToUpdate) {
        console.warn(`[ConfigService] No suitable layout found for display count ${displayCount} in theme "${themeId}".`);
        return;
      }
      
      let widgetUpdated = false;

      const updateWidget = (widget: WidgetConfig) => {
        if (widget.widgetId === widgetId) {
          widget.x = Math.round(x);
          widget.y = Math.round(y);
          widgetUpdated = true;
        }
        return widget;
      };

      if (layoutToUpdate.primary) {
        layoutToUpdate.primary = layoutToUpdate.primary.map(updateWidget);
      }
      if (layoutToUpdate.secondary) {
        layoutToUpdate.secondary = layoutToUpdate.secondary.map(
          (displayLayout: WidgetConfig[]) => displayLayout.map(updateWidget)
        );
      }

      if (widgetUpdated) {
        await fse.writeJson(themeManifestPath, theme, { spaces: 2 });
      } else {
        console.warn(`[ConfigService] Widget "${widgetId}" not found in the active layout for theme "${themeId}". Position not saved.`);
      }

    } catch (error) {
        console.error(`Error updating theme file for ${themeId}:`, error);
    }
  }

  private findLayoutKeyForDisplayCount(layouts: ThemeLayouts, displayCount: number): string {
    let count = displayCount;
    while (count > 0) {
      if (layouts[count.toString()]) {
        return count.toString();
      }
      count--;
    }
    // As a final fallback, check for a "default" key.
    return layouts['default'] ? 'default' : null;
  }
} 