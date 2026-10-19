import { contextBridge, ipcRenderer } from 'electron'

// Expose safe APIs to the renderer (React UI)
contextBridge.exposeInMainWorld('crystal', {
  // Window controls
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),

  // Future APIs will go here:
  // launchGame: (options) => ipcRenderer.invoke('game:launch', options),
  // getVersions: () => ipcRenderer.invoke('versions:list'),
  // downloadVersion: (id) => ipcRenderer.invoke('versions:download', id),
  // getAccounts: () => ipcRenderer.invoke('accounts:list'),
})

// Type declaration for TypeScript
declare global {
  interface Window {
    crystal: {
      minimize: () => Promise<void>
      maximize: () => Promise<void>
      close: () => Promise<void>
      isMaximized: () => Promise<boolean>
    }
  }
}
