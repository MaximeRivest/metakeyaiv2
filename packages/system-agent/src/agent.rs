use crate::cmd::{Command, RegisterCommand};
use crate::hotkey::{parse_shortcut, HotkeyDef};
use rdev::{listen, EventType, Key};
use serde::Serialize;
use serde_json::Deserializer;
use std::collections::HashSet;
use std::io::{self, stdout, Write};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, RwLock};
use std::thread;

type HotkeyState = Arc<RwLock<Vec<HotkeyDef>>>;
type PressedKeysState = Arc<RwLock<HashSet<Key>>>;
type ActiveHotkeysState = Arc<RwLock<HashSet<String>>>;

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
    registered_hotkeys: HotkeyState,
    pressed_keys: PressedKeysState,
    running: Arc<AtomicBool>,
    active_hotkeys: ActiveHotkeysState,
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
            registered_hotkeys: Arc::new(RwLock::new(Vec::new())),
            pressed_keys: Arc::new(RwLock::new(HashSet::new())),
            running,
            active_hotkeys: Arc::new(RwLock::new(HashSet::new())),
        }
    }

    pub fn run(&self) {
        eprintln!("[system-agent] Starting...");
        
        let hotkeys_clone = self.registered_hotkeys.clone();
        let running_clone = self.running.clone();
        let stdin_thread = thread::spawn(move || {
            command_listener(hotkeys_clone, running_clone);
        });

        let hotkeys_clone_2 = self.registered_hotkeys.clone();
        let pressed_keys_clone = self.pressed_keys.clone();
        let running_clone_2 = self.running.clone();
        let active_hotkeys_clone = self.active_hotkeys.clone();
        event_listener(hotkeys_clone_2, pressed_keys_clone, running_clone_2, active_hotkeys_clone);

        eprintln!("[system-agent] Event listener exited. Waiting for stdin thread to finish...");
        stdin_thread.join().expect("Stdin thread panicked");
        eprintln!("[system-agent] Shutdown complete.");
    }
}

fn command_listener(hotkeys: HotkeyState, running: Arc<AtomicBool>) {
    let stdin = io::stdin();
    let stream = Deserializer::from_reader(stdin.lock()).into_iter::<Command>();

    for cmd_result in stream {
        if !running.load(Ordering::SeqCst) {
            break;
        }
        match cmd_result {
            Ok(cmd) => handle_command(cmd, &hotkeys),
            Err(e) => {
                let msg = format!("Failed to parse command: {}", e);
                eprintln!("[system-agent] {}", msg);
                send_event(&ErrorEvent { event: "error", message: msg, context: "command_parse" });
            }
        }
    }
    eprintln!("[system-agent] Stdin listener loop finished.");
}

fn handle_command(cmd: Command, hotkeys: &HotkeyState) {
    match cmd {
        Command::Register(RegisterCommand { id, shortcut }) => {
            if let Some(def) = parse_shortcut(&id, &shortcut) {
                eprintln!("[system-agent] Registering: {:?}", def);
                let mut hotkeys_lock = hotkeys.write().unwrap();
                if !hotkeys_lock.contains(&def) {
                    hotkeys_lock.push(def);
                }
            }
        }
        Command::Unregister(RegisterCommand { id, shortcut }) => {
            if let Some(def) = parse_shortcut(&id, &shortcut) {
                eprintln!("[system-agent] Unregistering: {:?}", def);
                let mut hotkeys_lock = hotkeys.write().unwrap();
                hotkeys_lock.retain(|h| h != &def);
            }
        }
    }
}

fn event_listener(
    hotkeys: HotkeyState,
    pressed: PressedKeysState,
    running: Arc<AtomicBool>,
    active_hotkeys: ActiveHotkeysState,
) {
    if let Err(error) = listen(move |event| {
        if !running.load(Ordering::SeqCst) {
            // This will break the listen closure and cause listen() to return.
            return;
        }
        let mut pressed_lock = pressed.write().unwrap();
        match event.event_type {
            EventType::KeyPress(key) => {
                pressed_lock.insert(key);
                let hotkeys_lock = hotkeys.read().unwrap();
                let mut active_lock = active_hotkeys.write().unwrap();

                for def in hotkeys_lock.iter() {
                    // Check if all keys for the hotkey are pressed and it's not already active.
                    if def.keys.is_subset(&pressed_lock) && !active_lock.contains(&def.id) {
                        eprintln!("[system-agent] Hotkey match found: {:?}", def);
                        send_event(&OutputEvent { event: "hotkey_pressed", id: &def.id });
                        // Mark the hotkey as active to prevent re-firing.
                        active_lock.insert(def.id.clone());
                    }
                }
                send_raw_event("KeyPress", key);
            }
            EventType::KeyRelease(key) => {
                pressed_lock.remove(&key);
                let hotkeys_lock = hotkeys.read().unwrap();
                let mut active_lock = active_hotkeys.write().unwrap();

                // Check if the released key was part of any registered hotkey.
                // If so, deactivate that hotkey so it can be fired again.
                for def in hotkeys_lock.iter() {
                    if def.keys.contains(&key) && active_lock.contains(&def.id) {
                        active_lock.remove(&def.id);
                    }
                }

                send_raw_event("KeyRelease", key);
            }
            _ => (),
        }
    }) {
        eprintln!("[system-agent] Error: {:?}", error);
    }
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