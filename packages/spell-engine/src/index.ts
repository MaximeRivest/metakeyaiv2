import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { EventEmitter } from 'events';

interface SpellContext {
  input: string;
}

export interface SpellResult {
  output: string;
}

export interface SpellServiceOptions {
  spellsDirectory: string;
}

export interface SpellMetadata {
  [key: string]: any;
}

export class SpellService extends EventEmitter {
  private options: SpellServiceOptions;

  constructor(options: SpellServiceOptions) {
    super();
    this.options = options;
  }

  public async discoverSpells(): Promise<string[]> {
    const spellFiles = await fs.readdir(this.options.spellsDirectory);
    // Return the filenames without the extension as the spell IDs
    return spellFiles.map(file => path.parse(file).name);
  }

  private async resolveSpellPath(spellId: string): Promise<string | null> {
    const spellDirectory = this.options.spellsDirectory;
    // For now, we assume python, but this could be expanded.
    const potentialPath = path.join(spellDirectory, `${spellId}.py`);
    try {
      await fs.access(potentialPath);
      return potentialPath;
    } catch (e) {
      // Could also check for .js, .sh, etc. here in the future
    }
    return null; // Not found
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
  public run(spellId: string, context: SpellContext, metadata: SpellMetadata = {}): Promise<SpellResult> {
    this.emit('spell:start', { spellId, metadata });

    const promise = new Promise<SpellResult>(async (resolve, reject) => {
      const spellPath = await this.resolveSpellPath(spellId);

      if (!spellPath) {
        return reject(new Error(`Spell with ID "${spellId}" not found.`));
      }

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

    promise
      .then(result => {
        this.emit('spell:success', { spellId, metadata, result });
      })
      .catch(error => {
        this.emit('spell:error', { spellId, metadata, error });
      });

    return promise;
  }
} 