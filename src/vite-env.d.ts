/// <reference types="vite/client" />

interface VersionInfo {
  id: string
  type: string
  url: string
  releaseTime: string
  installed: boolean
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
}

interface Window {
  crystal: CrystalAPI
}
