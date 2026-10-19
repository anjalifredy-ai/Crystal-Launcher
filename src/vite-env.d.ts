/// <reference types="vite/client" />

interface VersionInfo {
  id: string
  type: string
  url: string
  releaseTime: string
  installed: boolean
}

interface Account {
  id: string
  username: string
  uuid: string
  type: 'offline'
  active: boolean
  createdAt: string
}

interface ContentFile {
  name: string
  path: string
  enabled: boolean
  size: number
}

interface CrystalAPI {
  minimize: () => Promise<void>
  maximize: () => Promise<void>
  close: () => Promise<void>
  isMaximized: () => Promise<boolean>

  fetchVersions: () => Promise<{
    success: boolean
    latest?: { release: string; snapshot: string }
    versions?: VersionInfo[]
    error?: string
  }>
  isVersionInstalled: (id: string) => Promise<boolean>
  downloadVersion: (id: string, url: string) => Promise<{ success: boolean; path?: string; error?: string }>
  getVersionsRoot: () => Promise<string>
  onDownloadProgress: (callback: (data: any) => void) => () => void

  listAccounts: () => Promise<Account[]>
  getActiveAccount: () => Promise<Account | null>
  addOfflineAccount: (username: string) => Promise<{ success: boolean; account?: Account; error?: string }>
  setActiveAccount: (id: string) => Promise<{ success: boolean; account?: Account | null }>
  removeAccount: (id: string) => Promise<{ success: boolean }>

  findJava: () => Promise<{ success: boolean; path?: string; version?: string; major?: number; error?: string }>
  ensureJava: (major: number) => Promise<{ success: boolean; path?: string; major?: number; error?: string }>
  onJavaProgress: (callback: (data: any) => void) => () => void

  launchGame: (versionId: string) => Promise<{ success: boolean; error?: string; pid?: number }>
  onGameProgress: (callback: (data: any) => void) => () => void

  listContent: (type: string) => Promise<ContentFile[]>
  setContentEnabled: (type: string, name: string, enabled: boolean) => Promise<ContentFile[]>
  deleteContent: (type: string, name: string) => Promise<ContentFile[]>
  openContentFolder: (type: string) => Promise<{ success: boolean }>
  modrinthInstall: (
    projectId: string,
    gameVersion: string | null,
    loader: string,
    type: string
  ) => Promise<{ success: boolean; fileName?: string; error?: string }>
  onInstallProgress: (callback: (data: any) => void) => () => void
}

interface Window {
  crystal: CrystalAPI
}
