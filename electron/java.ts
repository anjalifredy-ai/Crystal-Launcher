import { execFile } from 'child_process'
import { promisify } from 'util'
import { existsSync } from 'fs'
import { join } from 'path'

const execFileAsync = promisify(execFile)

const JAVA_CANDIDATES = [
  process.env.JAVA_HOME ? join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java') : null,
  process.platform === 'win32' ? 'java.exe' : 'java',
  // Common Windows install paths
  'C:\\Program Files\\Java\\jdk-21\\bin\\java.exe',
  'C:\\Program Files\\Java\\jdk-17\\bin\\java.exe',
  'C:\\Program Files\\Java\\jdk-11\\bin\\java.exe',
  'C:\\Program Files\\Java\\jre-1.8\\bin\\java.exe',
  'C:\\Program Files\\Eclipse Adoptium\\jdk-21.0.0-hotspot\\bin\\java.exe',
  'C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.0-hotspot\\bin\\java.exe',
  'C:\\Program Files\\Microsoft\\jdk-17.0.0-hotspot\\bin\\java.exe',
].filter(Boolean) as string[]

export interface JavaInfo {
  path: string
  version: string
  major: number
}

async function probeJava(javaPath: string): Promise<JavaInfo | null> {
  try {
    const { stderr, stdout } = await execFileAsync(javaPath, ['-version'], {
      timeout: 5000,
      windowsHide: true,
    })
    const out = (stderr || stdout || '').toString()
    const match = out.match(/version "([^"]+)"/)
    if (!match) return null
    const version = match[1]
    let major = 8
    if (version.startsWith('1.')) {
      major = parseInt(version.split('.')[1], 10)
    } else {
      major = parseInt(version.split('.')[0], 10)
    }
    return { path: javaPath, version, major }
  } catch {
    return null
  }
}

export async function findJava(minMajor = 8): Promise<JavaInfo | null> {
  // PATH first
  const fromPath = await probeJava(process.platform === 'win32' ? 'java' : 'java')
  if (fromPath && fromPath.major >= minMajor) return fromPath

  for (const candidate of JAVA_CANDIDATES) {
    if (candidate === 'java' || candidate === 'java.exe') continue
    if (!existsSync(candidate)) continue
    const info = await probeJava(candidate)
    if (info && info.major >= minMajor) return info
  }

  // Return any found java even if version is low (caller can warn)
  if (fromPath) return fromPath
  return null
}

export function requiredJavaMajor(versionJson: any): number {
  return versionJson?.javaVersion?.majorVersion || 8
}
