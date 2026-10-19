import { writeFileSync, readFileSync, existsSync, mkdirSync, createWriteStream } from 'fs'
import { join, dirname } from 'path'
import { createHash } from 'crypto'
import { getVersionDir, getLibrariesDir, getAssetIndexesDir, getAssetObjectsDir, getNativesDir, getVersionsDir } from './paths'

const MANIFEST_URL = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json'

export interface VersionEntry {
  id: string
  type: string
  url: string
  time: string
  releaseTime: string
  sha1?: string
}

export interface VersionManifest {
  latest: { release: string; snapshot: string }
  versions: VersionEntry[]
}

type ProgressFn = (stage: string, percent: number) => void

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

export async function fetchVersionManifest(): Promise<VersionManifest> {
  const res = await fetch(MANIFEST_URL)
  if (!res.ok) throw new Error(`Failed to fetch version manifest: ${res.status}`)
  return res.json() as Promise<VersionManifest>
}

export function isVersionInstalled(versionId: string): boolean {
  const dir = getVersionDir(versionId)
  const jar = join(dir, `${versionId}.jar`)
  const json = join(dir, `${versionId}.json`)
  const marker = join(dir, '.installed')
  return existsSync(jar) && existsSync(json) && existsSync(marker)
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

async function downloadToFile(url: string, dest: string) {
  ensureDir(dirname(dest))
  if (existsSync(dest)) return
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  writeFileSync(dest, buf)
}

function rulesAllow(rules: any[] | undefined): boolean {
  if (!rules || rules.length === 0) return true
  let allowed = false
  for (const rule of rules) {
    let match = true
    if (rule.os) {
      const osName = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'osx' : 'linux'
      if (rule.os.name && rule.os.name !== osName) match = false
      if (rule.os.arch) {
        const arch = process.arch === 'x64' || process.arch === 'arm64' ? process.arch : process.arch
        // Mojang uses x86 / x86_64 sometimes
        if (rule.os.arch === 'x86' && process.arch !== 'ia32') match = false
      }
    }
    if (match) {
      allowed = rule.action === 'allow'
    }
  }
  return allowed
}

function mavenToPath(name: string): string {
  // group:artifact:version[:classifier]
  const parts = name.split(':')
  const group = parts[0].replace(/\./g, '/')
  const artifact = parts[1]
  const version = parts[2]
  const classifier = parts[3]
  const file = classifier
    ? `${artifact}-${version}-${classifier}.jar`
    : `${artifact}-${version}.jar`
  return join(group, artifact, version, file)
}

function getOsNativeKey(): string {
  if (process.platform === 'win32') return 'windows'
  if (process.platform === 'darwin') return 'osx'
  return 'linux'
}

async function extractNatives(zipPath: string, destDir: string) {
  // Use PowerShell Expand-Archive on Windows, unzip on others — or pure JS via adm-zip if available
  // Lightweight approach without extra deps: use child_process
  const { execFile } = await import('child_process')
  const { promisify } = await import('util')
  const execFileAsync = promisify(execFile)
  ensureDir(destDir)

  if (process.platform === 'win32') {
    // PowerShell Expand-Archive only works for .zip
    await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-Command', `Expand-Archive -Path "${zipPath}" -DestinationPath "${destDir}" -Force`],
      { windowsHide: true, timeout: 60000 }
    )
  } else {
    await execFileAsync('unzip', ['-o', zipPath, '-d', destDir], { timeout: 60000 })
  }
}

