# MetaKey AI

A cross-platform desktop assistant that lives in the clipboard/hot-key layer, enabling powerful text processing, speech interaction, and extensible "spells" in any programming language.

## Quick Start

This project is in early development. See the complete specification in [`docs/spec.md`](docs/spec.md).

## Architecture

- **Rust System Agent** - Native hotkey and clipboard handling
- **Electron Main Process** - IPC coordination, plugin management, local LLM integration  
- **React/Svelte UI** - Always-on widget + zen-mode interface

## Development Setup

```bash
# Clone and setup
git clone <repository-url>
cd metakeyaiv2

# Install dependencies (coming soon)
npm install

# Build system agent (coming soon)
cd system-agent && cargo build --release

# Start development
npm run dev
```

## Project Status

- [x] Specification consolidated ([`docs/spec.md`](docs/spec.md))
- [ ] Rust system agent prototype
- [ ] Electron IPC framework
- [ ] First Ollama recipe implementation

## License

GPL-2.0 (same as Linux) 