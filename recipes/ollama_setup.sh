#!/bin/bash
# MetaKey AI - Ollama Setup Recipe
# Sets up local Ollama LLM server for offline spell processing

set -e

OLLAMA_VERSION="0.1.21"
INSTALL_DIR="$HOME/.metakey/runtimes/ollama"
LOG_FILE="$HOME/.metakey/logs/ollama_setup.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Starting Ollama setup for MetaKey AI..."

# Create directory structure
mkdir -p "$INSTALL_DIR/bin"
mkdir -p "$(dirname "$LOG_FILE")"

# Detect platform
PLATFORM=""
case "$(uname -s)" in
    Linux*)     PLATFORM="linux" ;;
    Darwin*)    PLATFORM="darwin" ;;
    *)          log "ERROR: Unsupported platform $(uname -s)"; exit 1 ;;
esac

ARCH=""
case "$(uname -m)" in
    x86_64)     ARCH="amd64" ;;
    arm64)      ARCH="arm64" ;;
    *)          log "ERROR: Unsupported architecture $(uname -m)"; exit 1 ;;
esac

# Download Ollama
DOWNLOAD_URL="https://github.com/ollama/ollama/releases/download/v${OLLAMA_VERSION}/ollama-${PLATFORM}-${ARCH}"
OLLAMA_BIN="$INSTALL_DIR/bin/ollama"

log "Downloading Ollama from $DOWNLOAD_URL..."
if command -v curl >/dev/null 2>&1; then
    curl -L "$DOWNLOAD_URL" -o "$OLLAMA_BIN"
elif command -v wget >/dev/null 2>&1; then
    wget "$DOWNLOAD_URL" -O "$OLLAMA_BIN"
else
    log "ERROR: Neither curl nor wget found"
    exit 1
fi

chmod +x "$OLLAMA_BIN"

# Test installation
log "Testing Ollama installation..."
if "$OLLAMA_BIN" --version >/dev/null 2>&1; then
    log "✓ Ollama installed successfully"
else
    log "ERROR: Ollama installation failed"
    exit 1
fi

# Download initial model (lightweight for testing)
log "Downloading initial model (llama3.2:1b)..."
"$OLLAMA_BIN" serve &
OLLAMA_PID=$!
sleep 5

"$OLLAMA_BIN" pull llama3.2:1b
log "✓ Model downloaded successfully"

# Stop server
kill $OLLAMA_PID 2>/dev/null || true

# Create MetaKey config
cat > "$INSTALL_DIR/metakey-config.json" << EOF
{
  "provider": "ollama",
  "executable": "$OLLAMA_BIN",
  "default_model": "llama3.2:1b",
  "server_port": 11434,
  "health_check_url": "http://localhost:11434/api/tags"
}
EOF

log "✓ Ollama setup complete!"
log "Binary: $OLLAMA_BIN"
log "Config: $INSTALL_DIR/metakey-config.json"
log "Ready for MetaKey AI integration" 