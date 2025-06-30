use crate::cmd::{Command, RegisterCommand};
use crossbeam_channel::{unbounded, Receiver, Sender};
use global_hotkey::{
    hotkey::HotKey,
    GlobalHotKeyEvent, GlobalHotKeyManager, HotKeyState,
};
use rdev::{listen, EventType, Key};
use serde::Serialize;
use serde_json::Deserializer;
use std::collections::HashMap;
use std::io::{self, stdout, Write};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;

#[derive(Debug)]
enum HotkeyManagerCommand {
    Register { id: String, shortcut: String },
    Unregister { id: String, shortcut: String },
    RegisterBatch { hotkeys: Vec<(String, String)> },
    UnregisterAll,
}

#[derive(Serialize, Debug)]
struct OutputEvent<'a> {
    event: &'a str,
    id: &'a str,
}

#[derive(Serialize, Debug)]
struct RawKeyEvent<'a> {
    event_type: &'a str,
    key: String,
}

#[derive(Serialize, Debug)]
struct ErrorEvent<'a> {
    event: &'a str,
    message: String,
    context: &'a str,
}

pub struct SystemAgent {
    running: Arc<AtomicBool>,
}

impl SystemAgent {
    pub fn new() -> Self {
        let running = Arc::new(AtomicBool::new(true));
        let r = running.clone();
        ctrlc::set_handler(move || {
            r.store(false, Ordering::SeqCst);
        })
        .expect("Error setting Ctrl-C handler");

        Self {
            running,
        }
    }

    pub fn run(&self) {
        eprintln!("[system-agent] Starting hybrid hotkey system (registration + streaming)...");
        
        // Create channel for communication between command listener and hotkey manager
        let (cmd_sender, cmd_receiver) = unbounded::<HotkeyManagerCommand>();
        
        // Thread 1: Hotkey Registration and Command Handling
        let running_clone1 = self.running.clone();
        let hotkey_thread = thread::spawn(move || {
            hotkey_registration_thread(cmd_receiver, running_clone1);
        });

        // Thread 2: Raw Key Event Streaming
        let running_clone2 = self.running.clone();
        let rdev_thread = thread::spawn(move || {
            raw_key_streaming_thread(running_clone2);
        });

        // Thread 3: Command Listener (reads from stdin)
        let running_clone3 = self.running.clone();
        let stdin_thread = thread::spawn(move || {
            command_listener(cmd_sender, running_clone3);
        });

        eprintln!("[system-agent] All threads started. Waiting for completion...");
        
        // Wait for all threads to complete
        stdin_thread.join().expect("Stdin thread panicked");
        hotkey_thread.join().expect("Hotkey thread panicked");
        rdev_thread.join().expect("Rdev thread panicked");
        
        eprintln!("[system-agent] Shutdown complete.");
    }
}

