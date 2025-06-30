/**
 * Base class for all overlay widgets.
 * Provides common functionality like finding elements, managing lifecycle, etc.
 */
export abstract class BaseWidget {
    protected widget: HTMLElement | null = null;
    protected widgetId: string;

    constructor(widgetId: string) {
        this.widgetId = widgetId;
        // Defer DOM lookup and child-class initialization until mount() is called.
    }

    /**
     * Mounts the widget by looking up its root element in the DOM and calling
     * the subclass's onMount lifecycle hook. This MUST be invoked by the
     * consumer (e.g. the Renderer) _after_ the subclass constructor has
     * completed to avoid the classic "base-constructor calls overridable
     * method" pitfall.
     */
    public mount(): void {
        if (this.widget) return; // Already mounted – idempotent
        this.findWidget();
    }

    /**
     * Get a CSS variable value from the current theme
     * @param varName The CSS variable name (e.g., '--mx-primary-color')
     * @param defaultValue Default value if the variable is not set
     */
    protected getThemeVar(varName: string, defaultValue: string = ''): string {
        return getComputedStyle(document.documentElement)
            .getPropertyValue(varName)
            .trim() || defaultValue;
    }

    /**
     * Find the widget element in the DOM
     */
    private findWidget(): void {
        this.widget = document.querySelector(`[data-widget-id="${this.widgetId}"]`);
        if (this.widget) {
            this.onMount();
        }
    }

    /**
     * Query for an element within this widget
     */
    protected query<T extends HTMLElement>(selector: string): T | null {
        if (!this.widget) return null;
        return this.widget.querySelector<T>(selector);
    }

    /**
     * Query for all elements within this widget
     */
    protected queryAll<T extends HTMLElement>(selector: string): NodeListOf<T> {
        if (!this.widget) return document.querySelectorAll('.__non_existent__'); // Return empty NodeList
        return this.widget.querySelectorAll<T>(selector);
    }

    /**
     * Check if this widget exists in the current layout
     */
    public exists(): boolean {
        return this.widget !== null;
    }

    /**
     * Show the widget
     */
    public show(): void {
        if (this.widget) {
            this.widget.style.display = 'block';
        }
    }

    /**
     * Hide the widget
     */
    public hide(): void {
        if (this.widget) {
            this.widget.style.display = 'none';
        }
    }

    /**
     * Called when the widget is found in the DOM
     * Override this to set up event listeners, cache elements, etc.
     */
    protected abstract onMount(): void;

    /**
     * Clean up any resources (event listeners, timers, etc.)
     * Should be called when the widget is removed or the layout changes
     */
    public destroy(): void {
        this.onDestroy();
        this.widget = null;
    }

    /**
     * Override to clean up widget-specific resources
     */
    protected onDestroy(): void {
        // Override in subclasses
    }
} 