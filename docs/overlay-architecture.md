# MetaKey AI Overlay Architecture

**Document-ID:** MK-OVERLAY-01  
**Revision:** v1.0  
**Date:** 2025-01-27  
**Status:** 🎮 COMPLETE ARCHITECTURE REDESIGN  

## Overview

MetaKey AI has been completely redesigned with a **game-style overlay system** that provides a 5-level widget experience from simple orbs to full HUD overlays. This system supports multi-monitor setups, real-time theming, and seamless edit/passthrough modes.

## Architecture Components

### 1. **OverlayManager** (`src/overlay-manager.ts`)
The central orchestrator that manages all overlay windows and state.

**Key Responsibilities:**
- Spawn overlay windows for each connected display
- Manage widget positioning and sizing
- Handle edit mode transitions
- Coordinate multi-monitor widget distribution
- Persist overlay state across sessions

**Core Methods:**
```typescript
class OverlayManager {
  async initialize(): Promise<void>           // Initialize overlay system
  toggleEditMode(): void                      // Toggle click-through/edit mode
  updateWidgetPosition(id, x, y, display?)   // Move widgets
  updateWidgetSize(id, size)                  // Resize widgets
  addWidget(type, display, x?, y?)           // Create new widgets
  duplicateToAllDisplays(id)                 // Clone widget to all monitors
}
```

### 2. **Overlay Renderer** (`renderer/overlay.html`)
Full-screen transparent overlay windows that render widgets.

**Features:**
- **5 Size Presets:** orb → mini → small → medium → full
- **4 Widget Types:** orb, timer, status, hud
- **Real-time theming** with CSS variables
- **Drag-and-drop** positioning in edit mode
- **Game-style notifications** and hotkey hints

### 3. **Development Console** (`renderer/overlay-dev.html`)
Hot-reload development environment for overlay components.

**Capabilities:**
- Live widget preview and testing
- Theme switching and validation
- Performance monitoring
- Console logging and debugging
- Multi-display simulation

## Widget System

### Size Presets

| Size | Dimensions | Use Case | Features |
|------|------------|----------|----------|
| **orb** | 32×32px | Status indicator | Pulsing animation, color feedback |
| **mini** | 64×64px | Compact widget | Icon + minimal text |
| **small** | 120×80px | Standard widget | Full functionality, compact |
| **medium** | 200×120px | Feature-rich | Multiple sections, rich content |
| **full** | 100vw×100vh | Complete HUD | Full overlay experience |

### Widget Types

#### **Orb Widget**
- Simple status indicator with pulsing animation
- Color-coded states (ready, casting, success, error)
- Theme-aware gradient backgrounds

#### **Timer Widget**
- Real-time countdown/countup display
- Configurable formats and intervals
- Visual progress indicators

#### **Status Widget**
- Text-based status information
- Dynamic content updates
- Icon and message display

#### **HUD Widget**
- Complete heads-up display
- Multiple information sections
- Game-style interface elements

## Multi-Monitor Support

### Display Management
```typescript
interface DisplayConfig {
  id: string;           // Display identifier
  widgets: string[];    // Widget IDs on this display
  theme: string;        // Per-display theme
}
```

### Widget Distribution
- **Independent positioning** per display
- **Duplicate to all** functionality
- **Automatic display detection** and window creation
- **Graceful handling** of display changes

## Edit Mode System

### Passthrough Mode (Default)
- **Click-through enabled** - overlay doesn't interfere with normal use
- **focusable: false** - no input stealing
- **Visual feedback only** - status updates and notifications

### Edit Mode (Ctrl+Alt+O)
- **Interactive overlay** - full mouse and keyboard interaction
- **Drag-and-drop** widget positioning
- **Resize controls** - cycle through size presets
- **Context menus** - right-click to add widgets
- **Visual indicators** - dashed borders and edit controls

### Mode Transition
```typescript
toggleEditMode(): void {
  this.state.global.editMode = !this.state.global.editMode;
  
  for (const [displayId, window] of this.overlayWindows) {
    window.setIgnoreMouseEvents(!this.state.global.editMode, { forward: true });
    window.setFocusable(this.state.global.editMode);
  }
}
```

## Theming Integration

### CSS Variables Architecture
All overlay elements use the existing MetaKey AI theme system:

```css
:root {
  --overlay-bg: rgba(15, 15, 25, 0.95);
  --overlay-border: rgba(0, 255, 0, 0.3);
  --overlay-text: #ffffff;
  --overlay-accent: #00ff00;
}
```

### Theme-Specific Orb Colors
```css
[data-theme="magical"] .widget[data-size="orb"] .widget-content {
  background: linear-gradient(45deg, #8b5cf6, #06b6d4);
}

[data-theme="cyberpunk"] .widget[data-size="orb"] .widget-content {
  background: linear-gradient(45deg, #ff00ff, #00ffff);
}
```