fn hotkey_registration_thread(
    command_receiver: Receiver<HotkeyManagerCommand>,
    running: Arc<AtomicBool>,
) {
    eprintln!("[system-agent] Hotkey registration thread starting...");
    
    // Initialize the global hotkey manager
    let manager = match GlobalHotKeyManager::new() {
        Ok(m) => m,
        Err(e) => {
            let msg = format!("Failed to initialize global hotkey manager: {}", e);
            eprintln!("[system-agent] {}", msg);
            send_event(&ErrorEvent { 
                event: "error", 
                message: msg, 
                context: "hotkey_manager_init" 
            });
            return;
        }
    };
    
    // Keep track of registered hotkeys for cleanup and ID mapping
    let mut registered_hotkeys: HashMap<String, HotKey> = HashMap::new();
    let mut id_mapping: HashMap<u32, String> = HashMap::new(); // Map global-hotkey numeric IDs to our string IDs
    
    // Create shared data for the event thread using Arc + Mutex
    let id_mapping_shared = Arc::new(std::sync::Mutex::new(HashMap::<u32, String>::new()));
    let id_mapping_clone = id_mapping_shared.clone();
    
    // Start hotkey event listener in a separate thread
    let running_clone = running.clone();
    let event_thread = thread::spawn(move || {
        eprintln!("[system-agent] Hotkey event listener starting...");
        
        while running_clone.load(Ordering::SeqCst) {
            if let Ok(event) = GlobalHotKeyEvent::receiver().try_recv() {
                eprintln!("[system-agent] Global hotkey triggered: {:?}", event);
                
                // Only process "Pressed" state to avoid duplicate events
                if event.state == HotKeyState::Pressed {
                    // Look up the original string ID from our mapping
                    let id = {
                        let mapping = id_mapping_clone.lock().unwrap();
                        mapping.get(&event.id).cloned()
                    };
                    
                    if let Some(original_id) = id {
                        eprintln!("[system-agent] Sending hotkey_pressed event for: {}", original_id);
                        send_event(&OutputEvent { 
                            event: "hotkey_pressed", 
                            id: &original_id 
                        });
                    } else {
                        eprintln!("[system-agent] Warning: Received hotkey event for unknown ID: {}", event.id);
                    }
                }
            }
            
            // Small delay to prevent busy waiting
            thread::sleep(std::time::Duration::from_millis(10));
        }
        
        eprintln!("[system-agent] Hotkey event listener exited.");
    });
    
    // Process commands from the command listener thread
    while running.load(Ordering::SeqCst) {
        if let Ok(command) = command_receiver.recv_timeout(std::time::Duration::from_micros(100)) {
            match command {
                HotkeyManagerCommand::Register { id, shortcut } => {
                    match parse_hotkey(&shortcut) {
                        Ok(hotkey) => {
                            // Get the hotkey ID before registering
                            let hotkey_id = hotkey.id();
                            
                            match manager.register(hotkey) {
                                Ok(()) => {
                                    eprintln!("[system-agent] Successfully registered global hotkey: {} -> {} (ID: {})", id, shortcut, hotkey_id);
                                    registered_hotkeys.insert(id.clone(), hotkey);
                                    
                                    // Store the ID mapping for event lookup
                                    {
                                        let mut mapping = id_mapping_shared.lock().unwrap();
                                        mapping.insert(hotkey_id, id.clone());
                                    }
                                    id_mapping.insert(hotkey_id, id.clone());
                                }
                                Err(e) => {
                                    let msg = format!("Failed to register global hotkey {}: {}", shortcut, e);
                                    eprintln!("[system-agent] {}", msg);
                                    send_event(&ErrorEvent { 
                                        event: "error", 
                                        message: msg, 
                                        context: "hotkey_register" 
                                    });
                                }
                            }
                        }
                        Err(e) => {
                            let msg = format!("Failed to parse hotkey {}: {}", shortcut, e);
                            eprintln!("[system-agent] {}", msg);
                            send_event(&ErrorEvent { 
                                event: "error", 
                                message: msg, 
                                context: "hotkey_parse" 
                            });
                        }
                    }
                }
                HotkeyManagerCommand::Unregister { id, shortcut: _shortcut } => {
                    if let Some(hotkey) = registered_hotkeys.remove(&id) {
                        let hotkey_id = hotkey.id();
                        
                        match manager.unregister(hotkey) {
                            Ok(()) => {
                                eprintln!("[system-agent] Successfully unregistered global hotkey: {} (ID: {})", id, hotkey_id);
                                
                                // Remove from ID mapping
                                {
                                    let mut mapping = id_mapping_shared.lock().unwrap();
                                    mapping.remove(&hotkey_id);
                                }
                                id_mapping.remove(&hotkey_id);
                            }
                            Err(e) => {
                                let msg = format!("Failed to unregister global hotkey {}: {}", id, e);
                                eprintln!("[system-agent] {}", msg);
                                send_event(&ErrorEvent { 
                                    event: "error", 
                                    message: msg, 
                                    context: "hotkey_unregister" 
                                });
                            }
                        }
                    } else {
                        eprintln!("[system-agent] Warning: Attempted to unregister unknown hotkey: {}", id);
                    }
                }
                HotkeyManagerCommand::RegisterBatch { hotkeys } => {
                    eprintln!("[system-agent] Processing register_batch with {} hotkeys", hotkeys.len());
                    
                    for (id, shortcut) in hotkeys {
                        match parse_hotkey(&shortcut) {
                            Ok(hotkey) => {
                                // Get the hotkey ID before registering
                                let hotkey_id = hotkey.id();
                                
                                match manager.register(hotkey) {
                                    Ok(()) => {
                                        eprintln!("[system-agent] Successfully registered global hotkey: {} -> {} (ID: {})", id, shortcut, hotkey_id);
                                        registered_hotkeys.insert(id.clone(), hotkey);
                                        
                                        // Store the ID mapping for event lookup
                                        {
                                            let mut mapping = id_mapping_shared.lock().unwrap();
                                            mapping.insert(hotkey_id, id.clone());
                                        }
                                        id_mapping.insert(hotkey_id, id.clone());
                                    }
                                    Err(e) => {
                                        let msg = format!("Failed to register global hotkey {}: {}", shortcut, e);
                                        eprintln!("[system-agent] {}", msg);
                                        send_event(&ErrorEvent { 
                                            event: "error", 
                                            message: msg, 
                                            context: "hotkey_register_batch" 
                                        });
                                    }
                                }
                            }
                            Err(e) => {
                                let msg = format!("Failed to parse hotkey {}: {}", shortcut, e);
                                eprintln!("[system-agent] {}", msg);
                                send_event(&ErrorEvent { 
                                    event: "error", 
                                    message: msg, 
                                    context: "hotkey_parse_batch" 
                                });
                            }
                        }
                    }
                }
                HotkeyManagerCommand::UnregisterAll => {
                    eprintln!("[system-agent] Processing unregister_all command");
                    
                    // Unregister all hotkeys from the manager
                    for (id, hotkey) in registered_hotkeys.drain() {
                        let hotkey_id = hotkey.id();
                        
                        match manager.unregister(hotkey) {
                            Ok(()) => {
                                eprintln!("[system-agent] Successfully unregistered global hotkey: {} (ID: {})", id, hotkey_id);
                            }
                            Err(e) => {
                                let msg = format!("Failed to unregister global hotkey {}: {}", id, e);
                                eprintln!("[system-agent] {}", msg);
                                send_event(&ErrorEvent { 
                                    event: "error", 
                                    message: msg, 
                                    context: "hotkey_unregister_all" 
                                });
                            }
                        }
                    }
                    
                    // Clear ID mappings
                    {
                        let mut mapping = id_mapping_shared.lock().unwrap();
                        mapping.clear();
                    }
                    id_mapping.clear();
                }
            }
        }
        // Note: recv_timeout already provides the necessary delay, no need for additional sleep
    }
    
    // Cleanup: unregister all hotkeys
    eprintln!("[system-agent] Cleaning up registered hotkeys...");
    for (id, hotkey) in registered_hotkeys {
        let hotkey_id = hotkey.id();
        if let Err(e) = manager.unregister(hotkey) {
            eprintln!("[system-agent] Failed to unregister hotkey {} (ID: {}) during cleanup: {}", id, hotkey_id, e);
        } else {
            eprintln!("[system-agent] Cleaned up hotkey: {} (ID: {})", id, hotkey_id);
        }
    }
    
    event_thread.join().expect("Event thread panicked");
    eprintln!("[system-agent] Hotkey registration thread exited.");
}

