import { IpcChannel, SpellbookEntry, SpellbookMenuItem, SpellbookMenuIcon } from "shared-types";
import { BaseWidget } from "./BaseWidget";

export class SpellbookView extends BaseWidget {
    private spells: SpellbookEntry[] = [];
    private menu: SpellbookMenuItem[] = [];
    private navMode: 'menu' | 'grid' = 'menu';
    private menuIndex = 0;
    private gridIndex = 0;
    private navigationCleanup: (() => void) | null = null;
    private activeMenuId: string = 'spells';

    constructor() {
        super('spell-book');
    }

    protected onMount(): void {
        // Set up navigation listener via IPC
        this.navigationCleanup = window.ipc.on(IpcChannel.SPELLBOOK_NAVIGATE, this.handleNavigation);
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

    public update(payload: { spells: SpellbookEntry[], menu: SpellbookMenuItem[] }): void {
        if (!this.widget) return;

        this.spells = payload.spells;
        this.menu = payload.menu;
        this.populate();
        this.show();
    }

    private populate() {
        const navEl = this.query<HTMLElement>('.spellbook-nav');
        const contentEl = this.query<HTMLElement>('.spellbook-content');
        if (!navEl || !contentEl) return;
        
        // Clear existing content
        navEl.innerHTML = '';
        contentEl.innerHTML = '';

        // Populate navigation with icons
        this.menu.forEach((item, index) => {
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
                this.activeMenuId = item.id;
                this.menuIndex = index;
                this.updateSelection();
                this.populateContent();
            });
            
            navEl.appendChild(button);
        });

        // Initialize selection
        this.menuIndex = 0;
        this.gridIndex = 0;
        this.navMode = 'menu';
        this.activeMenuId = this.menu[0]?.id || 'spells';
        this.updateSelection();
        this.populateContent();
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
        
        if (this.activeMenuId === 'spells') {
            // Show spells grid
            const gridEl = document.createElement('div');
            gridEl.className = 'spell-grid';
            
            this.spells.forEach((spell, index) => {
                const spellEl = document.createElement('button');
                spellEl.className = 'spell-item';
                spellEl.dataset.spellId = spell.spellId;
                spellEl.dataset.gridIndex = index.toString();
                
                spellEl.innerHTML = `
                    <div class="spell-title">${spell.spellTitle}</div>
                    <div class="spell-shortcut">${spell.shortcut}</div>
                `;
                
                spellEl.addEventListener('click', () => {
                    window.ipc.invoke(IpcChannel.SPELL_EXECUTE, { spellId: spell.spellId });
                    this.hide();
                    window.ipc.invoke(IpcChannel.SPELLBOOK_CLOSE_REQUEST);
                });
                
                gridEl.appendChild(spellEl);
            });
            
            contentEl.appendChild(gridEl);
        } else {
            // Show placeholder content for other sections
            const placeholderEl = document.createElement('div');
            placeholderEl.className = 'content-placeholder';
            placeholderEl.innerHTML = `
                <div class="placeholder-icon">${this.createIcon(this.menu.find(m => m.id === this.activeMenuId)?.icon || SpellbookMenuIcon.SPELLS).innerHTML}</div>
                <div class="placeholder-text">${this.menu.find(m => m.id === this.activeMenuId)?.label || 'Content'} coming soon...</div>
            `;
            contentEl.appendChild(placeholderEl);
        }
    }

    private handleNavigation = ({ key }: { key: string }) => {
        if (!this.widget) return;

        if (this.navMode === 'menu') {
            this.handleMenuNavigation(key);
        } else {
            this.handleGridNavigation(key);
        }
    }

    protected onDestroy(): void {
        // Clean up IPC listener
        if (this.navigationCleanup) {
            this.navigationCleanup();
            this.navigationCleanup = null;
        }
    }

    private updateSelection() {
        if (!this.widget) return;

        // Update menu selection
        const navItems = this.queryAll('.nav-item');
        navItems.forEach((item, index) => {
            if (this.navMode === 'menu' && index === this.menuIndex) {
                item.classList.add('active');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('active');
            }
        });

        // Update content selection
        const contentItems = this.queryAll('.spell-item');
        contentItems.forEach((item, index) => {
            if (this.navMode === 'grid' && index === this.gridIndex) {
                item.classList.add('active');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('active');
            }
        });
    }

    private handleMenuNavigation(key: string) {
        const navItems = this.queryAll('.nav-item');
        if (navItems.length === 0) return;

        switch (key) {
            case 'ArrowUp':
                this.menuIndex = (this.menuIndex - 1 + navItems.length) % navItems.length;
                break;
            case 'ArrowDown':
                this.menuIndex = (this.menuIndex + 1) % navItems.length;
                break;
            case 'ArrowRight':
                if (this.activeMenuId === 'spells' && this.spells.length > 0) {
                    this.navMode = 'grid';
                    this.gridIndex = 0;
                }
                break;
            case 'Enter':
                this.activeMenuId = this.menu[this.menuIndex]?.id || 'spells';
                this.populateContent();
                if (this.activeMenuId === 'spells' && this.spells.length > 0) {
                    this.navMode = 'grid';
                    this.gridIndex = 0;
                }
                break;
            case 'Escape':
                this.hide();
                window.ipc.invoke(IpcChannel.SPELLBOOK_CLOSE_REQUEST);
                break;
        }
        this.updateSelection();
    }

    private handleGridNavigation(key: string) {
        const contentItems = this.queryAll('.spell-item');
        if (contentItems.length === 0) return;

        const gridEl = this.query('.spell-grid') as HTMLElement;
        if (!gridEl) return;
        
        // Calculate grid columns dynamically
        const gridComputedStyle = getComputedStyle(gridEl);
        const columns = gridComputedStyle.gridTemplateColumns.split(' ').length;

        switch (key) {
            case 'ArrowUp':
                if (this.gridIndex < columns) {
                    this.navMode = 'menu';
                } else {
                    this.gridIndex = Math.max(0, this.gridIndex - columns);
                }
                break;
            case 'ArrowLeft':
                if (this.gridIndex === 0) {
                    this.navMode = 'menu';
                } else {
                    this.gridIndex = (this.gridIndex - 1 + contentItems.length) % contentItems.length;
                }
                break;
            case 'ArrowRight':
                this.gridIndex = (this.gridIndex + 1) % contentItems.length;
                break;
            case 'ArrowDown':
                this.gridIndex = Math.min(contentItems.length - 1, this.gridIndex + columns);
                break;
            case 'Enter':
                const selectedItem = contentItems[this.gridIndex] as HTMLElement;
                const spellId = selectedItem.dataset.spellId;
                if (spellId) {
                    window.ipc.invoke(IpcChannel.SPELL_EXECUTE, { spellId });
                }
                this.hide();
                window.ipc.invoke(IpcChannel.SPELLBOOK_CLOSE_REQUEST);
                break;
            case 'Escape':
                this.hide();
                window.ipc.invoke(IpcChannel.SPELLBOOK_CLOSE_REQUEST);
                break;
        }
        this.updateSelection();
    }
} 