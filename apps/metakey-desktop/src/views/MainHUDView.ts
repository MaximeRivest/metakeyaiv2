import { OverlayContent } from "shared-types";
import { BaseWidget } from "./BaseWidget";

export class MainHUDView extends BaseWidget {
    private statusMessageEl: HTMLElement | null = null;
    private contentDisplayEl: HTMLElement | null = null;
    private contentTitleEl: HTMLElement | null = null;
    private contentBodyEl: HTMLElement | null = null;
    private overlayRoot: HTMLElement;
    private statusTimer: NodeJS.Timeout | null = null;

    constructor(overlayRoot: HTMLElement) {
        super('main-hud');
        this.overlayRoot = overlayRoot;
    }

    protected onMount(): void {
        // Cache commonly used elements
        this.statusMessageEl = this.query('.status-message');
        this.contentDisplayEl = this.query('#content-display');
        this.contentTitleEl = this.query('#content-title');
        this.contentBodyEl = this.query('#content-body');
    }

    public setStatus(status: 'idle' | 'processing' | 'success' | 'error' | 'listening', message: string): void {
        if (!this.statusMessageEl) return;

        // Hide content display when a new status comes in.
        if (this.contentDisplayEl) this.contentDisplayEl.style.display = 'none';
        this.statusMessageEl.style.display = 'block';

        this.overlayRoot.classList.remove('success', 'error', 'idle', 'processing', 'listening');
        this.overlayRoot.classList.add(status);

        this.statusMessageEl.innerHTML = message;

        // Clear any existing timer
        if (this.statusTimer) {
            clearTimeout(this.statusTimer);
            this.statusTimer = null;
        }

        // Set a timer to clear the status after a few seconds, unless it's an idle message
        if (status !== 'idle' && status !== 'processing') {
            this.statusTimer = setTimeout(() => {
                // Only clear if the status hasn't changed in the meantime
                if (this.overlayRoot.classList.contains(status)) {
                    this.setStatus('idle', 'Ready');
                }
            }, 4000);
        }
    }

    public showContent(content: OverlayContent): void {
        if (!this.widget) return;

        // When showing specific content, hide the generic status message
        if (this.statusMessageEl) {
            this.statusMessageEl.style.display = 'none';
        }

        if (content.type === 'SPELL_RESULT' && this.contentDisplayEl && this.contentTitleEl && this.contentBodyEl) {
            this.contentTitleEl.innerText = content.title;
            this.contentBodyEl.innerText = content.body; // For now, just text. Markdown later.
            this.contentDisplayEl.style.display = 'block';
        }
    }

    public showSpellResult(title: string, body: string): void {
        if (!this.contentDisplayEl || !this.contentTitleEl || !this.contentBodyEl) return;

        if (this.statusMessageEl) this.statusMessageEl.style.display = 'none';
        this.contentTitleEl.innerText = title;
        this.contentBodyEl.innerText = body; // For now, just text. Markdown later.
        this.contentDisplayEl.style.display = 'block';
    }

    protected onDestroy(): void {
        if (this.statusTimer) {
            clearTimeout(this.statusTimer);
            this.statusTimer = null;
        }
    }
} 