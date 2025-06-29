import { app } from 'electron';
import path from 'path';
import fse from 'fs-extra';

export interface HotkeyBinding {
  shortcut: string;
  actionId: string;
  payload?: any;
}

export interface PathService {
  getUserDataPath(): string;
  getSpellsDirectory(): string;
  getThemesDirectory(): string;
  getHotkeysDirectory(): string;
  getHotkeyBindings(setNames: string[]): Promise<HotkeyBinding[]>;
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

    return Array.from(finalBindings.values());
  }
} 