import { app } from 'electron';
import path from 'path';
import fse from 'fs-extra';

export interface PathService {
  getUserDataPath(): string;
  getSpellsDirectory(): string;
  getThemesDirectory(): string;
}

export class ConfigService implements PathService {
  private readonly userDataPath: string;
  private readonly spellsDirectory: string;
  private readonly themesDirectory: string;

  constructor() {
    this.userDataPath = app.getPath('userData');
    this.spellsDirectory = path.join(this.userDataPath, 'spells');
    this.themesDirectory = path.join(this.userDataPath, 'themes');
  }

  /**
   * Ensures that all necessary directories exist on startup.
   * If user directories are empty, it copies the stock assets into them.
   */
  public async initialize(stockAssetDirectories: {
    spells: string;
    themes: string;
  }): Promise<void> {
    await fse.ensureDir(this.spellsDirectory);
    await fse.ensureDir(this.themesDirectory);

    const userSpells = await fse.readdir(this.spellsDirectory);
    if (userSpells.length === 0) {
      console.log('First run: Copying stock spells to user directory...');
      await fse.copy(stockAssetDirectories.spells, this.spellsDirectory, {
        overwrite: false,
      });
    }

    const userThemes = await fse.readdir(this.themesDirectory);
    if (userThemes.length === 0) {
      console.log('First run: Copying stock themes to user directory...');
      await fse.copy(stockAssetDirectories.themes, this.themesDirectory, {
        overwrite: false,
      });
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
} 