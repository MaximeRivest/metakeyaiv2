import { IpcChannel, SpellbookEntry, SpellbookMenuItem } from "shared-types";
import { BaseWidget } from "./BaseWidget";

export class SpellbookView extends BaseWidget {
    private spells: SpellbookEntry[] = [];
    private menu: SpellbookMenuItem[] = [];
    private navMode: 'menu' | 'grid' = 'menu';
    private menuIndex = 0;
    private gridIndex = 0;
    private navigationCleanup: (() => void) | null = null;

    constructor() {
        super('spell-book');
    }

    protected onMount(): void {
        // Set up navigation listener via IPC
        this.navigationCleanup = window.ipc.on(IpcChannel.SPELLBOOK_NAVIGATE, this.handleNavigation);
    }

    public update(payload: { spells: SpellbookEntry[], menu: SpellbookMenuItem[] }): void {
        if (!this.widget) return;

        this.spells = payload.spells;
        this.menu = payload.menu;
        this.populate();
        this.show();
    }

    private populate() {
        const menuEl = this.query<HTMLElement>('.spellbook-menu');
        const gridEl = this.query<HTMLElement>('.spell-grid');
        if (!menuEl || !gridEl) return;
        
        menuEl.innerHTML = '';
        gridEl.innerHTML = '';

        this.menu.forEach(item => {
            const el = document.createElement('div');
            el.className = 'spellbook-menu-item';
            el.dataset.menuId = item.id;
            el.textContent = item.label;
            menuEl.appendChild(el);
        });

        this.spells.forEach(spell => {
            const el = document.createElement('div');
            el.className = 'spell-grid-item';
            el.dataset.spellId = spell.spellId;
            el.innerHTML = `
                <span>${spell.spellTitle}</span>
                <span class="shortcut">${spell.shortcut}</span>
            `;
            gridEl.appendChild(el);
        });

        this.menuIndex = 0;
        this.gridIndex = 0;
        this.navMode = 'menu';
        this.updateSelection();
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

        const menuItems = this.queryAll('.spellbook-menu-item');
        menuItems.forEach((item, index) => {
            if (this.navMode === 'menu' && index === this.menuIndex) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('selected');
            }
        });

        const gridItems = this.queryAll('.spell-grid-item');
        gridItems.forEach((item, index) => {
            if (this.navMode === 'grid' && index === this.gridIndex) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('selected');
            }
        });
    }

    private handleMenuNavigation(key: string) {
        const menuItems = this.queryAll('.spellbook-menu-item');
        if (menuItems.length === 0) return;

        switch (key) {
            case 'ArrowLeft':
                this.menuIndex = (this.menuIndex - 1 + menuItems.length) % menuItems.length;
                break;
            case 'ArrowRight':
                this.menuIndex = (this.menuIndex + 1) % menuItems.length;
                break;
            case 'ArrowDown':
                this.navMode = 'grid';
                this.gridIndex = 0;
                break;
            case 'Enter':
                console.log(`Menu item selected: ${menuItems[this.menuIndex].textContent}`);
                break;
            case 'Escape':
                this.hide();
                window.ipc.invoke(IpcChannel.SPELLBOOK_CLOSE_REQUEST);
                break;
        }
        this.updateSelection();
    }

    private handleGridNavigation(key: string) {
        const gridItems = this.queryAll('.spell-grid-item');
        if (gridItems.length === 0) return;

        const gridEl = this.query('.spell-grid') as HTMLElement;
        if (!gridEl) return;
        const columns = getComputedStyle(gridEl).gridTemplateColumns.split(' ').length;

        switch (key) {
            case 'ArrowUp':
                if (this.gridIndex < columns) {
                    this.navMode = 'menu';
                } else {
                    this.gridIndex = (this.gridIndex - columns + gridItems.length) % gridItems.length;
                }
                break;
            case 'ArrowLeft':
                this.gridIndex = (this.gridIndex - 1 + gridItems.length) % gridItems.length;
                break;
            case 'ArrowRight':
                this.gridIndex = (this.gridIndex + 1) % gridItems.length;
                break;
            case 'ArrowDown':
                this.gridIndex = (this.gridIndex + columns) % gridItems.length;
                break;
            case 'Enter':
                const selectedItem = gridItems[this.gridIndex] as HTMLElement;
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