import { spawn, ChildProcess } from 'child_process'
import { join } from 'path'
import { existsSync } from 'fs'
import { getClasspath, isVersionInstalled } from './versionManager'
import { getNativesDir, getAssetsDir, getRootDir, getVersionDir, getLibrariesDir } from './paths'
import { requiredJavaMajor } from './java'
import { ensureJava } from './javaRuntime'
import { getActiveAccount } from './accounts'
import { getContentDir } from './contentManager'
import { resolveVersionJson } from './loaders'

let gameProcess: ChildProcess | null = null

function applyRules(arg: any): string[] {
  if (typeof arg === 'string') return [arg]
  if (!arg || !arg.value) return []
  const rules = arg.rules
  if (!rules) return Array.isArray(arg.value) ? arg.value : [arg.value]
  let allow = false
  for (const rule of rules) {
    let match = true
    if (rule.os) {
      const osName = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'osx' : 'linux'
      if (rule.os.name && rule.os.name !== osName) match = false
    }
    if (rule.features) {
      if (rule.features.is_demo_user) match = false
      if (rule.features.has_custom_resolution) match = false
    }
    if (match) allow = rule.action === 'allow'
  }
  if (!allow) return []
  return Array.isArray(arg.value) ? arg.value : [arg.value]
}

function replaceTokens(str: string, map: Record<string, string>): string {
  return str.replace(/\$\{([^}]+)\}/g, (_, key) => map[key] ?? '')
}

function buildClasspath(versionId: string, versionJson: any): string {
  const libsDir = getLibrariesDir()
  const paths: string[] = []
  for (const lib of versionJson.libraries || []) {
    if (lib.rules) {
      let allow = false
      for (const rule of lib.rules) {
        let match = true
        if (rule.os?.name) {
          const osName = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'osx' : 'linux'
          if (rule.os.name !== osName) match = false
        }
        if (match) allow = rule.action === 'allow'
      }
      if (!allow) continue
    }
    if (lib.downloads?.artifact?.path) {
      paths.push(join(libsDir, lib.downloads.artifact.path))
    } else if (lib.name) {
      const parts = lib.name.split(':')
      const rel = join(parts[0].replace(/\./g, '/'), parts[1], parts[2], `${parts[1]}-${parts[2]}.jar`)
      paths.push(join(libsDir, rel))
    }
  }
  // client jar: version jar or inherited
  let jar = join(getVersionDir(versionId), `${versionId}.jar`)
  if (!existsSync(jar) && versionJson.inheritsFrom) {
    jar = join(getVersionDir(versionJson.inheritsFrom), `${versionJson.inheritsFrom}.jar`)
  }
  paths.push(jar)
  return paths.filter((p) => existsSync(p)).join(process.platform === 'win32' ? ';' : ':')
}

export async function launchGame(
  versionId: string,
  onProgress?: (stage: string, pct: number) => void
): Promise<{ success: boolean; error?: string; pid?: number }> {
  const versionJson = resolveVersionJson(versionId)
  if (!versionJson) {
    // fallback installed check
    if (!isVersionInstalled(versionId)) {
      return { success: false, error: 'Version not installed. Create profile & Install first.' }
    }
    return { success: false, error: 'Version JSON missing' }
  }

  const account = getActiveAccount()
  if (!account) return { success: false, error: 'No account. Create offline account first.' }

  getContentDir('mods')
  getContentDir('resourcepacks')
  getContentDir('shaderpacks')

  const minJava = requiredJavaMajor(versionJson)
  let java
  try {
    onProgress?.('Checking Java', 5)
    java = await ensureJava(minJava, onProgress)
  } catch (e: any) {
    return { success: false, error: e.message || `Java ${minJava} failed` }
  }
  if (!java) return { success: false, error: `Java ${minJava}+ required` }

  const nativesDir = getNativesDir(versionJson.inheritsFrom || versionId)
  const gameDir = getRootDir()
  const assetsDir = getAssetsDir()
  const classpath = buildClasspath(versionId, versionJson)
  const mainClass = versionJson.mainClass
  if (!mainClass) return { success: false, error: 'No mainClass' }

  const tokenMap: Record<string, string> = {
    auth_player_name: account.username,
    version_name: versionId,
    game_directory: gameDir,
    assets_root: assetsDir,
    assets_index_name: versionJson.assetIndex?.id || versionJson.assets || 'legacy',
    auth_uuid: account.uuid.replace(/-/g, ''),
    auth_access_token: '0',
    clientid: '0',
    auth_xuid: '0',
    user_type: 'legacy',
    version_type: versionJson.type || 'release',
    natives_directory: nativesDir,
    launcher_name: 'CrystalLauncher',
    launcher_version: '0.3.0',
    classpath,
    library_directory: getLibrariesDir(),
    classpath_separator: process.platform === 'win32' ? ';' : ':',
  }

  const jvmArgs: string[] = [
    `-Djava.library.path=${nativesDir}`,
    `-Djna.tmpdir=${nativesDir}`,
    `-Dorg.lwjgl.system.SharedLibraryExtractPath=${nativesDir}`,
    `-Dio.netty.native.workdir=${nativesDir}`,
    '-Xmx2G',
    '-Xms512M',
  ]

  if (versionJson.arguments?.jvm) {
    for (const arg of versionJson.arguments.jvm) {
      for (const a of applyRules(arg)) jvmArgs.push(replaceTokens(a, tokenMap))
    }
  }
  if (!jvmArgs.includes('-cp') && !jvmArgs.includes('-classpath')) {
    jvmArgs.push('-cp', classpath)
  }

  const gameArgs: string[] = []
  if (versionJson.arguments?.game) {
    for (const arg of versionJson.arguments.game) {
      for (const a of applyRules(arg)) gameArgs.push(replaceTokens(a, tokenMap))
    }
  } else if (versionJson.minecraftArguments) {
    for (const p of versionJson.minecraftArguments.split(' ').filter(Boolean)) {
      gameArgs.push(replaceTokens(p, tokenMap))
    }
  } else {
    gameArgs.push(
      '--username', account.username,
      '--version', versionId,
      '--gameDir', gameDir,
      '--assetsDir', assetsDir,
      '--assetIndex', tokenMap.assets_index_name,
      '--uuid', tokenMap.auth_uuid,
      '--accessToken', '0',
      '--userType', 'legacy'
    )
  }

  const args = [...jvmArgs, mainClass, ...gameArgs]
  onProgress?.('Starting game', 100)

  try {
    if (gameProcess && !gameProcess.killed) gameProcess.kill()
    gameProcess = spawn(java.path, args, {
      cwd: gameDir,
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    })
    gameProcess.unref()
    return { success: true, pid: gameProcess.pid }
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to start' }
  }
}
