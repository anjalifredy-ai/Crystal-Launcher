import { join } from 'path'
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { getVersionDir, getLibrariesDir, getVersionsDir } from './paths'
import { downloadVersion, getVersionJson, isVersionInstalled } from './versionManager'
import { ensureJava } from './javaRuntime'

const execFileAsync = promisify(execFile)

export type LoaderKind = 'vanilla' | 'fabric' | 'quilt' | 'forge' | 'neoforge' | 'optifine'

type ProgressFn = (stage: string, percent: number) => void

function ensureDir(d: string) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true })
}

async function downloadFile(url: string, dest: string) {
  ensureDir(join(dest, '..'))
  if (existsSync(dest)) return
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed ${res.status}: ${url}`)
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()))
}

function mavenPath(name: string): string {
  const p = name.split(':')
  const g = p[0].replace(/\./g, '/')
  const a = p[1]
  const v = p[2]
  const c = p[3]
  const file = c ? `${a}-${v}-${c}.jar` : `${a}-${v}.jar`
  return join(g, a, v, file)
}

async function ensureVanilla(mcVersion: string, onProgress?: ProgressFn) {
  if (isVersionInstalled(mcVersion)) return
  onProgress?.('Fetching vanilla manifest', 5)
  const man = await fetch('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json')
  const data = await man.json()
  const entry = data.versions.find((v: any) => v.id === mcVersion)
  if (!entry) throw new Error(`Minecraft ${mcVersion} not found in Mojang manifest`)
  await downloadVersion(mcVersion, entry.url, (s, p) => onProgress?.(s, Math.min(50, p * 0.5)))
}

/** Latest stable Fabric loader for a game version */
export async function getLatestFabricLoader(mcVersion: string): Promise<string> {
  const res = await fetch(`https://meta.fabricmc.net/v2/versions/loader/${encodeURIComponent(mcVersion)}`)
  if (!res.ok) throw new Error(`No Fabric loader for ${mcVersion}`)
  const list = await res.json()
  const stable = list.find((x: any) => x.loader?.stable) || list[0]
  if (!stable?.loader?.version) throw new Error('Fabric loader list empty')
  return stable.loader.version
}

export async function getLatestQuiltLoader(mcVersion: string): Promise<string> {
  const res = await fetch(`https://meta.quiltmc.org/v3/versions/loader/${encodeURIComponent(mcVersion)}`)
  if (!res.ok) throw new Error(`No Quilt loader for ${mcVersion}`)
  const list = await res.json()
  const stable = list.find((x: any) => x.loader?.stable) || list[0]
  if (!stable?.loader?.version) throw new Error('Quilt loader list empty')
  return stable.loader.version
}

async function installFabricOrQuilt(
  kind: 'fabric' | 'quilt',
  mcVersion: string,
  loaderVersion: string | null,
  onProgress?: ProgressFn
): Promise<string> {
  await ensureVanilla(mcVersion, onProgress)

  const loader =
    loaderVersion ||
    (kind === 'fabric' ? await getLatestFabricLoader(mcVersion) : await getLatestQuiltLoader(mcVersion))

  onProgress?.(`Fetching ${kind} profile`, 55)
  const profileUrl =
    kind === 'fabric'
      ? `https://meta.fabricmc.net/v2/versions/loader/${encodeURIComponent(mcVersion)}/${encodeURIComponent(loader)}/profile/json`
      : `https://meta.quiltmc.org/v3/versions/loader/${encodeURIComponent(mcVersion)}/${encodeURIComponent(loader)}/profile/json`

  const res = await fetch(profileUrl)
  if (!res.ok) throw new Error(`${kind} profile failed: ${res.status}`)
  const profile = await res.json()

  const versionId = profile.id || `${kind}-loader-${loader}-${mcVersion}`
  const vDir = getVersionDir(versionId)
  writeFileSync(join(vDir, `${versionId}.json`), JSON.stringify(profile, null, 2))

  // Copy client jar from vanilla if inheritsFrom
  const inherits = profile.inheritsFrom || mcVersion
  const vanillaJar = join(getVersionDir(inherits), `${inherits}.jar`)
  const destJar = join(vDir, `${versionId}.jar`)
  if (existsSync(vanillaJar) && !existsSync(destJar)) {
    writeFileSync(destJar, readFileSync(vanillaJar))
  } else if (!existsSync(destJar) && existsSync(vanillaJar)) {
    writeFileSync(destJar, readFileSync(vanillaJar))
  }

  // Download loader libraries
  const libs = profile.libraries || []
  const libsDir = getLibrariesDir()
  let i = 0
  for (const lib of libs) {
    i++
    const name = lib.name
    if (!name) continue
    const rel = lib.downloads?.artifact?.path || mavenPath(name)
    const dest = join(libsDir, rel)
    if (existsSync(dest)) continue
    let url = lib.downloads?.artifact?.url
    if (!url) {
      const base = lib.url || (kind === 'fabric' ? 'https://maven.fabricmc.net/' : 'https://maven.quiltmc.org/repository/release/')
      url = base + rel.replace(/\\/g, '/')
    }
    onProgress?.(`${kind} libs ${i}/${libs.length}`, 55 + Math.round((i / Math.max(libs.length, 1)) * 40))
    try {
      await downloadFile(url, dest)
    } catch (e) {
      console.warn('lib fail', name, e)
    }
  }

  writeFileSync(join(vDir, '.installed'), new Date().toISOString())
  onProgress?.('Done', 100)
  return versionId
}

