import { app } from 'electron';
import path from 'path';
import fse from 'fs-extra';

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
  getWidgetPositions(): Promise<WidgetPositionConfig>;
  setWidgetPosition(widgetId: string, x: number, y: number): Promise<void>;
}

export class ConfigService implements PathService {
  private readonly userDataPath: string;
  private readonly spellsDirectory: string;
  private readonly themesDirectory: string;
  private readonly hotkeysDirectory: string;
  private readonly widgetPositionsPath: string;
  private widgetPositions: WidgetPositionConfig = {};

  constructor() {
    this.userDataPath = app.getPath('userData');
    this.spellsDirectory = path.join(this.userDataPath, 'spells');
    this.themesDirectory = path.join(this.userDataPath, 'themes');
    this.hotkeysDirectory = path.join(this.userDataPath, 'hotkeys');
    this.widgetPositionsPath = path.join(this.userDataPath, 'overlay-positions.json');
  }

  /**
   * Ensures that all necessary directories exist on startup.
   * If user directories are empty, it copies the stock assets into them.
   */
  public async initialize(stockAssetDirectories: {
    spells: string;
    themes: string;
    hotkeys: string;
  }): Promise<void> {
    await fse.ensureDir(this.spellsDirectory);
    await fse.ensureDir(this.themesDirectory);
    await fse.ensureDir(this.hotkeysDirectory);

    // Sync stock assets by copying them if they don't exist in the user's dir.
    await this.syncStockAssets(stockAssetDirectories.spells, this.spellsDirectory, 'spells');
    await this.syncStockAssets(stockAssetDirectories.themes, this.themesDirectory, 'themes');
    await this.syncStockAssets(stockAssetDirectories.hotkeys, this.hotkeysDirectory, 'hotkeys');
    await this.loadWidgetPositions();
  }

  /**
   * Ensures that stock assets are present in the user's data directory.
   * It copies any missing files or directories from the stock assets source.
   * @param sourceDir The directory of the stock assets.
   * @param targetDir The user's data directory.
   * @param assetType A name for the asset type for logging purposes.
   */
  private async syncStockAssets(sourceDir: string, targetDir: string, assetType: string): Promise<void> {
    try {
      const stockAssets = await fse.readdir(sourceDir);
      for (const asset of stockAssets) {
        const sourcePath = path.join(sourceDir, asset);
        const targetPath = path.join(targetDir, asset);
        try {
          await fse.access(targetPath);
          // If access doesn't throw, the file/dir exists. Do nothing.
        } catch (error) {
          // If it throws, the file/dir does not exist, so we copy it.
          console.log(`Syncing missing ${assetType} asset: ${asset}`);
          await fse.copy(sourcePath, targetPath, { overwrite: false });
        }
      }
    } catch (error) {
      console.error(`Could not read stock ${assetType} directory at ${sourceDir}`, error);
    }
  }

  public getUserDataPath(): string {
    return this.userDataPath;
  }

  public getSpellsDirectory(): string {
    return this.spellsDirectory;
  }

  public getThemesDirectory(): string {
    return this.themesDirectory;
  }

  public getHotkeysDirectory(): string {
    return this.hotkeysDirectory;
  }

  public async getHotkeyBindings(setNames: string[]): Promise<HotkeyBinding[]> {
    const finalBindings = new Map<string, HotkeyBinding>();

    for (const setName of setNames) {
      const hotkeysPath = path.join(this.hotkeysDirectory, `${setName}.json`);
      try {
        const data = await fse.readFile(hotkeysPath, 'utf-8');
        const bindings: HotkeyBinding[] = JSON.parse(data);
        for (const binding of bindings) {
          finalBindings.set(binding.shortcut, binding);
        }
      } catch (error) {
        if (error.code === 'ENOENT') {
          console.warn(`Hotkey set "${setName}" not found at ${hotkeysPath}. Skipping.`);
        } else {
          // For other errors, re-throw
          throw error;
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

  private async loadWidgetPositions(): Promise<void> {
    try {
      this.widgetPositions = await fse.readJson(this.widgetPositionsPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.widgetPositions = {};
      } else {
        console.error('Error loading widget positions:', error);
      }
    }
  }
  
  public async getWidgetPositions(): Promise<WidgetPositionConfig> {
    return this.widgetPositions;
  }

  public async setWidgetPosition(widgetId: string, x: number, y: number): Promise<void> {
    this.widgetPositions[widgetId] = { x, y };
    try {
      await fse.writeJson(this.widgetPositionsPath, this.widgetPositions, { spaces: 2 });
    } catch (error) {
      console.error('Error saving widget position:', error);
    }
  }
} 