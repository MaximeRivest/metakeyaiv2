// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';
import {
  IpcListenerSignatures,
  IpcInvokeSignatures,
  IpcChannel,
  Theme,
  OverlayStatus,
  OverlayContent,
  KeyEvent,
} from 'shared-types';

contextBridge.exposeInMainWorld('ipc', {
  on: (
    channel: keyof IpcListenerSignatures,
    callback: IpcListenerSignatures[keyof IpcListenerSignatures]
  ) => {
    // A wrapper to satisfy TypeScript and ensure type safety.
    const listener = (event: Electron.IpcRendererEvent, ...args: any[]) => {
      (callback as (...args: any[]) => void)(...args);
    };

    ipcRenderer.on(channel, listener);

    return () => {
      ipcRenderer.removeListener(channel, listener);
    };
  },
  invoke: <T extends keyof IpcInvokeSignatures>(
    channel: T,
    ...args: Parameters<IpcInvokeSignatures[T]>
  ): ReturnType<IpcInvokeSignatures[T]> => {
    return ipcRenderer.invoke(channel, ...args) as ReturnType<IpcInvokeSignatures[T]>;
  },
});
