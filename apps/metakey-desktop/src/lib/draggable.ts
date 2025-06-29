import { IpcChannel } from "shared-types";

interface DraggableOptions {
  onDragEnd?: (el: HTMLElement, x: number, y: number) => void;
}

export class Draggable {
  private element: HTMLElement;
  private options: DraggableOptions;

  private isDragging = false;
  private initialX = 0;
  private initialY = 0;
  private offsetX = 0;
  private offsetY = 0;

  constructor(element: HTMLElement, options: DraggableOptions = {}) {
    this.element = element;
    this.options = options;
    this.element.addEventListener('mousedown', this.onMouseDown);
  }

  public destroy() {
    this.element.removeEventListener('mousedown', this.onMouseDown);
  }

  private onMouseDown = (e: MouseEvent) => {
    // Only allow dragging with the primary mouse button
    if (e.button !== 0) return;

    this.isDragging = true;
    this.element.classList.add('dragging');
    this.element.style.cursor = 'grabbing';

    // Get the current position relative to the viewport
    const rect = this.element.getBoundingClientRect();
    
    // Pin the element's position using style.left and style.top
    // This overrides any CSS-based positioning like `transform` or `bottom`.
    this.element.style.transform = 'none';
    this.element.style.left = `${rect.left}px`;
    this.element.style.top = `${rect.top}px`;
    this.element.style.bottom = 'auto';
    this.element.style.right = 'auto';


    // Store initial mouse position
    this.initialX = e.clientX;
    this.initialY = e.clientY;

    // Store initial element position
    this.offsetX = rect.left;
    this.offsetY = rect.top;

    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.isDragging) return;
    
    const deltaX = e.clientX - this.initialX;
    const deltaY = e.clientY - this.initialY;
    
    const newX = this.offsetX + deltaX;
    const newY = this.offsetY + deltaY;

    this.element.style.left = `${newX}px`;
    this.element.style.top = `${newY}px`;
  };

  private onMouseUp = (e: MouseEvent) => {
    if (!this.isDragging) return;

    this.isDragging = false;
    this.element.classList.remove('dragging');
    this.element.style.cursor = 'grab';

    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);

    const finalRect = this.element.getBoundingClientRect();
    
    if (this.options.onDragEnd) {
      this.options.onDragEnd(this.element, finalRect.left, finalRect.top);
    }
  };
} 