## State Persistence

### Overlay State Structure
```typescript
interface OverlayState {
  displays: Record<string, DisplayConfig>;
  widgets: Record<string, OverlayWidget>;
  global: {
    editMode: boolean;
    defaultTheme: string;
    hotkeys: { toggleEdit: string; };
  };
}
```

### Storage Location
- **Path:** `~/.metakey/overlay-state.json`
- **Auto-save** on every change
- **Graceful fallback** to defaults if corrupted

## IPC Communication

### Main Process → Overlay
```typescript
// State updates
window.webContents.send('overlay:state-update', state);

// Status notifications
window.webContents.send('overlay:status-update', { text, icon, level });

// Hotkey hints
window.webContents.send('overlay:hint-show', { keys, label, duration });
```

### Overlay → Main Process
```typescript
// Widget manipulation
ipcRenderer.invoke('overlay:update-widget-position', widgetId, x, y);
ipcRenderer.invoke('overlay:add-widget', type, displayId, x, y);
ipcRenderer.invoke('overlay:toggle-edit');
```

## Integration with MetaKey AI

### Spell System Integration
The overlay system seamlessly integrates with the existing spell system:

```typescript
// In handleAISpell()
ipcMain.emit('overlay:status-update', null, {
  text: 'Casting spell...',
  icon: '⚡',
  level: 'info'
});

// After spell completion
ipcMain.emit('overlay:status-update', null, {
  text: 'Spell completed successfully!',
  icon: '✨',
  level: 'success'
});
```

### Hotkey Integration
- **Ctrl+Alt+O** - Toggle edit mode
- **Ctrl+Alt+Q** - Trigger AI spell (shows overlay feedback)
- **F1** - Open settings (includes overlay configuration)

## Development Workflow

### Development Mode
```bash
npm run dev:overlay
```

This enables:
- **Development window** with hot-reload testing
- **Console logging** and debugging
- **Performance monitoring**
- **Live theme switching**

### Testing Overlays
1. **Start development mode**
2. **Open dev console** (automatic)
3. **Test widget sizes** in preview area
4. **Switch themes** and validate appearance
5. **Simulate spell casting** and status updates

## Performance Considerations

### Optimization Strategies
- **backgroundThrottling: false** - Smooth animations
- **Hardware acceleration** - GPU-accelerated rendering
- **Efficient DOM updates** - Minimal reflows
- **Debounced state saves** - Avoid disk thrashing

### Memory Management
- **Window cleanup** on display removal
- **Event listener cleanup** on shutdown
- **State size limits** - Prevent unbounded growth

## Migration from Legacy Widget

The new overlay system **replaces** the existing widget.html system:

### Legacy Mode (Temporary)
Set `OVERLAY_LEGACY_MODE=true` to use the old widget system during transition.

### Full Migration
1. **Remove legacy widget** creation code
2. **Update hotkey handlers** to use overlay system
3. **Migrate widget state** to overlay format
4. **Update theme system** integration

## Future Enhancements

### Planned Features
- **Widget marketplace** - Custom widget types
- **Animation presets** - Theme-specific effects
- **Voice integration** - Audio feedback
- **Plugin widgets** - Third-party extensions

### Performance Targets
- **Overlay spawn time** ≤ 100ms
- **Edit mode toggle** ≤ 50ms
- **Widget positioning** ≤ 16ms (60 FPS)
- **Memory usage** ≤ 50MB per overlay

## Troubleshooting

### Common Issues

**Overlay not appearing:**
- Check display detection: `screen.getAllDisplays()`
- Verify window creation: Look for overlay window logs
- Ensure transparency support: Update graphics drivers

**Edit mode not working:**
- Verify hotkey registration: Check system agent logs
- Test click-through toggle: Manual IPC call
- Check window focus state: `window.isFocused()`

**Performance issues:**
- Monitor FPS in dev console
- Check memory usage: `performance.memory`
- Reduce animation complexity: Use `prefers-reduced-motion`

### Debug Commands
```typescript
// In dev console
ipcRenderer.invoke('overlay:get-state');           // Get current state
ipcRenderer.invoke('overlay:toggle-edit');         // Toggle edit mode
ipcRenderer.invoke('overlay:add-widget', 'orb');   // Add test widget
```

## Conclusion

The new overlay architecture transforms MetaKey AI into a **professional game-style desktop assistant** with:

- ✅ **Multi-monitor support** - Works across all connected displays
- ✅ **5-level widget system** - From subtle orbs to full HUD
- ✅ **Edit/passthrough modes** - Non-intrusive by default
- ✅ **Real-time theming** - Seamless visual integration
- ✅ **Developer tools** - Hot-reload testing environment
- ✅ **Performance optimized** - Smooth 60 FPS animations

This architecture provides the foundation for unlimited expansion while maintaining the core MetaKey AI philosophy of **powerful, unobtrusive desktop assistance**. 