import { BaseWidget } from "./BaseWidget";

export interface StatsData {
    tokensPerSecond?: number;
    backgroundTasks?: number;
    pressedKeys?: string;
    totalTracks?: number;
    totalClipboard?: number;
    currentTrackClipboard?: number;
}

export class StatsView extends BaseWidget {
    private statsElements: Map<string, HTMLElement> = new Map();
    private updateInterval: NodeJS.Timeout | null = null;

    constructor() {
        super('stats');
    }

    protected onMount(): void {
        // Cache stat elements - check for existence before setting
        const tpsEl = this.query('.stat-tps');
        const tasksEl = this.query('.stat-tasks');
        const keysEl = this.query('.stat-keys');
        const tracksEl = this.query('.stat-tracks');
        const clipboardEl = this.query('.stat-clipboard');

        if (tpsEl) this.statsElements.set('tps', tpsEl);
        if (tasksEl) this.statsElements.set('tasks', tasksEl);
        if (keysEl) this.statsElements.set('keys', keysEl);
        if (tracksEl) this.statsElements.set('tracks', tracksEl);
        if (clipboardEl) this.statsElements.set('clipboard', clipboardEl);
        
        // Start update loop for dynamic stats
        this.startUpdateLoop();
    }

    private startUpdateLoop(): void {
        // Update dynamic stats every second
        this.updateInterval = setInterval(() => {
            // This would be connected to actual data sources
            this.updateStat('tasks', Math.floor(Math.random() * 5).toString());
        }, 1000);
    }

    public updateStats(stats: StatsData): void {
        if (stats.tokensPerSecond !== undefined) {
            this.updateStat('tps', `${stats.tokensPerSecond.toFixed(1)} t/s`);
        }
        if (stats.backgroundTasks !== undefined) {
            this.updateStat('tasks', stats.backgroundTasks.toString());
        }
        if (stats.pressedKeys !== undefined) {
            this.updateStat('keys', stats.pressedKeys || 'None');
        }
        if (stats.totalTracks !== undefined) {
            this.updateStat('tracks', stats.totalTracks.toString());
        }
        if (stats.totalClipboard !== undefined && stats.currentTrackClipboard !== undefined) {
            this.updateStat('clipboard', `${stats.currentTrackClipboard}/${stats.totalClipboard}`);
        }
    }

    public showPressedKeys(keys: string): void {
        this.updateStat('keys', keys || 'None');
    }

    private updateStat(statId: string, value: string): void {
        const element = this.statsElements.get(statId);
        if (element) {
            element.textContent = value;
        }
    }

    protected onDestroy(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        this.statsElements.clear();
    }
} 