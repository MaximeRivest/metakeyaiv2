use crate::message::AgentEvent;
use anyhow::Result;
use arboard::Clipboard;
use crossbeam_channel::Sender;
use std::{
    sync::{atomic::AtomicBool, Arc},
    thread,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

const CLIPBOARD_POLL_INTERVAL_MS: u64 = 250;

pub struct ClipboardMonitor {
    enabled: Arc<AtomicBool>,
    thread_handle: Option<thread::JoinHandle<()>>,
}

impl ClipboardMonitor {
    pub fn new(event_sender: Sender<AgentEvent>) -> Result<Self> {
        let enabled = Arc::new(AtomicBool::new(true));
        let enabled_clone = Arc::clone(&enabled);

        let handle = thread::spawn(move || {
            if let Err(e) = Self::monitor_loop(event_sender, enabled_clone) {
                eprintln!("Clipboard monitor error: {}", e);
            }
        });

        Ok(ClipboardMonitor {
            enabled,
            thread_handle: Some(handle),
        })
    }

    pub fn set_enabled(&self, enabled: bool) {
        self.enabled.store(enabled, std::sync::atomic::Ordering::Relaxed);
    }

    fn monitor_loop(
        event_sender: Sender<AgentEvent>,
        enabled: Arc<AtomicBool>,
    ) -> Result<()> {
        let mut clipboard = Clipboard::new()?;
        let mut last_content = String::new();

        loop {
            if !enabled.load(std::sync::atomic::Ordering::Relaxed) {
                thread::sleep(Duration::from_millis(CLIPBOARD_POLL_INTERVAL_MS));
                continue;
            }

            match clipboard.get_text() {
                Ok(current_content) => {
                    if current_content != last_content && !current_content.is_empty() {
                        let timestamp = SystemTime::now()
                            .duration_since(UNIX_EPOCH)
                            .unwrap_or_default()
                            .as_secs();

                        let event = AgentEvent::Clipboard {
                            text: current_content.clone(),
                            timestamp,
                        };

                        if event_sender.send(event).is_err() {
                            break; // Main thread has shut down
                        }

                        last_content = current_content;
                    }
                }
                Err(_) => {
                    // Clipboard might be locked or inaccessible, just continue
                    thread::sleep(Duration::from_millis(CLIPBOARD_POLL_INTERVAL_MS * 2));
                    continue;
                }
            }

            thread::sleep(Duration::from_millis(CLIPBOARD_POLL_INTERVAL_MS));
        }

        Ok(())
    }

    pub fn set_clipboard_text(&self, text: &str) -> Result<()> {
        let mut clipboard = Clipboard::new()?;
        clipboard.set_text(text)?;
        Ok(())
    }
}

impl Drop for ClipboardMonitor {
    fn drop(&mut self) {
        self.enabled.store(false, std::sync::atomic::Ordering::Relaxed);
        
        if let Some(handle) = self.thread_handle.take() {
            let _ = handle.join();
        }
    }
} 