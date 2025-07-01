# Unified State System Refactoring

This document explains the comprehensive refactoring that transforms MetaKey AI from a distributed, special-cased widget system to a unified, state-driven architecture.

## Overview

The refactoring addresses the core issue where the spellbook widget was treated as a special case with its own `role` property and dedicated IPC channels, breaking the unified theme system. The solution creates a centralized state management system where all widgets follow the same patterns.

## Key Changes

### 1. Unified Widget Configuration

**Before:**
```typescript
interface WidgetConfig {
  widgetId: string;
  component: string;
  size: 'orb' | 'mini' | 'small' | 'medium' | 'full';
  role?: 'spellbook'; // Special case!
  x?: number | string;
  y?: number | string;
}
```

**After:**
```typescript
interface WidgetConfig {
  widgetId: string;
  component: string;
  stateSource: WidgetStateSource;
  size: 'orb' | 'mini' | 'small' | 'medium' | 'full';
  x?: number | string;
  y?: number | string;
  visibleInModes?: AppMode[]; // Generic visibility control
}
```

### 2. Centralized Application State

**New State Structure:**
```typescript
interface AppState {
  mode: AppMode; // 'idle' | 'spellbook' | 'echoes' | 'settings' | 'edit'
  status: OverlayStatus;
  spellbook: {
    isVisible: boolean;
    entries: SpellbookEntry[];
    menu: SpellbookMenuItem[];
    selectedMenu: string;
    selectedSpell: number;
    navigationMode: 'menu' | 'grid';
  };
  echoes: { /* ... */ };
  settings: { /* ... */ };
  keyStream: { pressedKeys: string };
  stats: { /* ... */ };
}
```

### 3. Unified IPC Channels

**Before:**
- `OVERLAY_SET_STATUS`
- `OVERLAY_SHOW_CONTENT`
- `SPELLBOOK_UPDATE`
- `SPELLBOOK_NAVIGATE`
- `SPELLBOOK_CLOSE_REQUEST`
- `SPELL_EXECUTE`
- `SPELL_START`
- `SPELL_SUCCESS`
- `SPELL_ERROR`

**After:**
- `APP_STATE_UPDATE` - Single channel for all state changes
- `WIDGET_STATE_UPDATE` - Targeted widget updates
- `NAVIGATION_INPUT` - Unified navigation handling
- `WIDGET_ACTION_REQUEST` - Generic widget interactions

### 4. AppStateManager

A new centralized state manager that:
- Maintains the single source of truth for application state
- Handles all state transitions and mode changes
- Emits events for state changes
- Manages navigation logic for all modes
- Provides state slices for different widget sources

**Key Methods:**
```typescript
setMode(mode: AppMode): void
setStatus(status: OverlayStatus): void
setKeyStream(keys: string): void
updateSpellbook(entries: SpellbookEntry[], menu: SpellbookMenuItem[]): void
navigateSpellbook(direction: 'up' | 'down' | 'left' | 'right' | 'enter' | 'escape'): void
getStateForSource(source: WidgetStateSource): any
isWidgetVisible(visibleInModes?: AppMode[]): boolean
```

## Architecture Benefits

### 1. True UI/Logic Separation
- **Main Process**: Manages state and business logic headlessly
- **Renderer**: Pure view layer that reflects state
- **Keyboard Navigation**: Can work completely without UI

### 2. Unified Theme Application
- All widgets receive the same theme tokens
- No special-casing for spellbook or any other widget
- Consistent styling across all components

### 3. Mode-Driven Visibility
- Widgets declare which modes they're visible in
- Automatic show/hide based on application mode
- No manual widget management

### 4. Scalable Navigation
- Same navigation system works for spellbook, echoes, settings
- Easy to add new modes without changing core architecture
- Hotkey bindings dynamically adjust based on current mode

### 5. Reactive State Updates
- Single state change updates all relevant widgets
- No manual synchronization between components
- Immediate UI reflection of state changes

## Migration Path

### Phase 1: Core Infrastructure ✅
- [x] New type definitions in `shared-types`
- [x] AppStateManager implementation
- [x] Updated theme configurations
- [x] Unified IPC channels

### Phase 2: Widget Updates ✅
- [x] SpellbookView refactored to use state updates
- [x] Renderer updated for unified state handling
- [x] Main application updated to use AppStateManager

### Phase 3: Navigation System ✅
- [x] Dynamic hotkey binding based on mode
- [x] Unified navigation input handling
- [x] State-driven widget interactions

### Phase 4: Future Enhancements
- [ ] Echoes mode implementation
- [ ] Settings mode implementation
- [ ] Advanced navigation patterns
- [ ] State persistence

## User Journey Alignment

This refactoring directly supports the user journeys described in `normal-simple-journey.md`:

1. **Keyboard-Driven Operation**: The entire app can function without UI, as state management is separated from presentation
2. **Mode Transitions**: `ctrl-alt-b` → spellbook mode, arrow keys navigate, enter executes - all driven by centralized state
3. **Context Switching**: Easy transitions between spells, echoes, themes, settings using the same navigation patterns
4. **Visual Feedback**: UI serves as pure visual indicator of current state, never the source of truth

## Code Organization

```
apps/metakey-desktop/src/
├── AppStateManager.ts          # Central state management
├── index.ts                    # Main process (business logic)
├── renderer.ts                 # UI layer (pure view)
└── views/
    ├── BaseWidget.ts           # Common widget interface
    ├── SpellbookView.ts        # State-driven spellbook
    ├── MainHUDView.ts          # Status display
    ├── NotificationsView.ts    # Notifications
    └── StatsView.ts            # Statistics display

packages/shared-types/src/
└── ipc.ts                      # Unified type definitions
```

## Testing Strategy

The new architecture enables comprehensive testing:

1. **State Manager**: Unit test all state transitions
2. **Main Process**: Test business logic without UI
3. **Renderer**: Test UI updates given state changes
4. **Integration**: Test complete user journeys via state changes

## Performance Benefits

- **Reduced IPC Traffic**: Single state update replaces multiple channel broadcasts
- **Optimized Updates**: Only changed widgets receive updates
- **Memory Efficiency**: Single state object instead of distributed state
- **Faster Mode Switching**: State-driven visibility vs. widget recreation

This refactoring creates a robust foundation for building the advanced user experiences described in the project documentation while maintaining clean separation of concerns and excellent developer experience. 