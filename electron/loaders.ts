import { join, dirname } from 'path'
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  copyFileSync,
} from 'fs'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { getVersionDir, getLibrariesDir, getVersionsDir, getRootDir } from './paths'
import { downloadVersion, getVersionJson, isVersionInstalled } from './versionManager'
import { ensureJava } from './javaRuntime'

const execFileAsync = promisify(execFile)

export type LoaderKind = 'vanilla' | 'fabric' | 'quilt' | 'forge' | 'neoforge' | 'optifine'

type ProgressFn = (stage: string, percent: number) => void

function ensureDir(d: string) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true })
  return d
}

async function downloadFile(url: string, dest: string) {
  ensureDir(dirname(dest))
  const res = await fetch(url, {
    headers: { 'User-Agent': 'CrystalLauncher/0.3' },
    redirect: 'follow',
  })
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

/** Map MC version -> NeoForge version prefix (21.1 for 1.21.1) */
function neoForgePrefix(mcVersion: string): string {
  const parts = mcVersion.split('.')
  // 1.21.1 -> 21.1 ; 1.21 -> 21.0 ; 1.20.4 -> 20.4
  if (parts.length >= 3) return `${parts[1]}.${parts[2]}`
  if (parts.length === 2) return `${parts[1]}.0`
  return mcVersion
}

async function ensureVanilla(mcVersion: string, onProgress?: ProgressFn) {
  if (isVersionInstalled(mcVersion)) {
    onProgress?.('Vanilla already installed', 45)
    return
  }
  onProgress?.('Fetching vanilla manifest', 5)
  const man = await fetch('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json')
  if (!man.ok) throw new Error('Mojang manifest failed')
  const data = await man.json()
  const entry = data.versions.find((v: any) => v.id === mcVersion)
  if (!entry) throw new Error(`Minecraft ${mcVersion} not found`)
  await downloadVersion(mcVersion, entry.url, (s, p) => onProgress?.(s, Math.min(48, 5 + p * 0.43)))
}

export async function getLatestFabricLoader(mcVersion: string): Promise<string> {
  const res = await fetch(
    `https://meta.fabricmc.net/v2/versions/loader/${encodeURIComponent(mcVersion)}`
  )
  if (!res.ok) throw new Error(`No Fabric loader for ${mcVersion}`)
  const list = await res.json()
  const stable = list.find((x: any) => x.loader?.stable) || list[0]
  if (!stable?.loader?.version) throw new Error('Fabric loader list empty')
  return stable.loader.version
}

export async function getLatestQuiltLoader(mcVersion: string): Promise<string> {
  const res = await fetch(
    `https://meta.quiltmc.org/v3/versions/loader/${encodeURIComponent(mcVersion)}`
  )
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

  onProgress?.(`Resolving ${kind} loader`, 50)
  const loader =
    loaderVersion ||
    (kind === 'fabric' ? await getLatestFabricLoader(mcVersion) : await getLatestQuiltLoader(mcVersion))

  onProgress?.(`Fetching ${kind} profile`, 55)
  const profileUrl =
    kind === 'fabric'
      ? `https://meta.fabricmc.net/v2/versions/loader/${encodeURIComponent(mcVersion)}/${encodeURIComponent(loader)}/profile/json`
      : `https://meta.quiltmc.org/v3/versions/loader/${encodeURIComponent(mcVersion)}/${encodeURIComponent(loader)}/profile/json`

  const res = await fetch(profileUrl)
  if (!res.ok) throw new Error(`${kind} profile HTTP ${res.status}`)
  const profile = await res.json()

  const versionId = profile.id || `${kind}-loader-${loader}-${mcVersion}`
  const vDir = getVersionDir(versionId)
  writeFileSync(join(vDir, `${versionId}.json`), JSON.stringify(profile, null, 2))

  // Client jar: inheritsFrom vanilla
  const inherits = profile.inheritsFrom || mcVersion
  const vanillaJar = join(getVersionDir(inherits), `${inherits}.jar`)
  const destJar = join(vDir, `${versionId}.jar`)
  if (existsSync(vanillaJar) && !existsSync(destJar)) {
    copyFileSync(vanillaJar, destJar)
  }

  // Download loader libraries (maven.fabricmc.net / quilt)
  const libs = profile.libraries || []
  const libsDir = getLibrariesDir()
  let i = 0
  for (const lib of libs) {
    i++
    const name = lib.name as string | undefined
    if (!name) continue
    const rel = (lib.downloads?.artifact?.path as string) || mavenPath(name)
    const dest = join(libsDir, rel)
    if (existsSync(dest)) continue
    let url = lib.downloads?.artifact?.url as string | undefined
    if (!url) {
      const base =
        (lib.url as string) ||
        (kind === 'fabric'
          ? 'https://maven.fabricmc.net/'
          : 'https://maven.quiltmc.org/repository/release/')
      url = base.replace(/\/$/, '/') + rel.replace(/\\/g, '/')
    }
    onProgress?.(
      `${kind} lib ${i}/${libs.length}`,
      55 + Math.round((i / Math.max(libs.length, 1)) * 40)
    )
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

async function resolveNeoForgeVersion(mcVersion: string, preferred: string | null): Promise<string> {
  if (preferred) return preferred
  const metaRes = await fetch(
    'https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml'
  )
  if (!metaRes.ok) throw new Error('NeoForge maven metadata failed')
  const xml = await metaRes.text()
  const versions = [...xml.matchAll(/<version>([^<]+)<\/version>/g)].map((m) => m[1])

  const prefix = neoForgePrefix(mcVersion)
  // Prefer stable (no -beta/-alpha) matching prefix, highest last in list
  const matching = versions.filter((v) => v === prefix || v.startsWith(prefix + '.'))
  if (!matching.length) {
    throw new Error(
      `No NeoForge for Minecraft ${mcVersion} (prefix ${prefix}). NeoForge needs 1.20.2+.`
    )
  }
  const stable = matching.filter((v) => !/-beta|-alpha|-rc/i.test(v))
  const pool = stable.length ? stable : matching
  return pool[pool.length - 1]
}

async function resolveForgeVersion(mcVersion: string, preferred: string | null): Promise<string> {
  if (preferred) return preferred
  const promo = await fetch(
    'https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json'
  )
  if (!promo.ok) throw new Error('Forge promotions failed')
  const promoJson = await promo.json()
  const ver =
    promoJson.promos?.[`${mcVersion}-recommended`] || promoJson.promos?.[`${mcVersion}-latest`]
  if (!ver) throw new Error(`No Forge build for ${mcVersion}`)
  return ver
}

/** Run official installer into our game directory */
async function runInstallerJar(
  installerPath: string,
  gameDir: string,
  onProgress?: ProgressFn
) {
  const java = await ensureJava(17, onProgress)
  if (!java) throw new Error('Java 17+ required for installer')

  onProgress?.('Running installer…', 78)
  const attempts: string[][] = [
    ['-jar', installerPath, '--installClient', gameDir],
    ['-jar', installerPath, '--installClient', gameDir + '/'],
    ['-jar', installerPath, '--installClient'],
  ]

  let lastErr = ''
  for (const args of attempts) {
    try {
      await execFileAsync(java.path, args, {
        timeout: 360000,
        windowsHide: true,
        cwd: gameDir,
        maxBuffer: 10 * 1024 * 1024,
      })
      return
    } catch (e: any) {
      lastErr = e.stderr?.toString?.() || e.message || String(e)
      // installer often exits non-zero even on success if GUI code path — check version folder later
    }
  }
  // Don't throw yet; caller verifies version folder exists
  console.warn('Installer exit:', lastErr)
}

function findInstalledVersion(kind: 'forge' | 'neoforge', mcVersion: string, hintId: string): string {
  const root = getVersionsDir()
  if (!existsSync(root)) return hintId
  const dirs = readdirSync(root)
  const lowerKind = kind.toLowerCase()

  // Exact hint
  if (dirs.includes(hintId) && existsSync(join(root, hintId, `${hintId}.json`))) return hintId

  // neoforge-21.1.x or forge-1.21.1-...
  const scored = dirs
    .filter((d) => {
      const dl = d.toLowerCase()
      return dl.includes(lowerKind) || dl.startsWith('neoforge') || dl.startsWith('forge-')
    })
    .map((d) => {
      let score = 0
      if (d.toLowerCase().includes(lowerKind)) score += 2
      if (d.includes(mcVersion)) score += 3
      if (existsSync(join(root, d, `${d}.json`))) score += 1
      return { d, score }
    })
    .sort((a, b) => b.score - a.score)

  if (scored[0]?.score > 0) return scored[0].d
  return hintId
}

async function installForgeFamily(
  kind: 'forge' | 'neoforge',
  mcVersion: string,
  loaderVersion: string | null,
  onProgress?: ProgressFn
): Promise<string> {
  await ensureVanilla(mcVersion, onProgress)
  onProgress?.(`Resolving ${kind}`, 52)

  const gameDir = getRootDir()
  let installerUrl: string
  let hintId: string

  if (kind === 'forge') {
    const ver = await resolveForgeVersion(mcVersion, loaderVersion)
    const full = `${mcVersion}-${ver}`
    hintId = `${mcVersion}-forge-${ver}`
    installerUrl = `https://maven.minecraftforge.net/net/minecraftforge/forge/${full}/forge-${full}-installer.jar`
  } else {
    const ver = await resolveNeoForgeVersion(mcVersion, loaderVersion)
    hintId = `neoforge-${ver}`
    installerUrl = `https://maven.neoforged.net/releases/net/neoforged/neoforge/${ver}/neoforge-${ver}-installer.jar`
  }

  const installerPath = join(getVersionsDir(), `_installers`, `${hintId}-installer.jar`)
  onProgress?.('Downloading installer', 60)
  try {
    await downloadFile(installerUrl, installerPath)
  } catch (e: any) {
    throw new Error(
      `Installer download failed for ${kind} ${mcVersion}. URL may be wrong or offline.\n${e.message}`
    )
  }

  await runInstallerJar(installerPath, gameDir, onProgress)

  // Installer writes into gameDir/versions/
  // Our getVersionsDir is gameDir/versions — same place
  const finalId = findInstalledVersion(kind, mcVersion, hintId)
  const jsonPath = join(getVersionDir(finalId), `${finalId}.json`)

  if (!existsSync(jsonPath)) {
    // Try alternate names NeoForge uses: neoforge-21.1.xxx
    const dirs = existsSync(getVersionsDir()) ? readdirSync(getVersionsDir()) : []
    const alt = dirs.find(
      (d) =>
        d.toLowerCase().includes('neoforge') ||
        (kind === 'forge' && d.toLowerCase().includes('forge') && d.includes(mcVersion))
    )
    if (alt && existsSync(join(getVersionsDir(), alt, `${alt}.json`))) {
      writeFileSync(join(getVersionsDir(), alt, '.installed'), new Date().toISOString())
      onProgress?.('Done', 100)
      return alt
    }
    throw new Error(
      `${kind} installer finished but version JSON not found. Try running installer manually once, or pick another MC version.`
    )
  }

  writeFileSync(join(getVersionDir(finalId), '.installed'), new Date().toISOString())
  onProgress?.('Done', 100)
  return finalId
}

/** OptiFine: use community download index + run official installer */
async function installOptiFine(
  mcVersion: string,
  onProgress?: ProgressFn
): Promise<string> {
  await ensureVanilla(mcVersion, onProgress)
  onProgress?.('Fetching OptiFine index', 52)

  // Public index maintained for launchers
  const indexUrls = [
    'https://zkitefly.github.io/optifine-download-list/index.json',
    'https://optifine-download-list.netlify.app/index.json',
  ]

  let entries: any[] = []
  for (const u of indexUrls) {
    try {
      const r = await fetch(u)
      if (!r.ok) continue
      const data = await r.json()
      entries = Array.isArray(data) ? data : data.versions || data.list || []
      if (entries.length) break
    } catch {}
  }

  if (!entries.length) {
    throw new Error(
      'OptiFine index unavailable. Download from optifine.net and put jar in versions, or use Fabric + Iris/Sodium.'
    )
  }

  // Match MC version in name fields
  const match = entries.find((e: any) => {
    const name = String(e.name || e.filename || e.file || e.id || '')
    const ver = String(e.mcversion || e.mcVersion || e.version || '')
    return ver === mcVersion || name.includes(mcVersion)
  })

  if (!match) {
    throw new Error(`No OptiFine build listed for ${mcVersion}`)
  }

  const fileName = match.filename || match.file || match.name || `OptiFine_${mcVersion}.jar`
  let url =
    match.url ||
    match.download ||
    match.mirror ||
    (match.path
      ? `https://of-302.zkitefly.eu.org/file/${match.path}`
      : null)

  if (!url && match.filename) {
    url = `https://of-302.zkitefly.eu.org/file/${match.filename}`
  }
  if (!url) throw new Error('OptiFine download URL missing in index')

  const ofPath = join(getVersionsDir(), '_installers', fileName)
  onProgress?.('Downloading OptiFine', 65)
  await downloadFile(url, ofPath)

  const gameDir = getRootDir()
  const java = await ensureJava(8, onProgress)
  if (!java) throw new Error('Java required for OptiFine installer')

  onProgress?.('Installing OptiFine', 80)
  // OptiFine jar is executable installer; try headless-ish
  try {
    await execFileAsync(java.path, ['-jar', ofPath], {
      timeout: 120000,
      windowsHide: true,
      cwd: gameDir,
      env: { ...process.env, OPTIFINE_DIR: gameDir },
    })
  } catch {
    // GUI may be required — still search for created version
  }

  // OptiFine creates versions like 1.20.1-OptiFine_HD_U_I6
  const dirs = existsSync(getVersionsDir()) ? readdirSync(getVersionsDir()) : []
  const ofVer =
    dirs.find((d) => d.includes('OptiFine') && d.includes(mcVersion)) ||
    dirs.find((d) => /optifine/i.test(d) && d.includes(mcVersion))

  if (!ofVer) {
    // Fallback: store as library mod-style version json pointing to vanilla + of jar
    const versionId = `${mcVersion}-OptiFine`
    const vDir = getVersionDir(versionId)
    const parent = getVersionJson(mcVersion)
    if (!parent) throw new Error('Vanilla JSON missing after install')

    const ofLibDir = ensureDir(join(getLibrariesDir(), 'optifine', 'OptiFine', mcVersion))
    const ofLibJar = join(ofLibDir, `OptiFine-${mcVersion}.jar`)
    copyFileSync(ofPath, ofLibJar)

    const ofJson = {
      id: versionId,
      inheritsFrom: mcVersion,
      time: new Date().toISOString(),
      releaseTime: new Date().toISOString(),
      type: 'release',
      mainClass: 'net.minecraft.launchwrapper.Launch',
      arguments: {
        game: ['--tweakClass', 'optifine.OptiFineTweaker'],
        jvm: [],
      },
      libraries: [
        {
          name: `optifine:OptiFine:${mcVersion}`,
          downloads: {
            artifact: {
              path: `optifine/OptiFine/${mcVersion}/OptiFine-${mcVersion}.jar`,
              url: '',
              size: 0,
              sha1: '',
            },
          },
        },
      ],
    }
    // Older MC uses minecraftArguments
    if (!parent.arguments) {
      delete (ofJson as any).arguments
      ;(ofJson as any).minecraftArguments =
        (parent.minecraftArguments || '') + ' --tweakClass optifine.OptiFineTweaker'
    }
    writeFileSync(join(vDir, `${versionId}.json`), JSON.stringify(ofJson, null, 2))
    const vJar = join(getVersionDir(mcVersion), `${mcVersion}.jar`)
    if (existsSync(vJar)) copyFileSync(vJar, join(vDir, `${versionId}.jar`))
    writeFileSync(join(vDir, '.installed'), new Date().toISOString())
    onProgress?.('Done (library mode)', 100)
    return versionId
  }

  writeFileSync(join(getVersionDir(ofVer), '.installed'), new Date().toISOString())
  onProgress?.('Done', 100)
  return ofVer
}

export async function installLoaderProfile(
  loader: LoaderKind,
  mcVersion: string,
  loaderVersion: string | null,
  onProgress?: ProgressFn
): Promise<{ success: boolean; versionId?: string; error?: string }> {
  try {
    if (!mcVersion?.trim()) return { success: false, error: 'Minecraft version required' }

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
      const id = await installOptiFine(mcVersion, onProgress)
      return { success: true, versionId: id }
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
  const seen = new Set<string>()
  while (json.inheritsFrom && !seen.has(json.inheritsFrom)) {
    seen.add(json.inheritsFrom)
    const parent = getVersionJson(json.inheritsFrom)
    if (!parent) break
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
      javaVersion: json.javaVersion || parent.javaVersion,
      inheritsFrom: json.inheritsFrom,
    }
  }
  return json
}
