mod agent;
mod cmd;

use agent::SystemAgent;

fn main() {
    let agent = SystemAgent::new();
    agent.run();
}
