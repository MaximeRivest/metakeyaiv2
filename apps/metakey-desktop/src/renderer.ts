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
import { IpcChannel, OverlayState, Theme, KeyEvent } from 'shared-types';

declare global {
  interface Window {
    ipc: {
      on(channel: IpcChannel.SET_STATE, listener: (state: OverlayState) => void): void;
      on(channel: IpcChannel.SET_THEME, listener: (theme: Theme) => void): void;
      on(channel: IpcChannel.KEY_EVENT, listener: (event: KeyEvent) => void): void;
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

  const messageEl = overlay.querySelector<HTMLElement>('.message');
  const themeStyleTag = document.createElement('link');
  themeStyleTag.rel = 'stylesheet';
  document.head.appendChild(themeStyleTag);

  window.ipc.on(IpcChannel.SET_THEME, (theme: Theme) => {
    const root = document.documentElement;
    for (const [key, value] of Object.entries(theme.tokens)) {
      root.style.setProperty(key, value as string);
    }
  });

  window.ipc.on(IpcChannel.SET_STATE, (state: OverlayState) => {
    if (!messageEl) return;

    // Remove all state classes first
    overlay.classList.remove('success', 'error', 'idle');

    // Add the current state class
    if (state.status) {
      overlay.classList.add(state.status);
    }

    if (state.status === 'success' || state.status === 'error') {
      messageEl.innerHTML = state.message;
    } else {
      messageEl.innerHTML = '';
    }
  });

  window.ipc.on(IpcChannel.KEY_EVENT, (event: KeyEvent) => {
    const eventLog = document.getElementById('event-log');
    if (eventLog) {
      const eventEl = document.createElement('div');
      eventEl.innerText = `[${event.event_type}] ${event.key}`;
      eventLog.appendChild(eventEl);
      eventLog.scrollTop = eventLog.scrollHeight;
    }
  });
});
