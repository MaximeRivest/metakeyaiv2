import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';

console.log('[build-agent] Starting build...');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Define paths relative to the script's location
const projectRoot = path.resolve(__dirname, '..', '..', '..');
const agentSrcDir = path.join(projectRoot, 'packages', 'system-agent');
const agentBuildDir = path.join(agentSrcDir, 'target', 'release');
const agentBinaryName = 'system-agent';
const agentBinarySrcPath = path.join(agentBuildDir, agentBinaryName);

const appResourcesDir = path.join(projectRoot, 'apps', 'metakey-desktop', 'resources', 'bin');
const agentBinaryDestPath = path.join(appResourcesDir, agentBinaryName);

try {
    // 1. Build the Rust binary
    console.log(`[build-agent] Building agent in: ${agentSrcDir}`);
    const buildCommand = `cargo build --release --manifest-path "${path.join(agentSrcDir, 'Cargo.toml')}"`;
    execSync(buildCommand, { stdio: 'inherit' });
    console.log('[build-agent] Cargo build complete.');

    // 2. Ensure the destination directory exists
    fs.ensureDirSync(appResourcesDir);
    console.log(`[build-agent] Ensured destination directory exists: ${appResourcesDir}`);

    // 3. Copy the binary
    console.log(`[build-agent] Copying binary from: ${agentBinarySrcPath}`);
    console.log(`[build-agent] Copying binary to:   ${agentBinaryDestPath}`);
    fs.copySync(agentBinarySrcPath, agentBinaryDestPath, { overwrite: true });
    console.log('[build-agent] Binary copied successfully.');

    console.log('[build-agent] Build process finished.');

} catch (error) {
    console.error('[build-agent] Build failed:', error);
    process.exit(1);
} 