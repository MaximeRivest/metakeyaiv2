import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

interface SpellContext {
  input: string;
}

interface SpellResult {
  output: string;
}

export interface SpellServiceOptions {
  spellsDirectory: string;
}

export class SpellService {
  private options: SpellServiceOptions;

  constructor(options: SpellServiceOptions) {
    this.options = options;
  }

  private async resolveSpellPath(spellId: string): Promise<string | null> {
    const spellPath = path.join(this.options.spellsDirectory, `${spellId}.py`);
    try {
      await fs.access(spellPath);
      return spellPath; // Found it
    } catch (e) {
      // Spell not found
    }

    return null; // Not found in the directory
  }
  // --- temporary 
  public async installSpell(sourcePath: string): Promise<void> {
    const fileName = path.basename(sourcePath);
    const destinationPath = path.join(this.options.spellsDirectory, fileName);
    try {
      await fs.copyFile(sourcePath, destinationPath);
      console.log(`✅ Spell "${fileName}" installed successfully.`);
    } catch (err) {
      console.error(`Failed to install spell "${fileName}"`, err);
      throw new Error(`Failed to install spell: ${err.message}`);
    }
  }
  // --- end temporary 
  public async run(spellId: string, context: SpellContext): Promise<SpellResult> {
    const spellPath = await this.resolveSpellPath(spellId);

    if (!spellPath) {
      throw new Error(`Spell with ID "${spellId}" not found.`);
    }

    return new Promise((resolve, reject) => {
      const spell = spawn('python3', [spellPath]);
      let output = '';
      let error = '';

      spell.stdin.write(context.input);
      spell.stdin.end();

      spell.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });

      spell.stderr.on('data', (data: Buffer) => {
        error += data.toString();
      });

      spell.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(`Spell failed with code ${code}: ${error}`));
        }
        try {
          const result = JSON.parse(output);
          resolve(result);
        } catch (e) {
          reject(new Error(`Error parsing spell output: ${output}`));
        }
      });

      spell.on('error', (err) => {
        reject(err);
      });
    });
  }
} 