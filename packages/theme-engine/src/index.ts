import path from 'path';
import fs from 'fs/promises';
import { Theme } from 'shared-types';

export interface ThemeServiceOptions {
  themesDirectory: string;
}

export class ThemeService {
  private options: ThemeServiceOptions;

  constructor(options: ThemeServiceOptions) {
    this.options = options;
  }

  public async loadTheme(themeId: string): Promise<Theme> {
    const themePath = path.join(this.options.themesDirectory, themeId, 'theme.json');
    try {
      const manifestContent = await fs.readFile(themePath, 'utf-8');
      const theme = JSON.parse(manifestContent) as Theme;

      // Provide both absolute path (for main process file operations) 
      // and relative path (for renderer custom protocol)
      const absoluteTokensPath = path.join(this.options.themesDirectory, themeId, theme.tokens);
      const relativeTokensPath = `${themeId}/${theme.tokens}`;
      
      theme.tokens = absoluteTokensPath;
      theme.tokensUrl = `metakey-theme://${relativeTokensPath}`;

      return theme;
    } catch (err) {
      console.error(`Failed to load theme "${themeId}"`, err);
      throw new Error(`Failed to load theme: ${err.message}`);
    }
  }
} 