import { existsSync, readFileSync, writeFileSync } from 'fs'
import { createHash, randomUUID } from 'crypto'
import { getAccountsPath } from './paths'

export interface Account {
  id: string
  username: string
  uuid: string
  type: 'offline'
  active: boolean
  createdAt: string
}

function offlineUUID(username: string): string {
  const hash = createHash('md5').update('OfflinePlayer:' + username).digest()
  hash[6] = (hash[6] & 0x0f) | 0x30
  hash[8] = (hash[8] & 0x3f) | 0x80
  const hex = hash.toString('hex')
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-')
}

function load(): Account[] {
  const path = getAccountsPath()
  if (!existsSync(path)) return []
  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    return []
  }
}

function save(accounts: Account[]) {
  writeFileSync(getAccountsPath(), JSON.stringify(accounts, null, 2))
}

export function listAccounts(): Account[] {
  return load()
}

export function getActiveAccount(): Account | null {
  const accounts = load()
  return accounts.find((a) => a.active) || accounts[0] || null
}

export function addOfflineAccount(username: string): Account {
  const trimmed = username.trim()
  if (!trimmed || trimmed.length < 3 || trimmed.length > 16) {
    throw new Error('Username must be 3-16 characters')
  }
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    throw new Error('Username can only contain letters, numbers and underscore')
  }

  const accounts = load()
  if (accounts.some((a) => a.username.toLowerCase() === trimmed.toLowerCase())) {
    throw new Error('Account already exists')
  }

  const account: Account = {
    id: randomUUID(),
    username: trimmed,
    uuid: offlineUUID(trimmed),
    type: 'offline',
    active: accounts.length === 0,
    createdAt: new Date().toISOString(),
  }

  accounts.push(account)
  save(accounts)
  return account
}

export function setActiveAccount(id: string): Account | null {
  const accounts = load()
  let found: Account | null = null
  for (const a of accounts) {
    a.active = a.id === id
    if (a.active) found = a
  }
  save(accounts)
  return found
}

export function removeAccount(id: string) {
  let accounts = load().filter((a) => a.id !== id)
  if (accounts.length && !accounts.some((a) => a.active)) {
    accounts[0].active = true
  }
  save(accounts)
}
