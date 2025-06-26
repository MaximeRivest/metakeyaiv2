export interface ClipboardItem {
  text: string;
  timestamp: number;
  id: string;
}

export class ClipboardManager {
  private history: ClipboardItem[] = [];
  private currentIndex = -1;
  private maxHistorySize = 1000;
  private currentContent = '';

  constructor() {
    this.loadHistory();
  }

  /**
   * Add new content to clipboard history
   */
  addToHistory(text: string, timestamp: number): void {
    // Don't add empty or duplicate content
    if (!text.trim() || text === this.currentContent) {
      return;
    }

    const item: ClipboardItem = {
      text,
      timestamp,
      id: this.generateId(),
    };

    // Remove any existing identical entries
    this.history = this.history.filter(item => item.text !== text);

    // Add to front of history
    this.history.unshift(item);

    // Trim history if too large
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(0, this.maxHistorySize);
    }

    this.currentContent = text;
    this.currentIndex = 0;
    this.saveHistory();

    console.log(`📋 Added to clipboard history: ${text.substring(0, 50)}...`);
  }

  /**
   * Cycle through clipboard history
   */
  cycle(direction: number): string | null {
    if (this.history.length === 0) {
      return null;
    }

    // Update index based on direction
    this.currentIndex += direction;

    // Wrap around
    if (this.currentIndex < 0) {
      this.currentIndex = this.history.length - 1;
    } else if (this.currentIndex >= this.history.length) {
      this.currentIndex = 0;
    }

    const item = this.history[this.currentIndex];
    if (item) {
      this.currentContent = item.text;
      return item.text;
    }

    return null;
  }

  /**
   * Get current clipboard content
   */
  getCurrentContent(): string {
    return this.currentContent;
  }

  /**
   * Get clipboard history
   */
  getHistory(limit?: number): ClipboardItem[] {
    return limit ? this.history.slice(0, limit) : [...this.history];
  }

  /**
   * Clear clipboard history
   */
  clearHistory(): void {
    this.history = [];
    this.currentIndex = -1;
    this.saveHistory();
    console.log('🗑️ Clipboard history cleared');
  }

  /**
   * Remove specific item from history
   */
  removeItem(id: string): boolean {
    const index = this.history.findIndex(item => item.id === id);
    if (index !== -1) {
      this.history.splice(index, 1);
      
      // Adjust current index if needed
      if (this.currentIndex >= index) {
        this.currentIndex = Math.max(0, this.currentIndex - 1);
      }
      
      this.saveHistory();
      return true;
    }
    return false;
  }

  /**
   * Search clipboard history
   */
  search(query: string, limit = 10): ClipboardItem[] {
    const lowerQuery = query.toLowerCase();
    return this.history
      .filter(item => item.text.toLowerCase().includes(lowerQuery))
      .slice(0, limit);
  }

  /**
   * Get statistics about clipboard usage
   */
  getStats(): {
    totalItems: number;
    currentIndex: number;
    oldestTimestamp: number;
    newestTimestamp: number;
  } {
    const timestamps = this.history.map(item => item.timestamp);
    
    return {
      totalItems: this.history.length,
      currentIndex: this.currentIndex,
      oldestTimestamp: Math.min(...timestamps) || 0,
      newestTimestamp: Math.max(...timestamps) || 0,
    };
  }

  /**
   * Generate unique ID for clipboard items
   */
  private generateId(): string {
    return `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Load clipboard history from storage
   */
  private loadHistory(): void {
    try {
      // In production, this would load from encrypted SQLite database
      // For demo, we'll start with empty history
      console.log('📋 Clipboard history loaded (demo mode)');
    } catch (error) {
      console.error('Failed to load clipboard history:', error);
      this.history = [];
    }
  }

  /**
   * Save clipboard history to storage
   */
  private saveHistory(): void {
    try {
      // In production, this would save to encrypted SQLite database
      // For demo, we'll just log
      console.log(`💾 Clipboard history saved (${this.history.length} items)`);
    } catch (error) {
      console.error('Failed to save clipboard history:', error);
    }
  }

  /**
   * Set maximum history size
   */
  setMaxHistorySize(size: number): void {
    this.maxHistorySize = Math.max(1, size);
    
    // Trim current history if needed
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(0, this.maxHistorySize);
      this.saveHistory();
    }
  }

  /**
   * Export clipboard history
   */
  exportHistory(): string {
    const exportData = {
      version: '1.0',
      timestamp: Date.now(),
      items: this.history,
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import clipboard history
   */
  importHistory(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.items && Array.isArray(data.items)) {
        this.history = data.items.slice(0, this.maxHistorySize);
        this.currentIndex = 0;
        this.saveHistory();
        console.log(`📥 Imported ${this.history.length} clipboard items`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to import clipboard history:', error);
      return false;
    }
  }
} 