import { IpcChannel, SpellbookEntry, SpellbookMenuItem, SpellbookMenuIcon, WidgetActionRequestPayload } from "shared-types";
import { BaseWidget } from "./BaseWidget";

interface SpellbookState {
    isVisible: boolean;
    entries: SpellbookEntry[];
    menu: SpellbookMenuItem[];
    selectedMenu: string;
    selectedSpell: number;
    navigationMode: 'menu' | 'grid';
}

export class SpellbookView extends BaseWidget {
    private state: SpellbookState = {
        isVisible: false,
        entries: [],
        menu: [],
        selectedMenu: 'spells',
        selectedSpell: 0,
        navigationMode: 'menu'
    };

    constructor() {
        super('spell-book');
    }

    protected onMount(): void {
        this.setupResizeObserver();
    }

    private setupResizeObserver(): void {
        if (!this.widget) return;
        
        // Ensure the widget stays within bounds when resized
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                this.clampToViewport();
            }
        });
        
        resizeObserver.observe(this.widget);
    }

    private clampToViewport(): void {
        if (!this.widget) return;
        
        const rect = this.widget.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let { x, y } = rect;
        
        // Clamp to viewport bounds
        x = Math.max(0, Math.min(x, viewportWidth - rect.width));
        y = Math.max(0, Math.min(y, viewportHeight - rect.height));
        
        if (x !== rect.x || y !== rect.y) {
            this.widget.style.left = `${x}px`;
            this.widget.style.top = `${y}px`;
            this.widget.style.transform = 'none'; // Override any existing transform
        }
    }

    public updateState(newState: SpellbookState): void {
        if (!this.widget) return;

        const wasVisible = this.state.isVisible;
        this.state = { ...newState };
        
        // If becoming visible or data changed, populate content
        if (this.state.isVisible && (!wasVisible || this.hasDataChanged())) {
            this.populate();
            this.show();
        } else if (!this.state.isVisible && wasVisible) {
            this.hide();
        }

        // Update selection if state changed
        if (this.state.isVisible) {
            this.updateSelection();
        }
    }

    private hasDataChanged(): boolean {
        // Simple check if entries or menu have changed
        return this.state.entries.length > 0 || this.state.menu.length > 0;
    }

    private populate() {
        const navEl = this.query<HTMLElement>('.spellbook-nav');
        const contentEl = this.query<HTMLElement>('.spellbook-content');
        if (!navEl || !contentEl) return;
        
        // Clear existing content
        navEl.innerHTML = '';
        contentEl.innerHTML = '';

        // Populate navigation with icons
        this.state.menu.forEach((item, index) => {
            const button = document.createElement('button');
            button.className = 'nav-item';
            button.dataset.menuId = item.id;
            button.title = item.label; // Tooltip
            button.setAttribute('aria-label', item.label);
            
            // Create icon
            const icon = this.createIcon(item.icon);
            button.appendChild(icon);
            
            // Add hotkey indicator if available
            if (item.hotkey) {
                const hotkey = document.createElement('span');
                hotkey.className = 'nav-hotkey';
                hotkey.textContent = item.hotkey;
                button.appendChild(hotkey);
            }
            
            // Add click handler
            button.addEventListener('click', () => {
                this.handleMenuClick(item.id, index);
            });
            
            navEl.appendChild(button);
        });

        // Populate content based on selected menu
        this.populateContent();
    }

    private handleMenuClick(menuId: string, index: number): void {
        // Send action request to main process
        window.ipc.invoke('widget:action-request', {
            widgetId: this.widgetId,
            action: 'menu-select',
            payload: { menuId, index }
        } as WidgetActionRequestPayload);
    }

    private createIcon(iconName: SpellbookMenuIcon): HTMLElement {
        const iconEl = document.createElement('div');
        iconEl.className = 'nav-icon';
        
        // Map icon names to SVG paths (using simple SVG icons)
        const iconSvgs: Record<SpellbookMenuIcon, string> = {
            [SpellbookMenuIcon.SPELLS]: `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                    <path d="m22 3-6 0a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                </svg>
            `,
            [SpellbookMenuIcon.ECHOES]: `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="m3 12 8-5v10z"/>
                    <path d="m11 7 4-2v10l-4-2"/>
                    <path d="m15 5 4-2v10l-4-2"/>
                </svg>
            `,
            [SpellbookMenuIcon.THEMES]: `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>
                    <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
                    <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
                    <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
                    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
                </svg>
            `,
            [SpellbookMenuIcon.SETTINGS]: `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                    <circle cx="12" cy="12" r="3"/>
                </svg>
            `,
            [SpellbookMenuIcon.SEARCH]: `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.35-4.35"/>
                </svg>
            `,
            [SpellbookMenuIcon.FAVORITES]: `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="m19 14 1.5-1.5c1-1 1-2.5 0-3.5l-3.5-3.5c-1-1-2.5-1-3.5 0L12 7l-1.5-1.5c-1-1-2.5-1-3.5 0L3.5 9c-1 1-1 2.5 0 3.5L5 14l7 7 7-7z"/>
                </svg>
            `
        };
        
        iconEl.innerHTML = iconSvgs[iconName] || iconSvgs[SpellbookMenuIcon.SPELLS];
        return iconEl;
    }

    private populateContent() {
        const contentEl = this.query<HTMLElement>('.spellbook-content');
        if (!contentEl) return;
        
        contentEl.innerHTML = '';
        
        if (this.state.selectedMenu === 'spells') {
            // Show spells grid
            const gridEl = document.createElement('div');
            gridEl.className = 'spell-grid';
            
            this.state.entries.forEach((spell, index) => {
                const spellEl = document.createElement('button');
                spellEl.className = 'spell-item';
                spellEl.dataset.spellId = spell.spellId;
                spellEl.dataset.gridIndex = index.toString();
                
                spellEl.innerHTML = `
                    <div class="spell-title">${spell.spellTitle}</div>
                    <div class="spell-shortcut">${spell.shortcut}</div>
                `;
                
                spellEl.addEventListener('click', () => {
                    this.executeSpell(spell.spellId);
                });
                
                gridEl.appendChild(spellEl);
            });
            
            contentEl.appendChild(gridEl);
        } else {
            // Show placeholder content for other sections
            const placeholderEl = document.createElement('div');
            placeholderEl.className = 'content-placeholder';
            const selectedMenuItem = this.state.menu.find(m => m.id === this.state.selectedMenu);
            placeholderEl.innerHTML = `
                <div class="placeholder-icon">${this.createIcon(selectedMenuItem?.icon || SpellbookMenuIcon.SPELLS).innerHTML}</div>
                <div class="placeholder-text">${selectedMenuItem?.label || 'Content'} coming soon...</div>
            `;
            contentEl.appendChild(placeholderEl);
        }
    }

    private executeSpell(spellId: string): void {
        // Send spell execution request to main process
        window.ipc.invoke('widget:action-request', {
            widgetId: this.widgetId,
            action: 'spell-execute',
            payload: { spellId }
        } as WidgetActionRequestPayload);
    }

    public show(): void {
        if (this.widget) {
            this.widget.style.display = 'block';
            // Force immediate layout and visibility
            this.widget.offsetHeight; // Trigger layout
            
            // Ensure content is populated if we have data
            if (this.state.menu.length > 0) {
                this.populateContent();
                this.updateSelection();
            }
        }
    }

    private updateSelection() {
        if (!this.widget) return;

        // Update menu selection
        const navItems = this.queryAll('.nav-item');
        navItems.forEach((item, index) => {
            const menuId = item.getAttribute('data-menu-id');
            if (this.state.navigationMode === 'menu' && menuId === this.state.selectedMenu) {
                item.classList.add('active');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('active');
            }
        });

        // Update content selection
        const contentItems = this.queryAll('.spell-item');
        contentItems.forEach((item, index) => {
            if (this.state.navigationMode === 'grid' && index === this.state.selectedSpell) {
                item.classList.add('active');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('active');
            }
        });
    }

    protected onDestroy(): void {
        // Clean up any resources if needed
    }
}