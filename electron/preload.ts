import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('crystal', {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),

  fetchVersions: () => ipcRenderer.invoke('versions:fetchManifest'),
  isVersionInstalled: (id: string) => ipcRenderer.invoke('versions:isInstalled', id),
  downloadVersion: (id: string, url: string) => ipcRenderer.invoke('versions:download', id, url),
  getVersionsRoot: () => ipcRenderer.invoke('versions:getRoot'),
  onDownloadProgress: (callback: (data: { versionId: string; stage: string; percent: number }) => void) => {
    const listener = (_: any, data: any) => callback(data)
    ipcRenderer.on('versions:downloadProgress', listener)
    return () => ipcRenderer.removeListener('versions:downloadProgress', listener)
  },

  listAccounts: () => ipcRenderer.invoke('accounts:list'),
  getActiveAccount: () => ipcRenderer.invoke('accounts:active'),
  addOfflineAccount: (username: string) => ipcRenderer.invoke('accounts:addOffline', username),
  setActiveAccount: (id: string) => ipcRenderer.invoke('accounts:setActive', id),
  removeAccount: (id: string) => ipcRenderer.invoke('accounts:remove', id),

  findJava: () => ipcRenderer.invoke('java:find'),
  launchGame: (versionId: string) => ipcRenderer.invoke('game:launch', versionId),
})
