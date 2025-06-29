use lazy_static::lazy_static;
use phf::phf_map;
use rdev::Key;
use std::collections::HashSet;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HotkeyDef {
    pub id: String,
    pub keys: HashSet<Key>,
}

lazy_static! {
    static ref KEY_MAP: phf::Map<&'static str, Key> = phf_map! {
        "alt" => Key::Alt,
        "altgr" => Key::AltGr,
        "backspace" => Key::Backspace,
        "capslock" => Key::CapsLock,
        "controlleft" => Key::ControlLeft,
        "ctrl" => Key::ControlLeft,
        "control" => Key::ControlLeft,
        "controlright" => Key::ControlRight,
        "delete" => Key::Delete,
        "downarrow" => Key::DownArrow,
        "end" => Key::End,
        "escape" => Key::Escape,
        "f1" => Key::F1,
        "f10" => Key::F10,
        "f11" => Key::F11,
        "f12" => Key::F12,
        "f2" => Key::F2,
        "f3" => Key::F3,
        "f4" => Key::F4,
        "f5" => Key::F5,
        "f6" => Key::F6,
        "f7" => Key::F7,
        "f8" => Key::F8,
        "f9" => Key::F9,
        "home" => Key::Home,
        "leftarrow" => Key::LeftArrow,
        "metaleft" => Key::MetaLeft,
        "command" => Key::MetaLeft,
        "win" => Key::MetaLeft,
        "metaright" => Key::MetaRight,
        "pagedown" => Key::PageDown,
        "pageup" => Key::PageUp,
        "return" => Key::Return,
        "enter" => Key::Return,
        "rightarrow" => Key::RightArrow,
        "shiftleft" => Key::ShiftLeft,
        "shift" => Key::ShiftLeft,
        "shiftright" => Key::ShiftRight,
        "space" => Key::Space,
        "tab" => Key::Tab,
        "uparrow" => Key::UpArrow,
        "printscreen" => Key::PrintScreen,
        "scrolllock" => Key::ScrollLock,
        "pause" => Key::Pause,
        "numlock" => Key::NumLock,
        "backquote" => Key::BackQuote,
        "num1" => Key::Num1,
        "num2" => Key::Num2,
        "num3" => Key::Num3,
        "num4" => Key::Num4,
        "num5" => Key::Num5,
        "num6" => Key::Num6,
        "num7" => Key::Num7,
        "num8" => Key::Num8,
        "num9" => Key::Num9,
        "num0" => Key::Num0,
        "minus" => Key::Minus,
        "equal" => Key::Equal,
        "keya" => Key::KeyA,
        "keyb" => Key::KeyB,
        "keyc" => Key::KeyC,
        "keyd" => Key::KeyD,
        "keye" => Key::KeyE,
        "keyf" => Key::KeyF,
        "keyg" => Key::KeyG,
        "keyh" => Key::KeyH,
        "keyi" => Key::KeyI,
        "keyj" => Key::KeyJ,
        "keyk" => Key::KeyK,
        "keyl" => Key::KeyL,
        "keym" => Key::KeyM,
        "keyn" => Key::KeyN,
        "keyo" => Key::KeyO,
        "keyp" => Key::KeyP,
        "keyq" => Key::KeyQ,
        "keyr" => Key::KeyR,
        "keys" => Key::KeyS,
        "keyt" => Key::KeyT,
        "keyu" => Key::KeyU,
        "keyv" => Key::KeyV,
        "keyw" => Key::KeyW,
        "keyx" => Key::KeyX,
        "keyy" => Key::KeyY,
        "keyz" => Key::KeyZ,

        // Numpad keys (both variants)
        "kp0" => Key::Kp0,
        "kp1" => Key::Kp1,
        "kp2" => Key::Kp2,
        "kp3" => Key::Kp3,
        "kp4" => Key::Kp4,
        "kp5" => Key::Kp5,
        "kp6" => Key::Kp6,
        "kp7" => Key::Kp7,
        "kp8" => Key::Kp8,
        "kp9" => Key::Kp9,
        "kpreturn" => Key::KpReturn,
        "kpplus" => Key::KpPlus,
        "kpminus" => Key::KpMinus,
        "kpmultiply" => Key::KpMultiply,
        "kpdivide" => Key::KpDivide,
        "kpdelete" => Key::KpDelete,
    };
}

pub fn parse_shortcut(id: &str, shortcut: &str) -> Option<HotkeyDef> {
    let parts: Vec<&str> = shortcut.split('+').collect();
    let keys: HashSet<Key> = parts
        .iter()
        .filter_map(|s| {
            let normalized_key = s.trim().to_lowercase();
            // If it's a single character, assume it's a letter key like 'q', 'a', etc.
            if normalized_key.len() == 1 && normalized_key.chars().next().unwrap().is_alphabetic() {
                KEY_MAP.get(format!("key{}", normalized_key).as_str()).cloned()
            } else {
                KEY_MAP.get(normalized_key.as_str()).cloned()
            }
        })
        .collect();

    if keys.len() != parts.len() {
        eprintln!(
            "[system-agent] Warning: Could not parse all keys in shortcut '{}'. Parsed: {:?}, Original: {:?}",
            shortcut, keys, parts
        );
        return None;
    }

    Some(HotkeyDef {
        id: id.to_string(),
        keys,
    })
} 