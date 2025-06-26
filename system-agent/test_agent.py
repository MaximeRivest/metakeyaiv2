#!/usr/bin/env python3
"""
Simple test script to verify the MetaKey AI System Agent JSON IPC protocol.
This demonstrates how the Electron Main Process would communicate with the agent.
"""

import json
import subprocess
import sys
import time
import threading

def send_command(process, command):
    """Send a JSON command to the agent via stdin"""
    command_json = json.dumps(command) + "\n"
    print(f"→ Sending: {command_json.strip()}")
    process.stdin.write(command_json)
    process.stdin.flush()

def read_events(process):
    """Read events from the agent's stdout"""
    while True:
        try:
            line = process.stdout.readline()
            if not line:
                break
            
            line = line.strip()
            if line:
                try:
                    event = json.loads(line)
                    print(f"← Received: {json.dumps(event, indent=2)}")
                except json.JSONDecodeError:
                    print(f"← Raw output: {line}")
        except Exception as e:
            print(f"Error reading events: {e}")
            break

def main():
    print("🚀 Starting MetaKey AI System Agent Test")
    print("=" * 50)
    
    # Start the system agent
    try:
        process = subprocess.Popen(
            ["./target/release/system-agent"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1  # Line buffered
        )
    except FileNotFoundError:
        print("❌ Error: system-agent binary not found. Run 'cargo build --release' first.")
        return 1
    
    # Start reading events in a separate thread
    event_thread = threading.Thread(target=read_events, args=(process,), daemon=True)
    event_thread.start()
    
    try:
        # Wait a moment for the agent to start
        time.sleep(1)
        
        print("\n📝 Test 1: Register hotkey Ctrl+Alt+Q")
        send_command(process, {
            "command": "register_hotkey",
            "id": "test_spell",
            "shortcut": "ctrl+alt+q"
        })
        
        time.sleep(0.5)
        
        print("\n📝 Test 2: Set clipboard content")
        send_command(process, {
            "command": "set_clipboard",
            "text": "Hello from MetaKey AI test!"
        })
        
        time.sleep(0.5)
        
        print("\n📝 Test 3: Enable clipboard monitoring")
        send_command(process, {
            "command": "set_clipboard_monitoring",
            "enabled": True
        })
        
        time.sleep(0.5)
        
        print("\n📝 Test 4: Register F1 hotkey")
        send_command(process, {
            "command": "register_hotkey",
            "id": "settings",
            "shortcut": "f1"
        })
        
        print("\n⌚ Agent is running. Try:")
        print("  • Press Ctrl+Alt+Q (should trigger 'test_spell' event)")
        print("  • Press F1 (should trigger 'settings' event)")
        print("  • Copy some text (should trigger clipboard event)")
        print("  • Press Ctrl+C to quit")
        
        # Keep running until interrupted
        try:
            while process.poll() is None:
                time.sleep(0.1)
        except KeyboardInterrupt:
            print("\n\n🔄 Sending quit command...")
            send_command(process, {"command": "quit"})
            
    except Exception as e:
        print(f"❌ Test error: {e}")
    finally:
        # Cleanup
        try:
            process.terminate()
            process.wait(timeout=2)
        except:
            process.kill()
    
    print("\n✅ Test completed")
    return 0

if __name__ == "__main__":
    sys.exit(main()) 