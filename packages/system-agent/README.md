# System Agent

## Goal

The `system-agent` is a lightweight, standalone Rust binary responsible for all low-level keyboard interaction with the host operating system. It is designed to be a simple, robust, and performant service that has no knowledge of the larger application's business logic.

Its sole purpose is to capture keyboard input and report it to the main application in a structured way.

---

## Core Responsibilities

1.  **Raw Key Event Streaming:** Listens for all global `KeyPress` and `KeyRelease` events and reports them to the main application. This is used to power features like the on-screen key stream display.
2.  **Dynamic Hotkey Detection:** Accepts commands to register or unregister specific hotkey combinations (e.g., `Control+Alt+Q`). It then watches the raw key stream for these combinations and emits a special event when one is detected.

## Key Features

- **Robust Parsing:** Uses a streaming JSON deserializer to safely parse commands from `stdin`.
- **Graceful Shutdown:** A `Ctrl-C` signal will cause the agent to shut down cleanly.
- **Concurrent & Safe:** Uses `RwLock` for shared state to allow non-blocking reads from multiple threads.
- **Flexible Hotkey Matching:** A registered hotkey will fire even if extra modifier keys are also held down. For example, if `Control+Q` is registered, pressing `Control+Shift+Q` will still trigger the hotkey.

---

## Communication Protocol

Communication with the main application happens exclusively through `stdin` and `stdout` using line-delimited JSON objects.

### Input (`stdin`)

The agent receives commands on `stdin`. Each command must be a single-line JSON object followed by a newline character (`\n`).

#### **Register Hotkey**

Tells the agent to start listening for a new hotkey combination. The shortcut string is parsed with numerous common aliases (e.g., `Control`, `ctrl`, `shift`).

```json
{
  "command": "register",
  "id": "my-unique-action-id",
  "shortcut": "Control+Alt+Q"
}
```

#### **Unregister Hotkey**

Tells the agent to stop listening for a hotkey combination.

```json
{
  "command": "unregister",
  "id": "my-unique-action-id",
  "shortcut": "Control+Alt+Q"
}
```

### Output (`stdout`)

The agent emits events on `stdout`. Each event is a single-line JSON object followed by a newline character.

#### **Hotkey Pressed Event**

Emitted when a registered hotkey combination is detected.

```json
{
  "event": "hotkey_pressed",
  "id": "my-unique-action-id"
}
```

#### **Raw Key Event**

Emitted for every single key press or release on the system.

```json
{
  "event_type": "KeyPress",
  "key": "KeyQ"
}
```

#### **Error Event**

Emitted if the agent fails to parse an incoming command.

```json
{
  "event": "error",
  "message": "Failed to parse command: ...",
  "context": "command_parse"
}
```

---

## Building & Testing

This is a standard Rust project.

### Building

To build the optimized release binary, run:
```bash
cargo build --release
```
The final binary will be located at `target/release/system-agent`.

### Isolated Testing

To test the agent in complete isolation from the main Electron application, use the provided Node.js test script. This script verifies the full register/unregister API contract.

1.  Build the agent first (`cargo build --release`).
2.  Run the test script from the project root:
    ```bash
    node packages/system-agent/test-agent.mjs
    ```
The script will spawn the agent, guide you through testing the hotkey, and print all `stdout` and `stderr` traffic from the agent. This allows you to verify its behavior independently. 