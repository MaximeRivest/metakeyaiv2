import { HotkeyTriggeredPayload } from "shared-types";
import { BaseWidget } from "./BaseWidget";

interface NotificationItem {
    element: HTMLElement;
    timer: NodeJS.Timeout;
}

export class NotificationsView extends BaseWidget {
    private notificationContainer: HTMLElement | null = null;
    private activeNotifications = new Map<string, NotificationItem>();

    constructor() {
        super('notifications');
    }

    protected onMount(): void {
        this.notificationContainer = this.query('.notifications-container');
    }

    public showNotification(payload: HotkeyTriggeredPayload): void {
        if (!this.notificationContainer) return;

        const notificationEl = document.createElement('div');
        notificationEl.className = 'notification-item';
        
        // Add theme-specific animation classes
        const animationStyle = this.getThemeVar('--mx-notification-animation-style', 'slide');
        notificationEl.classList.add(`notification-${animationStyle}`);
        
        // Create notification content
        notificationEl.innerHTML = `
            <div class="notification-icon">⚡</div>
            <div class="notification-content">
                <div class="notification-title">${payload.spellTitle}</div>
                <div class="notification-shortcut">${payload.shortcut}</div>
            </div>
        `;
        
        this.notificationContainer.appendChild(notificationEl);
        
        // Trigger animation
        requestAnimationFrame(() => {
            notificationEl.classList.add('notification-enter');
        });
        
        // Get duration from theme
        const duration = this.getThemeVar('--mx-notification-duration', '3000ms');
        const durationMs = parseFloat(duration);

        // Create unique key for this notification
        const notificationId = `${payload.shortcut}-${Date.now()}`;
        
        const timer = setTimeout(() => {
            notificationEl.classList.add('notification-exit');
            
            // Remove after exit animation
            notificationEl.addEventListener('animationend', () => {
                notificationEl.remove();
                this.activeNotifications.delete(notificationId);
            }, { once: true });
        }, durationMs);

        this.activeNotifications.set(notificationId, { element: notificationEl, timer });
    }

    protected onDestroy(): void {
        // Clean up all active notifications
        this.activeNotifications.forEach(({ timer }) => clearTimeout(timer));
        this.activeNotifications.clear();
    }
} 