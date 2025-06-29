use rdev::{listen, EventType, Key};
use serde::Serialize;
use std::collections::HashSet;
use std::sync::{Arc, Mutex};

#[derive(Serialize, Debug)]
struct KeyEvent {
    event_type: String,
    key: String,
}

fn main() {
    let pressed_keys = Arc::new(Mutex::new(HashSet::new()));

    let p_clone = pressed_keys.clone();
    if let Err(error) = listen(move |event| {
        let mut keys = p_clone.lock().unwrap();
        let key_event = match event.event_type {
            EventType::KeyPress(key) => {
                keys.insert(key);
                check_hotkeys(&keys);
                Some(KeyEvent {
                    event_type: "KeyPress".to_string(),
                    key: format!("{:?}", key),
                })
            }
            EventType::KeyRelease(key) => {
                keys.remove(&key);
                Some(KeyEvent {
                    event_type: "KeyRelease".to_string(),
                    key: format!("{:?}", key),
                })
            }
            _ => None,
        };

        if let Some(ke) = key_event {
            if let Ok(json) = serde_json::to_string(&ke) {
                println!("{}", json);
            }
        }
    }) {
        eprintln!("[system-agent] Error: {:?}", error);
    }
}

fn check_hotkeys(keys: &HashSet<Key>) {
    if keys.contains(&Key::KeyQ)
        && (keys.contains(&Key::ControlLeft) || keys.contains(&Key::ControlRight))
        && (keys.contains(&Key::Alt) || keys.contains(&Key::AltGr))
    {
        println!("{{\"event\":\"hotkey_pressed\"}}");
    }
}
