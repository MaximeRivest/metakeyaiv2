import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

// --- Configuration ---
const AGENT_BINARY_NAME = 'system-agent';
const HOTKEY_TO_TEST = 'Control+Alt+Q';
const TEST_DURATION_MS = 10000; // How long to test the hotkey before unregistering
// ---------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const agentPath = path.resolve(__dirname, 'target/release', AGENT_BINARY_NAME);

let agentProcess;

function runTest() {
    console.log('--- System Agent Contract Test ---');
    console.log(`Agent path: ${agentPath}\n`);

    agentProcess = spawn(agentPath, [], { stdio: ['pipe', 'pipe', 'pipe'] });
    console.log('[Test] Agent process spawned.');

    agentProcess.stdout.on('data', (data) => {
        const messages = data.toString().trim().split('\n');
        messages.forEach(message => {
            if (message) console.log(`[AGENT STDOUT]: ${message}`);
        });
    });

    agentProcess.stderr.on('data', (data) => {
        console.error(`[AGENT STDERR]: ${data.toString().trim()}`);
    });

    agentProcess.on('close', (code) => {
        console.log(`\n[Test] Agent process exited with code ${code}.`);
    });

    // --- Step 1: Register Hotkey ---
    console.log(`\n[Test] STEP 1: Registering hotkey '${HOTKEY_TO_TEST}'...`);
    sendCommand({ command: 'register', id: HOTKEY_TO_TEST, shortcut: HOTKEY_TO_TEST });
    
    console.log(`[Test] The hotkey is now ACTIVE for ${TEST_DURATION_MS / 1000} seconds.`);
    console.log(`[Test] ==> Please press '${HOTKEY_TO_TEST}' now to verify it works.`);
    console.log(`[Test] You should see a 'hotkey_pressed' event on STDOUT.`);

    // --- Step 2: Unregister Hotkey ---
    setTimeout(() => {
        console.log(`\n[Test] STEP 2: Unregistering hotkey '${HOTKEY_TO_TEST}'...`);
        sendCommand({ command: 'unregister', id: HOTKEY_TO_TEST, shortcut: HOTKEY_TO_TEST });

        console.log(`[Test] The hotkey is now INACTIVE.`);
        console.log(`[Test] ==> Please press '${HOTKEY_TO_TEST}' again now.`);
        console.log(`[Test] You should NOT see a 'hotkey_pressed' event.`);

    }, TEST_DURATION_MS);

    // --- Step 3: Test Invalid Command ---
    setTimeout(() => {
        console.log(`\n[Test] STEP 3: Sending an invalid command...`);
        const invalidCommand = '{"command":"foo","bar":123}\n';
        console.log(`[Test] Sending: ${invalidCommand.trim()}`);
        agentProcess.stdin.write(invalidCommand);
        console.log("[Test] You should see an 'error' event on STDOUT and a parse error on STDERR.");

    }, TEST_DURATION_MS + 3000);

    // --- Step 4: Shutdown ---
    setTimeout(() => {
        console.log('\n[Test] Test complete. Shutting down agent...');
        agentProcess.kill('SIGINT'); // Send Ctrl-C to test graceful shutdown
    }, TEST_DURATION_MS + 6000);
}

function sendCommand(command) {
    const commandString = JSON.stringify(command) + '\n';
    if (agentProcess && agentProcess.stdin && !agentProcess.stdin.destroyed) {
        agentProcess.stdin.write(commandString);
    }
}

// Graceful exit for the test script itself
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.on('SIGINT', () => {
    if (agentProcess) {
        console.log('\n[Test] Shutting down agent from test script...');
        agentProcess.kill('SIGINT');
    }
    process.exit();
});

runTest(); 