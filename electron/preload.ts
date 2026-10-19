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
  onDownloadProgress: (callback: (data: any) => void) => {
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
  ensureJava: (major: number) => ipcRenderer.invoke('java:ensure', major),
  onJavaProgress: (callback: (data: any) => void) => {
    const listener = (_: any, data: any) => callback(data)
    ipcRenderer.on('java:progress', listener)
    return () => ipcRenderer.removeListener('java:progress', listener)
  },

  launchGame: (versionId: string) => ipcRenderer.invoke('game:launch', versionId),
  onGameProgress: (callback: (data: any) => void) => {
    const listener = (_: any, data: any) => callback(data)
    ipcRenderer.on('game:progress', listener)
    return () => ipcRenderer.removeListener('game:progress', listener)
  },

  listContent: (type: string) => ipcRenderer.invoke('content:list', type),
  setContentEnabled: (type: string, name: string, enabled: boolean) =>
    ipcRenderer.invoke('content:setEnabled', type, name, enabled),
  deleteContent: (type: string, name: string) => ipcRenderer.invoke('content:delete', type, name),
  openContentFolder: (type: string) => ipcRenderer.invoke('content:openFolder', type),
  modrinthInstall: (projectId: string, gameVersion: string | null, loader: string, type: string) =>
    ipcRenderer.invoke('content:modrinthInstall', projectId, gameVersion, loader, type),
  onInstallProgress: (callback: (data: any) => void) => {
    const listener = (_: any, data: any) => callback(data)
    ipcRenderer.on('content:installProgress', listener)
    return () => ipcRenderer.removeListener('content:installProgress', listener)
  },
})
