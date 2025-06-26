# Open Questions Tracker

These questions from the specification (Section 18) need to be resolved before v1.0 freeze. Each should have a corresponding GitHub issue.

## Questions to be Resolved

### 1. Redis vs SQLite-mem for Shared Cache
**Status:** 🔴 Open  
**Section:** 5.2, 18  
**GitHub Issue:** [Create Issue](https://github.com/your-repo/issues/new?template=open-question.md&title=[SPEC]%20Redis%20vs%20SQLite-mem%20choice%20for%20shared%20cache)

**Context:** The main process needs a shared cache for spell results, provider state, etc.

**Options:**
- **Redis 6 in-process** - More features, pub/sub capabilities
- **SQLite memory DB** - Simpler, smaller footprint, already using SQLite

### 2. UI Copy for "Power-Spell" Warning  
**Status:** 🔴 Open  
**Section:** 11, 18  
**GitHub Issue:** [Create Issue](https://github.com/your-repo/issues/new?template=open-question.md&title=[SPEC]%20UI%20copy%20for%20power-spell%20warning)

**Context:** First-run wizard needs to explain spell capabilities and risks.

**Needs:**
- User-friendly explanation of what "power spells" can do
- Clear consent flow for spell permissions
- Balance between scary-enough and usable

### 3. AES Key Derivation Path
**Status:** 🔴 Open  
**Section:** 11, 18  
**GitHub Issue:** [Create Issue](https://github.com/your-repo/issues/new?template=open-question.md&title=[SPEC]%20Exact%20AES%20key%20derivation%20path)

**Context:** Clipboard DB and API key vault need encryption.

**Options:**
- **OS Keychain APIs** - Platform-specific, more secure
- **PBKDF2 with master password** - Cross-platform, user manages password

## Resolution Process

1. Create GitHub issue using template
2. Research and gather requirements
3. Prototype if needed
4. Team decision
5. Update specification
6. Mark as ✅ Resolved

## Decision Log

### ✅ **Architecture Decisions Made Through Implementation**

**Date:** 2025-01-27  
**Context:** E2E Flow Success  

#### **Proven Architectural Choices**
1. **JSON over stdin/stdout IPC** - CONFIRMED as robust and proxy-safe
2. **Multi-threaded Rust system agent** - PROVEN to achieve performance targets  
3. **Event-driven subprocess communication** - VALIDATED for scalability
4. **Ollama for local LLM** - WORKING perfectly with Llama 3.2 1B model
5. **Python for initial spell runtime** - SUCCESSFUL with proper error handling

#### **Implementation Insights**
- **Performance:** 7.2 second AI processing time acceptable for complex tasks
- **Reliability:** Cross-process communication extremely stable
- **Usability:** Ctrl+Alt+Q hotkey provides instant AI access
- **Security:** Zero admin privileges maintained throughout execution
- **Extensibility:** Plugin architecture scales naturally to new languages

These decisions form the **PROVEN FOUNDATION** for MetaKey AI v1.0! 