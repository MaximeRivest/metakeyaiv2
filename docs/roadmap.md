# MetaKey AI Development Roadmap

## Phase 1: Foundation ✅ COMPLETE
- [x] Consolidate specification in `docs/spec.md`
- [x] Create project structure 
- [x] Initialize git repository
- [x] Set up Rust system-agent skeleton
- [x] Set up Electron project structure
- [x] Create Ollama setup recipe
- [x] GitHub issue templates for open questions

## Phase 2: Core Prototype 🚧 CURRENT
### Rust System Agent
- [ ] Basic hotkey registration and event handling
- [ ] Clipboard monitoring and history
- [ ] JSON IPC communication with Electron
- [ ] Cross-platform builds (Windows, macOS, Linux)
- [ ] Performance validation (≤150ms response time)

### Electron IPC Framework
- [ ] Main process setup with TypeScript
- [ ] System agent spawn and lifecycle management
- [ ] Basic IPC contracts implementation
- [ ] SQLite clipboard database with encryption
- [ ] Provider manager stub

## Phase 3: First E2E Flow 🔮 NEXT
- [ ] Implement `resolveRuntime()` for managed Python
- [ ] Create simple Python spell example
- [ ] Ollama integration (server start/stop/health)
- [ ] End-to-end: Ctrl+Alt+Q → Python spell → Ollama → clipboard
- [ ] Basic error handling and logging

## Phase 4: MVP Features 📋 PLANNED
- [ ] UI renderer (React/Svelte + Tailwind)
- [ ] Settings dialog (F1 hotkey)
- [ ] Clipboard cycling (Ctrl+Alt+←/→)
- [ ] Plugin manifest parsing and validation
- [ ] Security consent flow for spell installation
- [ ] Basic whisper (STT) and echo (TTS) support

## Phase 5: Polish & Distribution 🚀 FUTURE
- [ ] Cross-platform packaging and signing
- [ ] Auto-updater implementation
- [ ] Marketplace integration
- [ ] Performance optimization
- [ ] Documentation and tutorials

## Success Criteria by Phase

### Phase 2 Success
- System agent can register hotkeys on all 3 platforms
- IPC communication works reliably
- Clipboard history persists encrypted
- Build system produces working binaries

### Phase 3 Success  
- User can press Ctrl+Alt+Q
- System runs a Python spell that calls local Ollama
- Result appears in clipboard within performance budget
- Logs show full execution trace

### Phase 4 Success
- All MVP hotkeys work as specified
- Settings UI allows provider configuration
- User can install and run a community spell
- Security warnings are clear and functional

## Open Questions Impact on Roadmap

See `docs/open-questions.md` for tracking. These decisions affect:
- **Cache choice** → Phase 2 architecture
- **Security UX** → Phase 4 consent flow  
- **Key derivation** → Phase 2 encryption

## Measuring Progress

- **Performance benchmarks** run on each commit
- **Cross-platform testing** via GitHub Actions
- **Weekly demos** of working features
- **User feedback** sessions with prototype builds 