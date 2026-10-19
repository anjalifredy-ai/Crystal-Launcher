import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

export function getRootDir() {
  const dir = join(app.getPath('userData'), 'minecraft')
  ensureDir(dir)
  return dir
}

export function getVersionsDir() {
  return ensureDir(join(getRootDir(), 'versions'))
}

export function getVersionDir(id: string) {
  return ensureDir(join(getVersionsDir(), id))
}

export function getLibrariesDir() {
  return ensureDir(join(getRootDir(), 'libraries'))
}

export function getAssetsDir() {
  return ensureDir(join(getRootDir(), 'assets'))
}

export function getAssetIndexesDir() {
  return ensureDir(join(getAssetsDir(), 'indexes'))
}

export function getAssetObjectsDir() {
  return ensureDir(join(getAssetsDir(), 'objects'))
}

export function getNativesDir(versionId: string) {
  return ensureDir(join(getVersionDir(versionId), 'natives'))
}

export function getAccountsPath() {
  return join(getRootDir(), 'accounts.json')
}

export function getSettingsPath() {
  return join(getRootDir(), 'settings.json')
}

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}
