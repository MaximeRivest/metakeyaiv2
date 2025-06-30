import { spawn } from 'child_process';

console.log('=== Manual Hotkey Test ===');
console.log('This will register Control+Alt+T and listen for hotkey events.');
console.log('Press Control+Alt+T to test, then Ctrl+C to exit.\n');

const agent = spawn('./target/release/system-agent', [], { stdio: ['pipe', 'pipe', 'inherit'] });

// Register the hotkey
const registerCmd = JSON.stringify({ command: 'register', id: 'manual-test', shortcut: 'Control+Alt+T' }) + '\n';
agent.stdin.write(registerCmd);
console.log('✅ Registered Control+Alt+T');
console.log('👆 Now press Control+Alt+T - you should see a hotkey_pressed event below:');
console.log('📝 Ubuntu terminal should NOT open when you press it!\n');

// Listen for events
agent.stdout.on('data', (data) => {
    const events = data.toString().trim().split('\n');
    events.forEach(line => {
        if (line) {
            try {
                const event = JSON.parse(line);
                if (event.event === 'hotkey_pressed') {
                    console.log('🎉 HOTKEY EVENT:', event);
                } else if (event.event_type === 'KeyPress' && event.key === 'KeyT') {
                    console.log('⚠️  Raw T key detected - this should NOT happen when Control+Alt+T is registered!');
                }
            } catch (e) {
                // Not JSON, ignore
            }
        }
    });
});

// Graceful exit
process.on('SIGINT', () => {
    console.log('\nShutting down...');
    agent.kill('SIGINT');
    process.exit();
}); 