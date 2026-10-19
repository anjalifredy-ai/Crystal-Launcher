import { join } from 'path'
import { existsSync, mkdirSync, writeFileSync, chmodSync } from 'fs'
import { app } from 'electron'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { findJava, JavaInfo } from './java'

const execFileAsync = promisify(execFile)

const RUNTIME_MANIFEST =
  'https://piston-meta.mojang.com/v1/products/java-runtime/2ec0cc96c44e5a76b9c8b7c39df7210883d12871/all.json'

/** Map major version -> Mojang component name */
const COMPONENT_BY_MAJOR: Record<number, string> = {
  8: 'jre-legacy',
  16: 'java-runtime-alpha',
  17: 'java-runtime-gamma',
  21: 'java-runtime-delta',
}

function getRuntimeRoot() {
  const dir = join(app.getPath('userData'), 'java-runtimes')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

export function getBundledJavaPath(major: number): string | null {
  const component = COMPONENT_BY_MAJOR[major] || COMPONENT_BY_MAJOR[17]
  const base = join(getRuntimeRoot(), component)
  const win = join(base, 'bin', 'java.exe')
  const nix = join(base, 'bin', 'java')
  if (existsSync(win)) return win
  if (existsSync(nix)) return nix
  // sometimes nested
  const win2 = join(base, 'bin', 'javaw.exe')
  if (existsSync(win2)) return win2
  return null
}

export async function ensureJava(major: number, onProgress?: (stage: string, pct: number) => void): Promise<JavaInfo | null> {
  // 1. System Java
  const system = await findJava(major)
  if (system && system.major >= major) return system

  // 2. Already downloaded
  const bundled = getBundledJavaPath(major)
  if (bundled) {
    return { path: bundled, version: String(major), major }
  }

  // 3. Download from Mojang
  onProgress?.('Fetching Java runtime list', 5)
  const manRes = await fetch(RUNTIME_MANIFEST)
  if (!manRes.ok) throw new Error('Failed to fetch Java runtime manifest')
  const all = await manRes.json()

  const platformKey =
    process.platform === 'win32'
      ? process.arch === 'ia32'
        ? 'windows-x86'
        : 'windows-x64'
      : process.platform === 'darwin'
      ? process.arch === 'arm64'
        ? 'mac-os-arm64'
        : 'mac-os'
      : process.arch === 'arm64'
      ? 'linux-arm64'
      : 'linux'

  const component = COMPONENT_BY_MAJOR[major] || 'java-runtime-gamma'
  const platformRuntimes = all[platformKey]
  if (!platformRuntimes?.[component]?.[0]) {
    // fallback try java-runtime-gamma
    const fallback = all[platformKey]?.['java-runtime-gamma']?.[0]
    if (!fallback) throw new Error(`No Java ${major} runtime for ${platformKey}`)
  }

  const entry = platformRuntimes[component]?.[0] || platformRuntimes['java-runtime-gamma'][0]
  const manifestUrl = entry.manifest.url

  onProgress?.('Downloading runtime manifest', 15)
  const filesRes = await fetch(manifestUrl)
  const filesJson = await filesRes.json()
  const files = filesJson.files as Record<string, any>

  const destRoot = join(getRuntimeRoot(), component)
  if (!existsSync(destRoot)) mkdirSync(destRoot, { recursive: true })

  const entries = Object.entries(files).filter(([, meta]) => meta.type === 'file')
  let done = 0
  const total = entries.length || 1

  for (const [relPath, meta] of entries) {
    const raw = meta.downloads?.raw
    if (!raw?.url) continue
    const dest = join(destRoot, relPath)
    const dir = join(dest, '..')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    if (!existsSync(dest)) {
      const r = await fetch(raw.url)
      if (r.ok) {
        const buf = Buffer.from(await r.arrayBuffer())
        writeFileSync(dest, buf)
        if (process.platform !== 'win32' && meta.executable) {
          try {
            chmodSync(dest, 0o755)
          } catch {}
        }
      }
    }
    done++
    if (done % 15 === 0 || done === total) {
      onProgress?.(`Extracting Java (${done}/${total})`, 15 + Math.round((done / total) * 80))
    }
  }

  const javaPath = getBundledJavaPath(major)
  if (!javaPath) throw new Error('Java downloaded but binary not found')
  onProgress?.('Java ready', 100)
  return { path: javaPath, version: String(major), major }
}
