import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { getRootDir } from './paths'
import { LoaderKind } from './loaders'

export interface Profile {
  id: string
  name: string
  loader: LoaderKind
  mcVersion: string
  /** Actual version folder id to launch (fabric-loader-... etc) */
  launchVersionId: string | null
  loaderVersion: string | null
  createdAt: string
  active: boolean
}

function path() {
  return join(getRootDir(), 'profiles.json')
}

function load(): Profile[] {
  if (!existsSync(path())) return []
  try {
    return JSON.parse(readFileSync(path(), 'utf-8'))
  } catch {
    return []
  }
}

function save(list: Profile[]) {
  writeFileSync(path(), JSON.stringify(list, null, 2))
}

export function listProfiles(): Profile[] {
  return load()
}

export function getActiveProfile(): Profile | null {
  const list = load()
  return list.find((p) => p.active) || list[0] || null
}

export function upsertProfile(input: {
  id?: string
  name: string
  loader: LoaderKind
  mcVersion: string
  launchVersionId?: string | null
  loaderVersion?: string | null
}): Profile {
  const list = load()
  if (input.id) {
    const i = list.findIndex((p) => p.id === input.id)
    if (i >= 0) {
      list[i] = {
        ...list[i],
        name: input.name,
        loader: input.loader,
        mcVersion: input.mcVersion,
        launchVersionId: input.launchVersionId ?? list[i].launchVersionId,
        loaderVersion: input.loaderVersion ?? list[i].loaderVersion,
      }
      save(list)
      return list[i]
    }
  }
  const p: Profile = {
    id: input.id || `p_${Date.now()}`,
    name: input.name,
    loader: input.loader,
    mcVersion: input.mcVersion,
    launchVersionId: input.launchVersionId ?? null,
    loaderVersion: input.loaderVersion ?? null,
    createdAt: new Date().toISOString(),
    active: list.length === 0,
  }
  list.push(p)
  save(list)
  return p
}

export function setActiveProfile(id: string) {
  const list = load()
  for (const p of list) p.active = p.id === id
  save(list)
  return list.find((p) => p.id === id) || null
}

export function setProfileLaunchVersion(id: string, launchVersionId: string) {
  const list = load()
  const p = list.find((x) => x.id === id)
  if (p) {
    p.launchVersionId = launchVersionId
    save(list)
  }
  return p || null
}
