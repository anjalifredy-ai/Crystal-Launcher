import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, writeFileSync, readFileSync, createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'
import { Readable } from 'stream'

const MANIFEST_URL = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json'

export interface VersionEntry {
  id: string
  type: string
  url: string
  time: string
  releaseTime: string
  sha1?: string
  complianceLevel?: number
}

export interface VersionManifest {
  latest: {
    release: string
    snapshot: string
  }
  versions: VersionEntry[]
}

export interface LocalVersion {
  id: string
  type: string
  installed: boolean
  hasJar: boolean
  path: string
}

function getDataDir() {
  const dir = join(app.getPath('userData'), 'versions')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function getVersionDir(versionId: string) {
  const dir = join(getDataDir(), versionId)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

export async function fetchVersionManifest(): Promise<VersionManifest> {
  const res = await fetch(MANIFEST_URL)
  if (!res.ok) throw new Error(`Failed to fetch version manifest: ${res.status}`)
  return res.json() as Promise<VersionManifest>
}

export function getInstalledVersions(): LocalVersion[] {
  const dataDir = getDataDir()
  if (!existsSync(dataDir)) return []

  // We will scan after we have manifest context; for now return empty or simple scan
  return []
}

export function isVersionInstalled(versionId: string): boolean {
  const jarPath = join(getVersionDir(versionId), `${versionId}.jar`)
  const jsonPath = join(getVersionDir(versionId), `${versionId}.json`)
  return existsSync(jarPath) && existsSync(jsonPath)
}

async function downloadFile(url: string, dest: string, onProgress?: (percent: number) => void) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${url}`)

  const total = Number(res.headers.get('content-length') || 0)
  let downloaded = 0

  if (!res.body) throw new Error('No response body')

  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    downloaded += value.length
    if (total && onProgress) {
      onProgress(Math.round((downloaded / total) * 100))
    }
  }

  const buffer = Buffer.concat(chunks)
  writeFileSync(dest, buffer)
}

export async function downloadVersion(
  versionId: string,
  versionUrl: string,
  onProgress?: (stage: string, percent: number) => void
): Promise<{ success: boolean; path: string }> {
  const versionDir = getVersionDir(versionId)
  const jsonPath = join(versionDir, `${versionId}.json`)
  const jarPath = join(versionDir, `${versionId}.jar`)

  onProgress?.('Fetching version info', 5)

  // Download version JSON
  const versionRes = await fetch(versionUrl)
  if (!versionRes.ok) throw new Error(`Failed to fetch version JSON: ${versionRes.status}`)
  const versionJson = await versionRes.json()
  writeFileSync(jsonPath, JSON.stringify(versionJson, null, 2))

  onProgress?.('Downloading client jar', 20)

  const clientUrl = versionJson?.downloads?.client?.url
  if (!clientUrl) throw new Error('No client download URL in version JSON')

  await downloadFile(clientUrl, jarPath, (p) => {
    onProgress?.('Downloading client jar', 20 + Math.round(p * 0.7))
  })

  onProgress?.('Done', 100)

  return { success: true, path: versionDir }
}

export function getVersionJson(versionId: string): any | null {
  const jsonPath = join(getVersionDir(versionId), `${versionId}.json`)
  if (!existsSync(jsonPath)) return null
  try {
    return JSON.parse(readFileSync(jsonPath, 'utf-8'))
  } catch {
    return null
  }
}

export function getVersionsRoot() {
  return getDataDir()
}
