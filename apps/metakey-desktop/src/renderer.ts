/**
 * This file will automatically be loaded by webpack and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/latest/tutorial/process-model
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.js` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import './index.css';
import { IpcChannel, OverlayStatus, Theme, KeyEvent, OverlayContent } from 'shared-types';

declare global {
  interface Window {
    ipc: {
      on(channel: IpcChannel.OVERLAY_SET_STATUS, listener: (status: OverlayStatus) => void): () => void;
      on(channel: IpcChannel.OVERLAY_SHOW_CONTENT, listener: (content: OverlayContent) => void): () => void;
      on(channel: IpcChannel.SET_THEME, listener: (theme: Theme) => void): () => void;
      on(channel: IpcChannel.AGENT_KEY_EVENT, listener: (event: KeyEvent) => void): () => void;
    };
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('👋 This message is being logged by "renderer.ts", included via webpack');

  const overlay = document.getElementById('overlay-container');
  if (!overlay) {
    console.error('#overlay-container not found -- check your HTML');
    return;
  }

  const statusMessageEl = overlay.querySelector<HTMLElement>('.status-message');
  const contentDisplayEl = document.getElementById('content-display');
  const contentTitleEl = document.getElementById('content-title');
  const contentBodyEl = document.getElementById('content-body');
  const keyStreamDisplayEl = document.getElementById('key-stream-display');

  const themeStyleTag = document.createElement('link');
  themeStyleTag.rel = 'stylesheet';
  document.head.appendChild(themeStyleTag);

  window.ipc.on(IpcChannel.SET_THEME, (theme: Theme) => {
    const root = document.documentElement;
    for (const [key, value] of Object.entries(theme.tokens)) {
      root.style.setProperty(key, value as string);
    }
  });

  window.ipc.on(IpcChannel.OVERLAY_SET_STATUS, (payload: OverlayStatus) => {
    if (!statusMessageEl) return;

    // Remove all state classes first
    overlay.classList.remove('success', 'error', 'idle', 'processing', 'listening');

    // Add the current state class
    if (payload.status) {
      overlay.classList.add(payload.status);
    }

    if (payload.message) {
      statusMessageEl.innerHTML = payload.message;
    } else {
      statusMessageEl.innerHTML = '';
    }
  });

  window.ipc.on(IpcChannel.OVERLAY_SHOW_CONTENT, (payload: OverlayContent) => {
    if (payload.type === 'SPELL_RESULT') {
      if (contentDisplayEl && contentTitleEl && contentBodyEl) {
        contentTitleEl.innerText = payload.title;
        contentBodyEl.innerText = payload.body; // For now, just text. Markdown later.
        contentDisplayEl.style.display = 'block';
        keyStreamDisplayEl.style.display = 'none';
      }
    } else if (payload.type === 'KEY_STREAM') {
      if (keyStreamDisplayEl) {
        keyStreamDisplayEl.innerText = payload.keys;
        keyStreamDisplayEl.style.display = 'block';
        contentDisplayEl.style.display = 'none';
      }
    }
  });

  window.ipc.on(IpcChannel.AGENT_KEY_EVENT, (event: KeyEvent) => {
    const eventLog = document.getElementById('event-log');
    if (eventLog) {
      const eventEl = document.createElement('div');
      const eventTypeClass = event.event_type === 'KeyPress' ? 'key-event-press' : 'key-event-release';
      eventEl.classList.add(eventTypeClass);

      eventEl.innerHTML = `[${event.event_type}] <code>${event.key}</code>`;
      eventLog.appendChild(eventEl);
      eventLog.scrollTop = eventLog.scrollHeight;
    }
  });
});