export async function downloadVersion(
  versionId: string,
  versionUrl: string,
  onProgress?: ProgressFn
): Promise<{ success: boolean; path: string }> {
  const versionDir = getVersionDir(versionId)
  const jsonPath = join(versionDir, `${versionId}.json`)
  const jarPath = join(versionDir, `${versionId}.jar`)
  const libsDir = getLibrariesDir()
  const nativesDir = getNativesDir(versionId)

  onProgress?.('Fetching version info', 2)

  const versionRes = await fetch(versionUrl)
  if (!versionRes.ok) throw new Error(`Failed to fetch version JSON: ${versionRes.status}`)
  const versionJson = await versionRes.json()
  writeFileSync(jsonPath, JSON.stringify(versionJson, null, 2))

  // Client jar
  onProgress?.('Downloading client jar', 5)
  const clientUrl = versionJson?.downloads?.client?.url
  if (!clientUrl) throw new Error('No client download URL')
  if (!existsSync(jarPath)) {
    await downloadToFile(clientUrl, jarPath)
  }

  // Libraries
  const libraries = versionJson.libraries || []
  const toDownload: { url: string; path: string; isNative?: boolean }[] = []

  for (const lib of libraries) {
    if (!rulesAllow(lib.rules)) continue

    // Main artifact
    if (lib.downloads?.artifact) {
      const art = lib.downloads.artifact
      const dest = join(libsDir, art.path)
      toDownload.push({ url: art.url, path: dest })
    } else if (lib.name && !lib.natives) {
      // Fallback maven path (rare)
      const rel = mavenToPath(lib.name)
      const dest = join(libsDir, rel)
      const baseUrl = lib.url || 'https://libraries.minecraft.net/'
      toDownload.push({ url: baseUrl + rel.replace(/\\/g, '/'), path: dest })
    }

    // Natives
    if (lib.natives) {
      const nativeKey = lib.natives[getOsNativeKey()]
      if (nativeKey && lib.downloads?.classifiers?.[nativeKey]) {
        const art = lib.downloads.classifiers[nativeKey]
        const dest = join(libsDir, art.path)
        toDownload.push({ url: art.url, path: dest, isNative: true })
      }
    }
  }

  const totalLibs = toDownload.length || 1
  let doneLibs = 0
  for (const item of toDownload) {
    if (!existsSync(item.path)) {
      onProgress?.(`Downloading libraries (${doneLibs + 1}/${totalLibs})`, 10 + Math.round((doneLibs / totalLibs) * 40))
      await downloadToFile(item.url, item.path)
    }
    if (item.isNative) {
      try {
        await extractNatives(item.path, nativesDir)
      } catch (e) {
        console.warn('Native extract failed', item.path, e)
      }
    }
    doneLibs++
  }

  // Assets
  onProgress?.('Downloading assets index', 55)
  const assetIndex = versionJson.assetIndex
  if (assetIndex?.url && assetIndex?.id) {
    const indexPath = join(getAssetIndexesDir(), `${assetIndex.id}.json`)
    if (!existsSync(indexPath)) {
      await downloadToFile(assetIndex.url, indexPath)
    }

    let index: any
    try {
      index = JSON.parse(readFileSync(indexPath, 'utf-8'))
    } catch {
      index = null
    }

    if (index?.objects) {
      const objects = Object.values(index.objects) as { hash: string; size: number }[]
      // Download a reasonable batch — full assets can be huge; skip existing
      const missing = objects.filter((o) => {
        const sub = o.hash.substring(0, 2)
        return !existsSync(join(getAssetObjectsDir(), sub, o.hash))
      })

      // Cap concurrent-style sequential with progress; limit to avoid hours on first run if user cancels
      // Download all missing (user asked for full install)
      const totalAssets = missing.length || 1
      let doneAssets = 0
      const concurrency = 8
      let idx = 0

      async function worker() {
        while (idx < missing.length) {
          const i = idx++
          const obj = missing[i]
          const sub = obj.hash.substring(0, 2)
          const dest = join(getAssetObjectsDir(), sub, obj.hash)
          const url = `https://resources.download.minecraft.net/${sub}/${obj.hash}`
          try {
            await downloadToFile(url, dest)
          } catch (e) {
            console.warn('Asset failed', obj.hash, e)
          }
          doneAssets++
          if (doneAssets % 20 === 0 || doneAssets === totalAssets) {
            onProgress?.(
              `Downloading assets (${doneAssets}/${totalAssets})`,
              55 + Math.round((doneAssets / totalAssets) * 40)
            )
          }
        }
      }

      await Promise.all(Array.from({ length: concurrency }, () => worker()))
    }
  }

  // Logging config optional
  if (versionJson.logging?.client?.file?.url) {
    const logFile = versionJson.logging.client.file
    const logPath = join(getVersionDir(versionId), logFile.id || 'client.xml')
    try {
      await downloadToFile(logFile.url, logPath)
    } catch {}
  }

  writeFileSync(join(versionDir, '.installed'), new Date().toISOString())
  onProgress?.('Install complete', 100)

  return { success: true, path: versionDir }
}

export function getVersionsRoot() {
  return getVersionsDir()
}

export function getClasspath(versionId: string, versionJson: any): string {
  const libsDir = getLibrariesDir()
  const jarPath = join(getVersionDir(versionId), `${versionId}.jar`)
  const paths: string[] = []

  for (const lib of versionJson.libraries || []) {
    if (!rulesAllow(lib.rules)) continue
    if (lib.natives && !lib.downloads?.artifact) continue // pure native jars not on classpath usually
    if (lib.downloads?.artifact) {
      paths.push(join(libsDir, lib.downloads.artifact.path))
    } else if (lib.name && !lib.natives) {
      paths.push(join(libsDir, mavenToPath(lib.name)))
    }
  }
  paths.push(jarPath)
  return paths.filter((p) => existsSync(p)).join(process.platform === 'win32' ? ';' : ':')
}
