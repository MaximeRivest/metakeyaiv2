import { IpcChannel, SpellbookEntry, SpellbookMenuItem } from "shared-types";
import { BaseWidget } from "./BaseWidget";

export class SpellbookView extends BaseWidget {
    private spells: SpellbookEntry[] = [];
    private menu: SpellbookMenuItem[] = [];
    private navMode: 'menu' | 'grid' = 'menu';
    private menuIndex = 0;
    private gridIndex = 0;

    constructor() {
        super('spell-book');
    }

    protected onMount(): void {
        // Widget is ready, no additional setup needed yet
    }

    public update(payload: { spells: SpellbookEntry[], menu: SpellbookMenuItem[] }): void {
        if (!this.widget) return;

        this.spells = payload.spells;
        this.menu = payload.menu;
        this.populate();
        this.setNavMode(true);
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

    private setNavMode(isActive: boolean) {
        if (isActive) {
            document.addEventListener('keydown', this.handleKeyDown, true);
        } else {
            document.removeEventListener('keydown', this.handleKeyDown, true);
            this.queryAll('.selected').forEach(el => el.classList.remove('selected'));
        }
    }

    protected onDestroy(): void {
        // Clean up event listeners
        document.removeEventListener('keydown', this.handleKeyDown, true);
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

    private handleKeyDown = (e: KeyboardEvent) => {
        if (!this.widget) return;
        e.preventDefault();
        e.stopPropagation();

        if (this.navMode === 'menu') {
            this.handleMenuKeyDown(e);
        } else {
            this.handleGridKeyDown(e);
        }
    }

    private handleMenuKeyDown = (e: KeyboardEvent) => {
        const menuItems = this.queryAll('.spellbook-menu-item');
        if (menuItems.length === 0) return;

        switch (e.key) {
            case 'ArrowUp':
                this.menuIndex = (this.menuIndex - 1 + menuItems.length) % menuItems.length;
                break;
            case 'ArrowDown':
                this.menuIndex = (this.menuIndex + 1) % menuItems.length;
                break;
            case 'ArrowRight':
                this.navMode = 'grid';
                this.gridIndex = 0;
                break;
            case 'Enter':
                console.log(`Menu item selected: ${menuItems[this.menuIndex].textContent}`);
                break;
            case 'Escape':
                this.setNavMode(false);
                window.ipc.invoke(IpcChannel.SPELLBOOK_CLOSE_REQUEST);
                break;
        }
        this.updateSelection();
    }

    private handleGridKeyDown = (e: KeyboardEvent) => {
        const gridItems = this.queryAll('.spell-grid-item');
        if (gridItems.length === 0) return;

        const gridEl = this.query('.spell-grid') as HTMLElement;
        if (!gridEl) return;
        const columns = getComputedStyle(gridEl).gridTemplateColumns.split(' ').length;

        switch (e.key) {
            case 'ArrowLeft':
                if (this.gridIndex % columns === 0) {
                    this.navMode = 'menu';
                } else {
                    this.gridIndex--;
                }
                break;
            case 'ArrowRight':
                this.gridIndex = (this.gridIndex + 1) % gridItems.length;
                break;
            case 'ArrowUp':
                this.gridIndex = (this.gridIndex - columns + gridItems.length) % gridItems.length;
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
                this.setNavMode(false);
                window.ipc.invoke(IpcChannel.SPELLBOOK_CLOSE_REQUEST);
                break;
            case 'Escape':
                this.setNavMode(false);
                window.ipc.invoke(IpcChannel.SPELLBOOK_CLOSE_REQUEST);
                break;
        }
        this.updateSelection();
    }
} 