import { clipboard } from 'electron';

export class ClipboardService {
  public read(): string {
    return clipboard.readText();
  }

  public write(text: string): void {
    clipboard.writeText(text);
  }
} 