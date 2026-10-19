import { spawn, ChildProcess } from 'child_process'
import { join } from 'path'
import { existsSync } from 'fs'
import { getVersionJson, getClasspath, isVersionInstalled } from './versionManager'
import { getVersionDir, getNativesDir, getAssetsDir, getRootDir } from './paths'
import { findJava, requiredJavaMajor } from './java'
import { getActiveAccount } from './accounts'

let gameProcess: ChildProcess | null = null

function applyRules(arg: any): string[] {
  if (typeof arg === 'string') return [arg]
  if (!arg || !arg.value) return []
  const rules = arg.rules
  if (!rules) {
    return Array.isArray(arg.value) ? arg.value : [arg.value]
  }
  let allow = false
  for (const rule of rules) {
    let match = true
    if (rule.os) {
      const osName = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'osx' : 'linux'
      if (rule.os.name && rule.os.name !== osName) match = false
    }
    if (rule.features) {
      // We don't support demo / custom resolution features for now
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

export async function launchGame(versionId: string): Promise<{ success: boolean; error?: string; pid?: number }> {
  if (!isVersionInstalled(versionId)) {
    return { success: false, error: 'Version not installed. Install it first.' }
  }

  const versionJson = getVersionJson(versionId)
  if (!versionJson) return { success: false, error: 'Version JSON missing' }

  const account = getActiveAccount()
  if (!account) return { success: false, error: 'No account. Create an offline account first.' }

  const minJava = requiredJavaMajor(versionJson)
  const java = await findJava(minJava)
  if (!java) {
    return {
      success: false,
      error: `Java ${minJava}+ not found. Install Java and make sure it is on PATH.`,
    }
  }
  if (java.major < minJava) {
    return {
      success: false,
      error: `This version needs Java ${minJava}+. Found Java ${java.major} at ${java.path}`,
    }
  }

  const nativesDir = getNativesDir(versionId)
  const gameDir = getRootDir()
  const assetsDir = getAssetsDir()
  const classpath = getClasspath(versionId, versionJson)
  const mainClass = versionJson.mainClass
  if (!mainClass) return { success: false, error: 'No mainClass in version JSON' }

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
    launcher_version: '0.1.0',
    classpath,
    library_directory: join(gameDir, 'libraries'),
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
      for (const a of applyRules(arg)) {
        jvmArgs.push(replaceTokens(a, tokenMap))
      }
    }
  } else {
    jvmArgs.push('-cp', classpath)
  }

  // Ensure -cp is present
  if (!jvmArgs.includes('-cp') && !jvmArgs.includes('-classpath')) {
    jvmArgs.push('-cp', classpath)
  }

  const gameArgs: string[] = []

  if (versionJson.arguments?.game) {
    for (const arg of versionJson.arguments.game) {
      for (const a of applyRules(arg)) {
        gameArgs.push(replaceTokens(a, tokenMap))
      }
    }
  } else if (versionJson.minecraftArguments) {
    const parts = versionJson.minecraftArguments.split(' ').filter(Boolean)
    for (const p of parts) {
      gameArgs.push(replaceTokens(p, tokenMap))
    }
  } else {
    // Minimal fallback
    gameArgs.push(
      '--username',
      account.username,
      '--version',
      versionId,
      '--gameDir',
      gameDir,
      '--assetsDir',
      assetsDir,
      '--assetIndex',
      tokenMap.assets_index_name,
      '--uuid',
      tokenMap.auth_uuid,
      '--accessToken',
      '0',
      '--userType',
      'legacy',
      '--versionType',
      'release'
    )
  }

  const args = [...jvmArgs, mainClass, ...gameArgs]

  try {
    if (gameProcess && !gameProcess.killed) {
      gameProcess.kill()
    }

    gameProcess = spawn(java.path, args, {
      cwd: gameDir,
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    })

    gameProcess.unref()

    return { success: true, pid: gameProcess.pid }
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to start process' }
  }
}

export function isGameRunning(): boolean {
  return !!(gameProcess && !gameProcess.killed)
}
