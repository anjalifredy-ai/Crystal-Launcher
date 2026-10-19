import { app, shell } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readdirSync, renameSync, unlinkSync, writeFileSync, readFileSync } from 'fs'
import { getRootDir } from './paths'

export type ContentType = 'mods' | 'resourcepacks' | 'shaderpacks'

function ensure(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

/** Shared .minecraft-style folders under launcher data */
export function getContentDir(type: ContentType) {
  return ensure(join(getRootDir(), type))
}

export interface ContentFile {
  name: string
  path: string
  enabled: boolean
  size: number
}

export function listContent(type: ContentType): ContentFile[] {
  const dir = getContentDir(type)
  const files = readdirSync(dir)
  const out: ContentFile[] = []

  for (const f of files) {
    const full = join(dir, f)
    try {
      const st = require('fs').statSync(full)
      if (!st.isFile()) continue
      const lower = f.toLowerCase()
      if (type === 'mods') {
        if (!lower.endsWith('.jar') && !lower.endsWith('.jar.disabled')) continue
      } else {
        if (!lower.endsWith('.zip') && !lower.endsWith('.zip.disabled') && !lower.endsWith('.jar')) continue
      }
      const enabled = !lower.endsWith('.disabled')
      out.push({ name: f.replace(/\.disabled$/i, ''), path: full, enabled, size: st.size })
    } catch {}
  }
  return out.sort((a, b) => a.name.localeCompare(b.name))
}

export function setContentEnabled(type: ContentType, fileName: string, enabled: boolean) {
  const dir = getContentDir(type)
  const base = fileName.replace(/\.disabled$/i, '')
  const enabledPath = join(dir, base)
  const disabledPath = join(dir, base + '.disabled')

  if (enabled) {
    if (existsSync(disabledPath) && !existsSync(enabledPath)) {
      renameSync(disabledPath, enabledPath)
    }
  } else {
    if (existsSync(enabledPath) && !existsSync(disabledPath)) {
      renameSync(enabledPath, disabledPath)
    }
  }
  return listContent(type)
}

export function deleteContent(type: ContentType, fileName: string) {
  const dir = getContentDir(type)
  const base = fileName.replace(/\.disabled$/i, '')
  for (const p of [join(dir, base), join(dir, base + '.disabled')]) {
    if (existsSync(p)) unlinkSync(p)
  }
  return listContent(type)
}

export function openContentFolder(type: ContentType) {
  const dir = getContentDir(type)
  shell.openPath(dir)
}

/** Download a file from URL into content folder */
export async function installFromUrl(
  type: ContentType,
  url: string,
  fileName: string,
  onProgress?: (pct: number) => void
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    const dir = getContentDir(type)
    const safe = fileName.replace(/[^a-zA-Z0-9._\-]/g, '_')
    const dest = join(dir, safe)

    const res = await fetch(url)
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` }
    const buf = Buffer.from(await res.arrayBuffer())
    writeFileSync(dest, buf)
    onProgress?.(100)
    return { success: true, path: dest }
  } catch (e: any) {
    return { success: false, error: e.message || 'Install failed' }
  }
}

/** Modrinth: get versions for a project, pick best file for game version + loader */
export async function modrinthInstall(
  projectId: string,
  gameVersion: string | null,
  loader: string,
  type: ContentType,
  onProgress?: (stage: string, pct: number) => void
): Promise<{ success: boolean; fileName?: string; error?: string }> {
  try {
    onProgress?.('Fetching versions', 10)
    const res = await fetch(`https://api.modrinth.com/v2/project/${projectId}/version`)
    if (!res.ok) return { success: false, error: 'Modrinth version list failed' }
    const versions: any[] = await res.json()

    const loaderMap: Record<string, string> = {
      fabric: 'fabric',
      forge: 'forge',
      neoforge: 'neoforge',
      quilt: 'quilt',
      vanilla: 'minecraft',
      optifine: 'minecraft',
    }
    const wantLoader = loaderMap[loader] || 'fabric'

    let pick = versions.find((v) => {
      const loaders: string[] = v.loaders || []
      const gvs: string[] = v.game_versions || []
      const loaderOk = loaders.includes(wantLoader) || loaders.includes('minecraft')
      const gvOk = !gameVersion || gvs.some((g) => g === gameVersion || gameVersion.startsWith(g))
      return loaderOk && gvOk && v.files?.length
    })

    if (!pick) {
      pick = versions.find((v) => v.files?.length)
    }
    if (!pick) return { success: false, error: 'No compatible file on Modrinth' }

    const file = pick.files.find((f: any) => f.primary) || pick.files[0]
    onProgress?.('Downloading ' + file.filename, 40)

    const result = await installFromUrl(type, file.url, file.filename)
    if (!result.success) return { success: false, error: result.error }

    onProgress?.('Done', 100)
    return { success: true, fileName: file.filename }
  } catch (e: any) {
    return { success: false, error: e.message || 'Modrinth install failed' }
  }
}
