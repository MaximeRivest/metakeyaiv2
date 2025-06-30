// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';
import type {
  IpcListenerSignatures,
  IpcInvokeSignatures,
} from 'shared-types';

console.log('Preload script starting…');

try {
  /* Guard: expose only once per renderer process */
  if (!('__metakey_ipc_exposed__' in globalThis)) {
    (globalThis as any).__metakey_ipc_exposed__ = true;

    contextBridge.exposeInMainWorld('ipc', {
      on: <T extends keyof IpcListenerSignatures>(
        channel: T,
        listener: IpcListenerSignatures[T]
      ) => {
        const wrapped = (_: Electron.IpcRendererEvent, ...args: any[]) =>
          (listener as any)(...args);

        ipcRenderer.on(channel, wrapped);
        return () => ipcRenderer.removeListener(channel, wrapped);
      },

      invoke: <T extends keyof IpcInvokeSignatures>(
        channel: T,
        ...args: Parameters<IpcInvokeSignatures[T]>
      ): ReturnType<IpcInvokeSignatures[T]> =>
        ipcRenderer.invoke(channel, ...args) as ReturnType<IpcInvokeSignatures[T]>
    });

    console.log('IPC bridge exposed');
  } else {
    console.log('IPC bridge already present – skipped re-expose');
  }
} catch (err) {
  console.error('Error in preload script:', err);
}