fn raw_key_streaming_thread(running: Arc<AtomicBool>) {
    eprintln!("[system-agent] Raw key streaming thread starting...");
    
    // This thread's only job is to stream raw key events
    // All the complex hotkey detection logic has been removed
    if let Err(error) = listen(move |event| {
        if !running.load(Ordering::SeqCst) {
            // This will break the listen closure and cause listen() to return.
            return;
        }
        
        // Simply stream all key events - no hotkey detection needed
        match event.event_type {
            EventType::KeyPress(key) => {
                send_raw_event("KeyPress", key);
            }
            EventType::KeyRelease(key) => {
                send_raw_event("KeyRelease", key);
            }
            _ => (), // Ignore other event types
        }
    }) {
        eprintln!("[system-agent] Raw key streaming error: {:?}", error);
    }
    
    eprintln!("[system-agent] Raw key streaming thread exited.");
}

fn command_listener(
    hotkey_sender: Sender<HotkeyManagerCommand>, 
    running: Arc<AtomicBool>
) {
    eprintln!("[system-agent] Command listener starting...");
    
    let stdin = io::stdin();
    let stream = Deserializer::from_reader(stdin.lock()).into_iter::<Command>();

    for cmd_result in stream {
        if !running.load(Ordering::SeqCst) {
            break;
        }
        
        match cmd_result {
            Ok(cmd) => handle_command(cmd, &hotkey_sender),
            Err(e) => {
                let msg = format!("Failed to parse command: {}", e);
                eprintln!("[system-agent] {}", msg);
                send_event(&ErrorEvent { 
                    event: "error", 
                    message: msg, 
                    context: "command_parse" 
                });
            }
        }
    }
    
    eprintln!("[system-agent] Command listener exited.");
}

