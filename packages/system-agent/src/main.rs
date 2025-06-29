mod agent;
mod cmd;
mod hotkey;

use agent::SystemAgent;

fn main() {
    let agent = SystemAgent::new();
    agent.run();
}
