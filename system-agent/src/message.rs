use serde::{Deserialize, Serialize};

/// Messages FROM the System Agent TO the Electron Main Process (stdout)
#[derive(Serialize, Debug)]
#[serde(tag = "event", rename_all = "snake_case")]
pub enum AgentEvent {
    /// Global hotkey was triggered
    Hotkey { 
        id: String,
        shortcut: String,
    },
    /// Clipboard content changed
    Clipboard { 
        text: String,
        timestamp: u64,
    },
    /// System agent is ready and listening
    Ready,
    /// An error occurred in the agent
    Error { 
        message: String,
        code: Option<String>,
    },
}

/// Commands TO the System Agent FROM the Electron Main Process (stdin)
#[derive(Deserialize, Debug)]
#[serde(tag = "command", rename_all = "snake_case")]
pub enum AgentCommand {
    /// Register a new global hotkey
    RegisterHotkey {
        id: String,
        shortcut: String,
    },
    /// Unregister a global hotkey
    UnregisterHotkey {
        id: String,
    },
    /// Set clipboard content
    SetClipboard {
        text: String,
    },
    /// Enable/disable clipboard monitoring
    SetClipboardMonitoring {
        enabled: bool,
    },
    /// Gracefully shutdown the agent
    Quit,
}

/// Response from agent to commands (when applicable)
#[derive(Serialize, Debug)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum AgentResponse {
    Success {
        command: String,
        message: Option<String>,
    },
    Error {
        command: String,
        error: String,
        code: Option<String>,
    },
} 