fn handle_command(cmd: Command, hotkey_sender: &Sender<HotkeyManagerCommand>) {
    match cmd {
        Command::Register(RegisterCommand { id, shortcut }) => {
            eprintln!("[system-agent] Received register command: {} -> {}", id, shortcut);
            
            if let Err(e) = hotkey_sender.send(HotkeyManagerCommand::Register { 
                id: id.clone(), 
                shortcut: shortcut.clone() 
            }) {
                let msg = format!("Failed to send register command to hotkey manager: {}", e);
                eprintln!("[system-agent] {}", msg);
                send_event(&ErrorEvent { 
                    event: "error", 
                    message: msg, 
                    context: "command_send" 
                });
            }
        }
        Command::Unregister(RegisterCommand { id, shortcut }) => {
            eprintln!("[system-agent] Received unregister command: {} -> {}", id, shortcut);
            
            if let Err(e) = hotkey_sender.send(HotkeyManagerCommand::Unregister { 
                id: id.clone(), 
                shortcut: shortcut.clone() 
            }) {
                let msg = format!("Failed to send unregister command to hotkey manager: {}", e);
                eprintln!("[system-agent] {}", msg);
                send_event(&ErrorEvent { 
                    event: "error", 
                    message: msg, 
                    context: "command_send" 
                });
            }
        }
        Command::RegisterBatch { hotkeys } => {
            eprintln!("[system-agent] Received register_batch command with {} hotkeys", hotkeys.len());
            
            let batch_hotkeys: Vec<(String, String)> = hotkeys.into_iter()
                .map(|cmd| (cmd.id, cmd.shortcut))
                .collect();
            
            if let Err(e) = hotkey_sender.send(HotkeyManagerCommand::RegisterBatch { hotkeys: batch_hotkeys }) {
                let msg = format!("Failed to send register_batch command to hotkey manager: {}", e);
                eprintln!("[system-agent] {}", msg);
                send_event(&ErrorEvent { 
                    event: "error", 
                    message: msg, 
                    context: "command_send" 
                });
            }
        }
        Command::UnregisterAll => {
            eprintln!("[system-agent] Received unregister_all command");
            
            if let Err(e) = hotkey_sender.send(HotkeyManagerCommand::UnregisterAll) {
                let msg = format!("Failed to send unregister_all command to hotkey manager: {}", e);
                eprintln!("[system-agent] {}", msg);
                send_event(&ErrorEvent { 
                    event: "error", 
                    message: msg, 
                    context: "command_send" 
                });
            }
        }
    }
}

fn parse_hotkey(shortcut: &str) -> Result<HotKey, String> {
    // Parse shortcuts like "Control+Alt+T" or "Shift+F1"
    // The global-hotkey crate can parse from string directly
    shortcut.parse::<HotKey>()
        .map_err(|e| format!("Parse error: {}", e))
}

fn send_event<T: Serialize>(event: &T) {
    if let Ok(json) = serde_json::to_string(event) {
        println!("{}", json);
        stdout().flush().unwrap_or_default();
    }
}

fn send_raw_event(event_type: &'static str, key: Key) {
    let key_str = format!("{:?}", key);
    send_event(&RawKeyEvent { event_type, key: key_str });
} 