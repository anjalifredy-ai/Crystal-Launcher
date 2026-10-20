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
  onDownloadProgress: (cb: any) => {
    const l = (_: any, d: any) => cb(d)
    ipcRenderer.on('versions:downloadProgress', l)
    return () => ipcRenderer.removeListener('versions:downloadProgress', l)
  },

  listAccounts: () => ipcRenderer.invoke('accounts:list'),
  getActiveAccount: () => ipcRenderer.invoke('accounts:active'),
  addOfflineAccount: (u: string) => ipcRenderer.invoke('accounts:addOffline', u),
  setActiveAccount: (id: string) => ipcRenderer.invoke('accounts:setActive', id),
  removeAccount: (id: string) => ipcRenderer.invoke('accounts:remove', id),

  findJava: () => ipcRenderer.invoke('java:find'),
  ensureJava: (major: number) => ipcRenderer.invoke('java:ensure', major),
  onJavaProgress: (cb: any) => {
    const l = (_: any, d: any) => cb(d)
    ipcRenderer.on('java:progress', l)
    return () => ipcRenderer.removeListener('java:progress', l)
  },

  launchGame: (versionId: string) => ipcRenderer.invoke('game:launch', versionId),
  onGameProgress: (cb: any) => {
    const l = (_: any, d: any) => cb(d)
    ipcRenderer.on('game:progress', l)
    return () => ipcRenderer.removeListener('game:progress', l)
  },

  listContent: (type: string) => ipcRenderer.invoke('content:list', type),
  setContentEnabled: (type: string, name: string, enabled: boolean) =>
    ipcRenderer.invoke('content:setEnabled', type, name, enabled),
  deleteContent: (type: string, name: string) => ipcRenderer.invoke('content:delete', type, name),
  openContentFolder: (type: string) => ipcRenderer.invoke('content:openFolder', type),
  modrinthInstall: (projectId: string, gameVersion: string | null, loader: string, type: string) =>
    ipcRenderer.invoke('content:modrinthInstall', projectId, gameVersion, loader, type),
  onInstallProgress: (cb: any) => {
    const l = (_: any, d: any) => cb(d)
    ipcRenderer.on('content:installProgress', l)
    return () => ipcRenderer.removeListener('content:installProgress', l)
  },

  installLoader: (loader: string, mcVersion: string, loaderVersion: string | null) =>
    ipcRenderer.invoke('loader:install', loader, mcVersion, loaderVersion),
  onLoaderProgress: (cb: any) => {
    const l = (_: any, d: any) => cb(d)
    ipcRenderer.on('loader:progress', l)
    return () => ipcRenderer.removeListener('loader:progress', l)
  },

  listProfiles: () => ipcRenderer.invoke('profiles:list'),
  getActiveProfile: () => ipcRenderer.invoke('profiles:active'),
  upsertProfile: (data: any) => ipcRenderer.invoke('profiles:upsert', data),
  setActiveProfile: (id: string) => ipcRenderer.invoke('profiles:setActive', id),
  setProfileLaunchVersion: (id: string, launchVersionId: string) =>
    ipcRenderer.invoke('profiles:setLaunchVersion', id, launchVersionId),

  bedrockStatus: () => ipcRenderer.invoke('bedrock:status'),
  launchBedrock: (preview?: boolean) => ipcRenderer.invoke('bedrock:launch', preview),
  openBedrockStore: () => ipcRenderer.invoke('bedrock:openStore'),
  openXbox: () => ipcRenderer.invoke('bedrock:openXbox'),
})
