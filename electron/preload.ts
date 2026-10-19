import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('crystal', {
  // Window controls
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),

  // Version management
  fetchVersions: () => ipcRenderer.invoke('versions:fetchManifest'),
  isVersionInstalled: (id: string) => ipcRenderer.invoke('versions:isInstalled', id),
  downloadVersion: (id: string, url: string) => ipcRenderer.invoke('versions:download', id, url),
  getVersionsRoot: () => ipcRenderer.invoke('versions:getRoot'),

  onDownloadProgress: (callback: (data: { versionId: string; stage: string; percent: number }) => void) => {
    const listener = (_: any, data: any) => callback(data)
    ipcRenderer.on('versions:downloadProgress', listener)
    return () => ipcRenderer.removeListener('versions:downloadProgress', listener)
  },
})
