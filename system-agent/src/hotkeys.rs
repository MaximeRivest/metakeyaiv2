use crate::message::AgentEvent;
use anyhow::{anyhow, Result};
use crossbeam_channel::Sender;
use rdev::{listen, EventType, Key};
use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
    thread,
};

#[derive(Debug, Clone)]
pub struct HotkeyBinding {
    pub id: String,
    pub shortcut: String,
    pub keys: Vec<Key>,
    pub modifiers: Vec<Key>,
}

pub struct HotkeyManager {
    bindings: Arc<Mutex<HashMap<String, HotkeyBinding>>>,
    event_sender: Sender<AgentEvent>,
    _listener_handle: thread::JoinHandle<()>,
}

impl HotkeyManager {
    pub fn new(event_sender: Sender<AgentEvent>) -> Result<Self> {
        let bindings = Arc::new(Mutex::new(HashMap::new()));
        let bindings_clone = Arc::clone(&bindings);
        let sender_clone = event_sender.clone();

        let listener_handle = thread::spawn(move || {
            if let Err(e) = Self::listen_for_keys(bindings_clone, sender_clone) {
                eprintln!("Hotkey listener error: {}", e);
            }
        });

        Ok(HotkeyManager {
            bindings,
            event_sender,
            _listener_handle: listener_handle,
        })
    }

    pub fn register_hotkey(&self, id: String, shortcut: String) -> Result<()> {
        let binding = Self::parse_shortcut(&id, &shortcut)?;
        
        let mut bindings = self.bindings.lock().unwrap();
        bindings.insert(id.clone(), binding);
        
        // Send confirmation
        let _ = self.event_sender.send(AgentEvent::Ready);
        
        Ok(())
    }

    pub fn unregister_hotkey(&self, id: &str) -> Result<()> {
        let mut bindings = self.bindings.lock().unwrap();
        bindings.remove(id);
        Ok(())
    }

    fn parse_shortcut(id: &str, shortcut: &str) -> Result<HotkeyBinding> {
        let shortcut_lower = shortcut.to_lowercase();
        let parts: Vec<&str> = shortcut_lower.split('+').collect();
        let mut modifiers = Vec::new();
        let mut keys = Vec::new();

        for part in parts {
            let part = part.trim();
            match part {
                "ctrl" | "control" => modifiers.push(Key::ControlLeft),
                "alt" => modifiers.push(Key::Alt),
                "shift" => modifiers.push(Key::ShiftLeft),
                "cmd" | "meta" | "super" => modifiers.push(Key::MetaLeft),
                // Single character keys
                "a" => keys.push(Key::KeyA),
                "b" => keys.push(Key::KeyB),
                "c" => keys.push(Key::KeyC),
                "d" => keys.push(Key::KeyD),
                "e" => keys.push(Key::KeyE),
                "f" => keys.push(Key::KeyF),
                "g" => keys.push(Key::KeyG),
                "h" => keys.push(Key::KeyH),
                "i" => keys.push(Key::KeyI),
                "j" => keys.push(Key::KeyJ),
                "k" => keys.push(Key::KeyK),
                "l" => keys.push(Key::KeyL),
                "m" => keys.push(Key::KeyM),
                "n" => keys.push(Key::KeyN),
                "o" => keys.push(Key::KeyO),
                "p" => keys.push(Key::KeyP),
                "q" => keys.push(Key::KeyQ),
                "r" => keys.push(Key::KeyR),
                "s" => keys.push(Key::KeyS),
                "t" => keys.push(Key::KeyT),
                "u" => keys.push(Key::KeyU),
                "v" => keys.push(Key::KeyV),
                "w" => keys.push(Key::KeyW),
                "x" => keys.push(Key::KeyX),
                "y" => keys.push(Key::KeyY),
                "z" => keys.push(Key::KeyZ),
                // Arrow keys
                "left" => keys.push(Key::LeftArrow),
                "right" => keys.push(Key::RightArrow),
                "up" => keys.push(Key::UpArrow),
                "down" => keys.push(Key::DownArrow),
                // Function keys
                "f1" => keys.push(Key::F1),
                "f2" => keys.push(Key::F2),
                "f3" => keys.push(Key::F3),
                "f4" => keys.push(Key::F4),
                "f5" => keys.push(Key::F5),
                "f6" => keys.push(Key::F6),
                "f7" => keys.push(Key::F7),
                "f8" => keys.push(Key::F8),
                "f9" => keys.push(Key::F9),
                "f10" => keys.push(Key::F10),
                "f11" => keys.push(Key::F11),
                "f12" => keys.push(Key::F12),
                // Special keys
                "space" => keys.push(Key::Space),
                "enter" => keys.push(Key::Return),
                "escape" | "esc" => keys.push(Key::Escape),
                "tab" => keys.push(Key::Tab),
                "backspace" => keys.push(Key::Backspace),
                _ => return Err(anyhow!("Unsupported key: {}", part)),
            }
        }

        if keys.is_empty() {
            return Err(anyhow!("No action key specified in shortcut: {}", shortcut));
        }

        Ok(HotkeyBinding {
            id: id.to_string(),
            shortcut: shortcut.to_string(),
            keys,
            modifiers,
        })
    }

    fn listen_for_keys(
        bindings: Arc<Mutex<HashMap<String, HotkeyBinding>>>,
        event_sender: Sender<AgentEvent>,
    ) -> Result<()> {
        let mut pressed_keys = std::collections::HashSet::new();

        listen(move |event| {
            match event.event_type {
                EventType::KeyPress(key) => {
                    pressed_keys.insert(key);
                    Self::check_hotkey_match(&bindings, &pressed_keys, &event_sender);
                }
                EventType::KeyRelease(key) => {
                    pressed_keys.remove(&key);
                }
                _ => {}
            }
        })
        .map_err(|e| anyhow!("Failed to start key listener: {:?}", e))
    }

    fn check_hotkey_match(
        bindings: &Arc<Mutex<HashMap<String, HotkeyBinding>>>,
        pressed_keys: &std::collections::HashSet<Key>,
        event_sender: &Sender<AgentEvent>,
    ) {
        let bindings = bindings.lock().unwrap();
        
        for binding in bindings.values() {
            // Check if all required modifiers are pressed
            let modifiers_match = binding.modifiers.iter().all(|m| pressed_keys.contains(m));
            
            // Check if all required keys are pressed
            let keys_match = binding.keys.iter().all(|k| pressed_keys.contains(k));
            
            // Ensure no extra modifiers are pressed (for exact match)
            let modifier_keys: std::collections::HashSet<Key> = [
                Key::ControlLeft, Key::ControlRight,
                Key::Alt,
                Key::ShiftLeft, Key::ShiftRight,
                Key::MetaLeft, Key::MetaRight,
            ].iter().cloned().collect();
            
            let pressed_modifiers: Vec<&Key> = pressed_keys.iter()
                .filter(|k| modifier_keys.contains(k))
                .collect();
            
            let exact_modifier_match = pressed_modifiers.len() == binding.modifiers.len();
            
            if modifiers_match && keys_match && exact_modifier_match {
                let event = AgentEvent::Hotkey {
                    id: binding.id.clone(),
                    shortcut: binding.shortcut.clone(),
                };
                
                let _ = event_sender.send(event);
            }
        }
    }
} 