/** Forge / NeoForge via official installer --installClient */
async function installForgeFamily(
  kind: 'forge' | 'neoforge',
  mcVersion: string,
  loaderVersion: string | null,
  onProgress?: ProgressFn
): Promise<string> {
  await ensureVanilla(mcVersion, onProgress)
  onProgress?.(`Resolving ${kind} version`, 52)

  let installerUrl: string
  let versionId: string

  if (kind === 'forge') {
    // promotions slim for recommended
    const promo = await fetch('https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json')
    const promoJson = await promo.json()
    const key = `${mcVersion}-recommended`
    const keyLatest = `${mcVersion}-latest`
    const ver = loaderVersion || promoJson.promos?.[key] || promoJson.promos?.[keyLatest]
    if (!ver) throw new Error(`No Forge build for ${mcVersion}. Try another MC version.`)
    const full = `${mcVersion}-${ver}`
    versionId = `forge-${full}`
    installerUrl = `https://maven.minecraftforge.net/net/minecraftforge/forge/${full}/forge-${full}-installer.jar`
  } else {
    // NeoForge: use maven metadata - version format often 21.1.x for 1.21.1
    // API: https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml
    const metaRes = await fetch('https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml')
    const xml = await metaRes.text()
    const versions = [...xml.matchAll(/<version>([^<]+)<\/version>/g)].map((m) => m[1])
    // NeoForge versions often start with minor matching mc - e.g. 21.1 for 1.21.1
    const mcParts = mcVersion.split('.')
    const prefix = mcParts.length >= 2 ? `${mcParts[1]}.${mcParts[2] || '0'}` : mcVersion
    const match =
      loaderVersion ||
      versions.filter((v) => v.startsWith(prefix) || v.startsWith(mcVersion)).pop() ||
      versions[versions.length - 1]
    if (!match) throw new Error(`No NeoForge for ${mcVersion}`)
    versionId = `neoforge-${match}`
    installerUrl = `https://maven.neoforged.net/releases/net/neoforged/neoforge/${match}/neoforge-${match}-installer.jar`
  }

  const installerPath = join(getVersionsDir(), `${versionId}-installer.jar`)
  onProgress?.('Downloading installer', 60)
  await downloadFile(installerUrl, installerPath)

  const java = await ensureJava(17, onProgress)
  if (!java) throw new Error('Java 17+ required for Forge/NeoForge installer')

  onProgress?.('Running installer (client)', 75)
  const gameDir = join(getVersionsDir(), '..') // minecraft root
  try {
    await execFileAsync(
      java.path,
      ['-jar', installerPath, '--installClient', gameDir],
      { timeout: 300000, windowsHide: true }
    )
  } catch (e: any) {
    // Some installers use different flags
    try {
      await execFileAsync(java.path, ['-jar', installerPath, '--installClient'], {
        timeout: 300000,
        windowsHide: true,
        cwd: gameDir,
      })
    } catch (e2: any) {
      throw new Error(
        `${kind} installer failed. Install vanilla ${mcVersion} first. ${e2.message || e.message}`
      )
    }
  }

  // Find installed version folder
  const versionsRoot = getVersionsDir()
  const dirs = require('fs').readdirSync(versionsRoot) as string[]
  const found =
    dirs.find((d) => d.toLowerCase().includes(kind) && d.includes(mcVersion)) ||
    dirs.find((d) => d.toLowerCase().includes(kind)) ||
    versionId

  const finalId = found
  const marker = join(getVersionDir(finalId), '.installed')
  writeFileSync(marker, new Date().toISOString())
  onProgress?.('Done', 100)
  return finalId
}

/**
 * Install a loader profile. Returns version id to launch.
 */
export async function installLoaderProfile(
  loader: LoaderKind,
  mcVersion: string,
  loaderVersion: string | null,
  onProgress?: ProgressFn
): Promise<{ success: boolean; versionId?: string; error?: string }> {
  try {
    if (loader === 'vanilla') {
      await ensureVanilla(mcVersion, onProgress)
      return { success: true, versionId: mcVersion }
    }
    if (loader === 'fabric') {
      const id = await installFabricOrQuilt('fabric', mcVersion, loaderVersion, onProgress)
      return { success: true, versionId: id }
    }
    if (loader === 'quilt') {
      const id = await installFabricOrQuilt('quilt', mcVersion, loaderVersion, onProgress)
      return { success: true, versionId: id }
    }
    if (loader === 'forge' || loader === 'neoforge') {
      const id = await installForgeFamily(loader, mcVersion, loaderVersion, onProgress)
      return { success: true, versionId: id }
    }
    if (loader === 'optifine') {
      return {
        success: false,
        error:
          'OptiFine has no public install API. Install OptiFine jar via Mod Library / manual, or use Iris+Sodium on Fabric.',
      }
    }
    return { success: false, error: 'Unknown loader' }
  } catch (e: any) {
    return { success: false, error: e.message || 'Install failed' }
  }
}

/** Resolve libraries with inheritsFrom chain for launch */
export function resolveVersionJson(versionId: string): any | null {
  let json = getVersionJson(versionId)
  if (!json) return null
  if (json.inheritsFrom) {
    const parent = getVersionJson(json.inheritsFrom)
    if (parent) {
      json = {
        ...parent,
        ...json,
        libraries: [...(parent.libraries || []), ...(json.libraries || [])],
        arguments: {
          game: [...(parent.arguments?.game || []), ...(json.arguments?.game || [])],
          jvm: [...(parent.arguments?.jvm || []), ...(json.arguments?.jvm || [])],
        },
        mainClass: json.mainClass || parent.mainClass,
        assetIndex: json.assetIndex || parent.assetIndex,
        assets: json.assets || parent.assets,
        downloads: json.downloads || parent.downloads,
        minecraftArguments: json.minecraftArguments || parent.minecraftArguments,
      }
    }
  }
  return json
}
