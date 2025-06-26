mod clipboard;
mod hotkeys;
mod message;

use anyhow::{Context, Result};
use clipboard::ClipboardMonitor;
use crossbeam_channel::bounded;
use hotkeys::HotkeyManager;
use message::{AgentCommand, AgentEvent, AgentResponse};
use parking_lot::Mutex;
use std::{
    io::{BufRead, BufReader, Write},
    sync::Arc,
    thread,
};

const EVENT_CHANNEL_SIZE: usize = 1024;

struct SystemAgent {
    clipboard_monitor: Option<ClipboardMonitor>,
    hotkey_manager: Option<HotkeyManager>,
    stdout: Arc<Mutex<std::io::Stdout>>,
}

impl SystemAgent {
    fn new() -> Result<Self> {
        Ok(SystemAgent {
            clipboard_monitor: None,
            hotkey_manager: None,
            stdout: Arc::new(Mutex::new(std::io::stdout())),
        })
    }

    fn start(&mut self) -> Result<()> {
        // Create event channel for all subsystems to send events
        let (event_sender, event_receiver) = bounded::<AgentEvent>(EVENT_CHANNEL_SIZE);

        // Initialize clipboard monitor
        self.clipboard_monitor = Some(
            ClipboardMonitor::new(event_sender.clone())
                .context("Failed to initialize clipboard monitor")?,
        );

        // Initialize hotkey manager
        self.hotkey_manager = Some(
            HotkeyManager::new(event_sender.clone())
                .context("Failed to initialize hotkey manager")?,
        );

        // Send ready signal
        self.send_event(AgentEvent::Ready)?;

        // Start event output thread
        let stdout_clone = Arc::clone(&self.stdout);
        thread::spawn(move || {
            for event in event_receiver.iter() {
                if let Err(e) = Self::write_event_to_stdout(&stdout_clone, event) {
                    eprintln!("Failed to write event to stdout: {}", e);
                }
            }
        });

        // Main stdin command loop
        self.run_command_loop()
    }

    fn run_command_loop(&mut self) -> Result<()> {
        let stdin = std::io::stdin();
        let reader = BufReader::new(stdin);

        for line in reader.lines() {
            let line = line.context("Failed to read from stdin")?;
            
            if line.trim().is_empty() {
                continue;
            }

            match self.handle_command(&line) {
                Ok(Some(response)) => {
                    self.send_response(response)?;
                }
                Ok(None) => {
                    // Command handled successfully, no response needed
                }
                Err(e) => {
                    let error_response = AgentResponse::Error {
                        command: "unknown".to_string(),
                        error: e.to_string(),
                        code: Some("COMMAND_ERROR".to_string()),
                    };
                    self.send_response(error_response)?;
                }
            }
        }

        Ok(())
    }

    fn handle_command(&mut self, command_line: &str) -> Result<Option<AgentResponse>> {
        let command: AgentCommand = serde_json::from_str(command_line)
            .context("Failed to parse command JSON")?;

        match command {
            AgentCommand::RegisterHotkey { id, shortcut } => {
                if let Some(ref hotkey_manager) = self.hotkey_manager {
                    hotkey_manager.register_hotkey(id.clone(), shortcut.clone())
                        .context("Failed to register hotkey")?;
                    
                    Ok(Some(AgentResponse::Success {
                        command: "register_hotkey".to_string(),
                        message: Some(format!("Registered hotkey '{}' for '{}'", shortcut, id)),
                    }))
                } else {
                    Err(anyhow::anyhow!("Hotkey manager not initialized"))
                }
            }

            AgentCommand::UnregisterHotkey { id } => {
                if let Some(ref hotkey_manager) = self.hotkey_manager {
                    hotkey_manager.unregister_hotkey(&id)
                        .context("Failed to unregister hotkey")?;
                    
                    Ok(Some(AgentResponse::Success {
                        command: "unregister_hotkey".to_string(),
                        message: Some(format!("Unregistered hotkey '{}'", id)),
                    }))
                } else {
                    Err(anyhow::anyhow!("Hotkey manager not initialized"))
                }
            }

            AgentCommand::SetClipboard { text } => {
                if let Some(ref clipboard_monitor) = self.clipboard_monitor {
                    clipboard_monitor.set_clipboard_text(&text)
                        .context("Failed to set clipboard")?;
                    
                    Ok(Some(AgentResponse::Success {
                        command: "set_clipboard".to_string(),
                        message: Some("Clipboard updated".to_string()),
                    }))
                } else {
                    Err(anyhow::anyhow!("Clipboard monitor not initialized"))
                }
            }

            AgentCommand::SetClipboardMonitoring { enabled } => {
                if let Some(ref clipboard_monitor) = self.clipboard_monitor {
                    clipboard_monitor.set_enabled(enabled);
                    
                    Ok(Some(AgentResponse::Success {
                        command: "set_clipboard_monitoring".to_string(),
                        message: Some(format!("Clipboard monitoring {}", 
                            if enabled { "enabled" } else { "disabled" })),
                    }))
                } else {
                    Err(anyhow::anyhow!("Clipboard monitor not initialized"))
                }
            }

            AgentCommand::Quit => {
                // Graceful shutdown
                std::process::exit(0);
            }
        }
    }

    fn send_event(&self, event: AgentEvent) -> Result<()> {
        Self::write_event_to_stdout(&self.stdout, event)
    }

    fn send_response(&self, response: AgentResponse) -> Result<()> {
        let json = serde_json::to_string(&response)
            .context("Failed to serialize response")?;
        
        let mut stdout = self.stdout.lock();
        writeln!(stdout, "{}", json)?;
        stdout.flush()?;
        
        Ok(())
    }

    fn write_event_to_stdout(stdout: &Arc<Mutex<std::io::Stdout>>, event: AgentEvent) -> Result<()> {
        let json = serde_json::to_string(&event)
            .context("Failed to serialize event")?;
        
        let mut stdout = stdout.lock();
        writeln!(stdout, "{}", json)?;
        stdout.flush()?;
        
        Ok(())
    }
}

fn main() -> Result<()> {
    // Set up error handling
    std::panic::set_hook(Box::new(|panic_info| {
        let error_event = AgentEvent::Error {
            message: format!("System agent panic: {}", panic_info),
            code: Some("PANIC".to_string()),
        };
        
        if let Ok(json) = serde_json::to_string(&error_event) {
            eprintln!("{}", json);
        }
        
        std::process::exit(1);
    }));

    // Initialize and start the system agent
    let mut agent = SystemAgent::new()
        .context("Failed to create system agent")?;
    
    agent.start()
        .context("System agent failed during execution")
} 