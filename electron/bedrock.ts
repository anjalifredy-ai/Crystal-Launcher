import { execFile, exec } from 'child_process'
import { promisify } from 'util'
import { shell } from 'electron'
import { existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { release, platform } from 'os'

const execFileAsync = promisify(execFile)
const execAsync = promisify(exec)

/** Official Minecraft Bedrock (Windows) package */
const BEDROCK_PFN = 'Microsoft.MinecraftUWP_8wekyb3d8bbwe'
const BEDROCK_AUMID = `${BEDROCK_PFN}!App`

/** Minecraft Preview (optional) */
const PREVIEW_PFN = 'Microsoft.MinecraftWindowsBeta_8wekyb3d8bbwe'
const PREVIEW_AUMID = `${PREVIEW_PFN}!App`

export type WinEdition = 'win7' | 'win8' | 'win10' | 'win11' | 'other' | 'non-windows'

export function detectWindowsEdition(): WinEdition {
  if (platform() !== 'win32') return 'non-windows'
  const r = release() // e.g. 10.0.22631
  const parts = r.split('.').map(Number)
  const major = parts[0] || 0
  const build = parts[2] || 0
  if (major < 10) {
    if (major === 6 && (parts[1] || 0) <= 1) return 'win7'
    return 'win8'
  }
  // Windows 11 starts at build 22000
  if (build >= 22000) return 'win11'
  return 'win10'
}

export function bedrockSupported(): boolean {
  const ed = detectWindowsEdition()
  return ed === 'win10' || ed === 'win11'
}

async function isPackageInstalled(pfn: string): Promise<boolean> {
  if (platform() !== 'win32') return false
  try {
    const { stdout } = await execAsync(
      `powershell -NoProfile -Command "Get-AppxPackage -Name '${pfn.split('_')[0]}' | Select-Object -ExpandProperty PackageFullName"`,
      { timeout: 15000, windowsHide: true }
    )
    return stdout.trim().length > 0
  } catch {
    // Fallback: check WindowsApps path (may need admin; often fails)
    try {
      const apps = join(process.env.ProgramFiles || 'C:\\Program Files', 'WindowsApps')
      if (!existsSync(apps)) return false
      const names = readdirSync(apps)
      return names.some((n) => n.startsWith(pfn.split('_')[0]))
    } catch {
      return false
    }
  }
}

export async function getBedrockStatus(): Promise<{
  supported: boolean
  windowsEdition: WinEdition
  installed: boolean
  previewInstalled: boolean
  packageFamilyName: string
  message: string
}> {
  const windowsEdition = detectWindowsEdition()
  const supported = bedrockSupported()

  if (!supported) {
    return {
      supported: false,
      windowsEdition,
      installed: false,
      previewInstalled: false,
      packageFamilyName: BEDROCK_PFN,
      message:
        windowsEdition === 'win7' || windowsEdition === 'win8'
          ? 'Bedrock Microsoft Store overlay needs Windows 10 or 11. Win7 pe sirf Java Edition.'
          : 'Bedrock launch Windows pe Microsoft Store app se hota hai.',
    }
  }

  const installed = await isPackageInstalled(BEDROCK_PFN)
  const previewInstalled = await isPackageInstalled(PREVIEW_PFN)

  return {
    supported: true,
    windowsEdition,
    installed,
    previewInstalled,
    packageFamilyName: BEDROCK_PFN,
    message: installed
      ? 'Minecraft Bedrock installed — Microsoft / Xbox account se launch hoga.'
      : 'Bedrock install nahi hai. Microsoft Store se install karo (Play pe Store khulega).',
  }
}

/**
 * Launch Bedrock via Microsoft Store / UWP shell (Xbox identity overlay).
 * Tries: minecraft: protocol → shell:AppsFolder AUMID → Store product page
 */
export async function launchBedrock(opts?: {
  preview?: boolean
}): Promise<{ success: boolean; method?: string; error?: string }> {
  if (!bedrockSupported()) {
    return {
      success: false,
      error: 'Bedrock needs Windows 10/11 for Microsoft Store overlay.',
    }
  }

  const preview = !!opts?.preview
  const aumid = preview ? PREVIEW_AUMID : BEDROCK_AUMID
  const pfn = preview ? PREVIEW_PFN : BEDROCK_PFN

  // 1) Protocol (uses registered handler — Microsoft account session)
  try {
    await shell.openExternal(preview ? 'minecraft-preview://' : 'minecraft://')
    return { success: true, method: 'protocol' }
  } catch {}

  // 2) shell:AppsFolder launch (UWP)
  try {
    await execFileAsync(
      'explorer.exe',
      [`shell:AppsFolder\\${aumid}`],
      { windowsHide: true, timeout: 10000 }
    )
    return { success: true, method: 'shell:AppsFolder' }
  } catch {}

  try {
    await execAsync(`start "" explorer.exe shell:AppsFolder\\${aumid}`, {
      windowsHide: true,
      timeout: 10000,
    })
    return { success: true, method: 'start explorer' }
  } catch {}

  // 3) Open Microsoft Store product page so user can install / update
  try {
    // Minecraft for Windows Store product
    await shell.openExternal(
      preview
        ? 'ms-windows-store://pdp/?ProductId=9N5T5F1HBT5W'
        : 'ms-windows-store://pdp/?ProductId=9NBLGGH2JHXJ'
    )
    return {
      success: true,
      method: 'ms-store',
      error: 'Opened Microsoft Store — install Minecraft then press Play again.',
    }
  } catch (e: any) {
    return {
      success: false,
      error: e.message || `Could not launch ${pfn}. Install from Microsoft Store.`,
    }
  }
}

export async function openBedrockStorePage(): Promise<{ success: boolean }> {
  try {
    await shell.openExternal('ms-windows-store://pdp/?ProductId=9NBLGGH2JHXJ')
    return { success: true }
  } catch {
    await shell.openExternal(
      'https://www.microsoft.com/store/productId/9NBLGGH2JHXJ'
    )
    return { success: true }
  }
}

/** Open Xbox app (Microsoft account / Game Pass hub) */
export async function openXboxApp(): Promise<{ success: boolean }> {
  try {
    await shell.openExternal('ms-xbox://')
    return { success: true }
  } catch {
    try {
      await shell.openExternal('xbox://')
      return { success: true }
    } catch {
      return { success: false }
    }
  }
}
