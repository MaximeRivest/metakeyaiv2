Below is a “theme engine starter-kit” that slots cleanly into the MetaKey AI architecture you already froze. It lets any dev or designer ship an **entire look-and-feel—including orb↔full-HUD layouts, animations, sounds, and popup styles—by dropping one ZIP file into `themes/`**. The default app ships with 3-5 reference themes that double as living docs.

---

## 1.  Theme-pack layout

```
neon-bliss/
├─ theme.json          ← manifest
├─ tokens.css          ← design tokens (CSS vars)
├─ orb.svg             ← vector used at any size
├─ wave.webm           ← 750×750 chroma-key video for “mic wave” fx
├─ sounds/
│   ├─ keypress.ogg
│   ├─ spell-start.ogg
│   └─ spell-done.ogg
└─ widgets/
    ├─ clipboard-track.jsx
    └─ stats-ticker.jsx
```

*The whole folder zips → **`~/.metakey/themes/neon-bliss.zip`** → lazy-loaded at runtime.*

---

## 2.  `theme.json` – the contract

```jsonc
{
  "id": "neon-bliss",
  "name": "Neon Bliss",
  "author": "Pixie Labs",
  "version": "1.0.0",
  "base": "metakey-default",      // inherit + override
  "tokens": "tokens.css",
  "sizes": {
    "orb":     { "diameter": 72 },
    "mini":    { "diameter": 96 },
    "small":   { "w": 240, "h": 120 },
    "medium":  { "w": 340, "h": 180 },
    "full":    { "w": "100vw", "h": "100vh" }
  },
  "assets": {
    "icon":     "orb.svg",
    "micWave":  "wave.webm"
  },
  "sounds": {
    "keypress":    { "src": "sounds/keypress.ogg", "volume": 0.4 },
    "spellStart":  "sounds/spell-start.ogg",
    "spellDone":   "sounds/spell-done.ogg"
  },
  "widgets": [
    { "id": "clipboard-track", "src": "widgets/clipboard-track.jsx" },
    { "id": "stats",           "src": "widgets/stats-ticker.jsx"   }
  ],
  "bindings": {
    "events": {
      "hotkey":        ["pulse", "sounds.keypress"],
      "mic.start":     ["wave.start"],
      "mic.volume":    ["wave.gain"],       // param driven
      "spell.start":   ["pulse", "sounds.spellStart"],
      "spell.done":    ["flashGreen", "sounds.spellDone", "toast"]
    }
  }
}
```

*Anything not listed falls back to the parent theme.*

---

## 3.  Runtime pieces

| Piece                        | Where it lives                                                                                                            | Job                                                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **ThemeLoader** (main proc)  | `src/main/theme-loader.ts`                                                                                                | Scans `themes/*.{zip,dir}`, validates manifest (JSON Schema), exposes a read-only map via IPC (`theme:list`, `theme:get`). |
| **StyleInjector** (renderer) | `src/renderer/theme.ts`                                                                                                   | 1) injects `<style>@import url(tokens.css)</style>` into `<head>` 2) resolves asset URLs via `blob:`                       |
| **OrbRoot / HUDRoot**        | React/Svelte components fed by Zustand store. They never hard-code colours, fonts, sizes—everything is `var(--mx-* )`.    |                                                                                                                            |
| **FX Engine**                | tiny middleware (`fx.ts`) that maps incoming events to CSS class toggles, WebAudio playback, or Lottie/Liquid animations. |                                                                                                                            |

---

## 4.  Design tokens (example `tokens.css`)

```css
:root[data-theme="neon-bliss"] {
  --mx-bg:            rgba(15,15,25,.92);
  --mx-accent:        #00ffd0;
  --mx-accent-subtle: rgba(0,255,208,.15);
  --mx-text:          #ffffff;
  --mx-font:          'Inter', sans-serif;

  /* animation knobs */
  --mx-pulse-speed:   600ms;
  --mx-wave-color:    var(--mx-accent);
  --mx-font-size-orb: clamp(10px, 2.8vmin, 16px);
}
```

