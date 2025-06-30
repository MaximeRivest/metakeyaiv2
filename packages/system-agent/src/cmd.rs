use serde::Deserialize;

#[derive(Deserialize, Debug, Clone)]
#[serde(tag = "command")]
pub enum Command {
    #[serde(rename = "register")]
    Register(RegisterCommand),
    #[serde(rename = "unregister")]
    Unregister(RegisterCommand),
    #[serde(rename = "register_batch")]
    RegisterBatch { hotkeys: Vec<RegisterCommand> },
    #[serde(rename = "unregister_all")]
    UnregisterAll,
}

#[derive(Deserialize, Debug, Clone)]
pub struct RegisterCommand {
    pub id: String,
    pub shortcut: String,
} 