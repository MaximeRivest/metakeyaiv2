import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

// --- Configuration ---
const AGENT_BINARY_NAME = 'system-agent';
const HOTKEY_TO_TEST = 'Control+Alt+T';  // This should block Ubuntu terminal
const RAW_KEY_TO_TEST = 'J';             // This should appear in raw stream
const TEST_DURATION_MS = 8000;           // How long to test each phase
// ---------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const agentPath = path.resolve(__dirname, 'target/release', AGENT_BINARY_NAME);

let agentProcess;
let hotkeyEventSeen = false;
let rawKeyEventsSeen = [];

function runTest() {
    console.log('--- System Agent Hybrid Test (Registration + Streaming) ---');
    console.log(`Agent path: ${agentPath}\n`);

    agentProcess = spawn(agentPath, [], { stdio: ['pipe', 'pipe', 'pipe'] });
    console.log('[Test] Agent process spawned.');

    agentProcess.stdout.on('data', (data) => {
        const messages = data.toString().trim().split('\n');
        messages.forEach(message => {
            if (message) {
                console.log(`[AGENT STDOUT]: ${message}`);
                
                // Parse and track events for verification
                try {
                    const event = JSON.parse(message);
                    
                    // Track hotkey events
                    if (event.event === 'hotkey_pressed') {
                        hotkeyEventSeen = true;
                        console.log(`[Test] ✅ HOTKEY EVENT DETECTED: ${event.id}`);
                    }
                    
                    // Track raw key events
                    if (event.event_type === 'KeyPress' || event.event_type === 'KeyRelease') {
                        rawKeyEventsSeen.push(event);
                        if (event.key === 'KeyJ') {
                            console.log(`[Test] ✅ RAW KEY EVENT DETECTED: ${event.event_type} ${event.key}`);
                        }
                    }
                } catch (e) {
                    // Not JSON, ignore
                }
            }
        });
    });

    agentProcess.stderr.on('data', (data) => {
        console.error(`[AGENT STDERR]: ${data.toString().trim()}`);
    });

    agentProcess.on('close', (code) => {
        console.log(`\n[Test] Agent process exited with code ${code}.`);
        printTestSummary();
    });

    // --- Phase 1: Test Raw Key Streaming (before any hotkeys registered) ---
    console.log(`\n[Test] PHASE 1: Testing Raw Key Streaming...`);
    console.log(`[Test] ==> Please press and release the '${RAW_KEY_TO_TEST}' key now.`);
    console.log(`[Test] ==> You should see KeyPress and KeyRelease events for '${RAW_KEY_TO_TEST}'.`);
    console.log(`[Test] ==> This tests that rdev is working and streaming all keys.`);

    // --- Phase 2: Register Hotkey and Test Almighty Hotkey ---
    setTimeout(() => {
        console.log(`\n[Test] PHASE 2: Testing Almighty Hotkeys...`);
        console.log(`[Test] Registering hotkey '${HOTKEY_TO_TEST}'...`);
        sendCommand({ command: 'register', id: 'test-hotkey', shortcut: HOTKEY_TO_TEST });
        
        console.log(`[Test] ==> Now press '${HOTKEY_TO_TEST}' (Ctrl+Alt+T).`);
        console.log(`[Test] ==> You should see a 'hotkey_pressed' event.`);
        console.log(`[Test] ==> CRITICALLY: Ubuntu terminal should NOT open!`);
        console.log(`[Test] ==> The 'T' key should NOT appear in raw key events.`);

    }, 3000);

    // --- Phase 3: Test Raw Key Streaming Still Works ---
    setTimeout(() => {
        console.log(`\n[Test] PHASE 3: Verify Raw Key Streaming Still Works...`);
        console.log(`[Test] ==> Press and release the '${RAW_KEY_TO_TEST}' key again.`);
        console.log(`[Test] ==> You should still see KeyPress and KeyRelease events.`);
        console.log(`[Test] ==> This proves both systems work concurrently.`);

    }, 6000);

    // --- Phase 4: Unregister Hotkey ---
    setTimeout(() => {
        console.log(`\n[Test] PHASE 4: Unregistering Hotkey...`);
        sendCommand({ command: 'unregister', id: 'test-hotkey', shortcut: HOTKEY_TO_TEST });

        console.log(`[Test] ==> Now press '${HOTKEY_TO_TEST}' again.`);
        console.log(`[Test] ==> You should NOT see a 'hotkey_pressed' event.`);
        console.log(`[Test] ==> Ubuntu terminal SHOULD open now (hotkey is unregistered).`);

    }, 9000);

    // --- Phase 5: Test Invalid Command ---
    setTimeout(() => {
        console.log(`\n[Test] PHASE 5: Testing Error Handling...`);
        const invalidCommand = '{"command":"invalid","test":123}\n';
        console.log(`[Test] Sending invalid command: ${invalidCommand.trim()}`);
        agentProcess.stdin.write(invalidCommand);
        console.log("[Test] ==> You should see an 'error' event.");

    }, 12000);

    // --- Phase 6: Shutdown ---
    setTimeout(() => {
        console.log('\n[Test] Test complete. Shutting down agent...');
        agentProcess.kill('SIGINT'); // Send Ctrl-C to test graceful shutdown
    }, 15000);
}

function sendCommand(command) {
    const commandString = JSON.stringify(command) + '\n';
    if (agentProcess && agentProcess.stdin && !agentProcess.stdin.destroyed) {
        agentProcess.stdin.write(commandString);
        console.log(`[Test] Sent command: ${commandString.trim()}`);
    }
}

function printTestSummary() {
    console.log('\n=== TEST SUMMARY ===');
    console.log(`Hotkey events detected: ${hotkeyEventSeen ? '✅ YES' : '❌ NO'}`);
    console.log(`Raw key events detected: ${rawKeyEventsSeen.length > 0 ? '✅ YES' : '❌ NO'} (${rawKeyEventsSeen.length} events)`);
    
    if (rawKeyEventsSeen.length > 0) {
        const keyJEvents = rawKeyEventsSeen.filter(e => e.key === 'KeyJ');
        console.log(`Raw 'J' key events: ${keyJEvents.length > 0 ? '✅ YES' : '❌ NO'} (${keyJEvents.length} events)`);
    }
    
    console.log('\nExpected behavior:');
    console.log('1. ✅ Raw key streaming should work for normal keys');
    console.log('2. ✅ Hotkey registration should trigger hotkey_pressed events');
    console.log('3. ✅ Registered hotkeys should NOT appear in raw stream');
    console.log('4. ✅ Registered hotkeys should NOT trigger OS actions');
    console.log('5. ✅ Both systems should work concurrently without interference');
    console.log('==================');
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