*Star-of-the-show: only these variables differ among themes.*

---

## 5.  Event pipeline (no new global state!)

```
Rust Agent  ─► main      ───┐
                            │   ipcRenderer.send('bus', evt)
Spell subprocess ──► main ──┘
                       ▲
                       │ internal spell tracker
```

*Renderer subscribes once:*

```ts
ipcRenderer.on('bus', (_, evt) => fxEngine.handle(evt))
```

`fxEngine` consults the **current theme’s `bindings.events`** array to determine which CSS classes to toggle, which `<audio>` clip to play, whether to spawn an ephemeral “toast” component, etc.

---

## 6.  Pop-up / toast pattern

*Goal: ephemeral, non-blocking visual breadcrumb.*

```tsx
function Toast({msg, kind='info'}) {
  return (
    <div className={`toast toast-${kind}`} >
      {msg}
    </div>
  )
}
```

CSS:

```css
.toast {
  position:fixed; right:var(--toast-x,20px); bottom:var(--toast-y,40px);
  min-width:200px; padding:8px 12px;
  background:var(--mx-accent-subtle); color:var(--mx-text);
  border-radius:12px; opacity:0; transform:translateY(20px);
  animation: toast-in 200ms ease-out forwards,
             toast-out 250ms ease-in forwards 2.8s;
}
@keyframes toast-in  { to {opacity:1; transform:none;} }
@keyframes toast-out { to {opacity:0;} }
```

`fxEngine.toast(msg, kind)` = render `<Toast>` into a Portal above everything; garbage-collect after animationend.

---

## 7.  Theme-author DX

1. **`npm run dev -- --theme neon-bliss`**:
   *Vite dev server* injects that theme; HMR reloads tokens and widgets automatically.
2. **`npm run pack-theme neon-bliss`**:
   CLI zips directory, validates schema, emits SHA256 → ready for Marketplace.
3. **VS Code snippets** for common bindings (`spell.start`, `mic.volume`, etc.).

---

## 8.  Extensibility guard-rails

*We don’t want arbitrary JS in tokens but we do want widget freedom.*

| File                      | Allowed                                                                          | Sandboxed?                                          |
| ------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------- |
| `tokens.css`              | Pure CSS vars & keyframes                                                        | n/a                                                 |
| `*.svg`, `*.webm`, sounds | Static                                                                           | n/a                                                 |
| `widgets/*.jsx`           | React component default-export; props are frozen; may import `@metakey/sdk` only | Runs in isolated contextBridge; no nodeIntegration. |

Thus a theme can’t exfiltrate data or hit the filesystem, but *can* query the reactive store (`useMetaStore()`) to display clipboard index, model latency, etc.

---

## 9.  Fallback strategy

*User installs a theme that fat-fingers a token → we don’t crash.*

* `tokens.css` loads inside a try/catch; missing vars fall back to `metakey-default`’s root.
* If `widgets/*` fails to compile, renderer logs the error and removes the widget entry, but orb still appears.

---

## 10.  Real-world walk-through

1. **Alice** presses *Ctrl + Alt + Q* → event `spell.start`.
2. `fxEngine` sees in current theme: `"spell.start": ["pulse","sounds.spellStart"]`.
3. CSS class `.fx-pulse` adds `filter:drop-shadow(...)` + keyframe `scale(1.1)` governed by `var(--mx-pulse-speed)`.
4. Spell finishes → `spell.done` triggers:

   * `flashGreen` class for 300 ms
   * play `spell-done.ogg`
   * `toast("Spell finished ✓")`.

No React code had to be edited; new theme could decide to swap the green flash for confetti, different sound, or even *no* signal at all.

---

### In sum

* **Everything visual = theme-pack** (CSS vars, media, widgets).
* **Everything behavioural = event bindings** in `theme.json`.
* Default codebase stays UI-agnostic—no magic colour names, no fixed sizes—so anyone can ship wild cyberpunk or ultra-minimal looks without touching core code.

That gives your community the same creative surface area modders enjoy in AAA games while keeping your core stable and tiny. Happy theming!
