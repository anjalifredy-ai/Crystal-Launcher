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
  onDownloadProgress: (
    callback: (data: { versionId: string; stage: string; percent: number }) => void
  ) => () => void

  listAccounts: () => Promise<Account[]>
  getActiveAccount: () => Promise<Account | null>
  addOfflineAccount: (username: string) => Promise<{ success: boolean; account?: Account; error?: string }>
  setActiveAccount: (id: string) => Promise<{ success: boolean; account?: Account | null }>
  removeAccount: (id: string) => Promise<{ success: boolean }>

  findJava: () => Promise<{ success: boolean; path?: string; version?: string; major?: number; error?: string }>
  launchGame: (versionId: string) => Promise<{ success: boolean; error?: string; pid?: number }>
}

interface Window {
  crystal: CrystalAPI
}
