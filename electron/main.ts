import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { join } from 'path'
import {
  fetchVersionManifest,
  downloadVersion,
  isVersionInstalled,
  getVersionsRoot,
  VersionEntry,
} from './versionManager'
import {
  listAccounts,
  getActiveAccount,
  addOfflineAccount,
  setActiveAccount,
  removeAccount,
} from './accounts'
import { findJava } from './java'
import { launchGame } from './launcher'

let mainWindow: BrowserWindow | null = null
const isDev = !app.isPackaged

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1100,
    minHeight: 700,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0a0f',
    show: false,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => mainWindow?.show())

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Window
ipcMain.handle('window:minimize', () => mainWindow?.minimize())
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.handle('window:close', () => mainWindow?.close())
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false)

// Versions
ipcMain.handle('versions:fetchManifest', async () => {
  try {
    const manifest = await fetchVersionManifest()
    const versions = manifest.versions.map((v: VersionEntry) => ({
      id: v.id,
      type: v.type,
      url: v.url,
      releaseTime: v.releaseTime,
      installed: isVersionInstalled(v.id),
    }))
    return { success: true, latest: manifest.latest, versions }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch versions' }
  }
})

ipcMain.handle('versions:isInstalled', (_e, versionId: string) => isVersionInstalled(versionId))

ipcMain.handle('versions:download', async (_e, versionId: string, versionUrl: string) => {
  try {
    const result = await downloadVersion(versionId, versionUrl, (stage, percent) => {
      mainWindow?.webContents.send('versions:downloadProgress', { versionId, stage, percent })
    })
    return { success: true, path: result.path }
  } catch (err: any) {
    return { success: false, error: err.message || 'Download failed' }
  }
})

ipcMain.handle('versions:getRoot', () => getVersionsRoot())

// Accounts
ipcMain.handle('accounts:list', () => listAccounts())
ipcMain.handle('accounts:active', () => getActiveAccount())
ipcMain.handle('accounts:addOffline', (_e, username: string) => {
  try {
    return { success: true, account: addOfflineAccount(username) }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})
ipcMain.handle('accounts:setActive', (_e, id: string) => {
  return { success: true, account: setActiveAccount(id) }
})
ipcMain.handle('accounts:remove', (_e, id: string) => {
  removeAccount(id)
  return { success: true }
})

// Java
ipcMain.handle('java:find', async () => {
  const info = await findJava(8)
  return info ? { success: true, ...info } : { success: false, error: 'Java not found' }
})

// Launch
ipcMain.handle('game:launch', async (_e, versionId: string) => {
  return launchGame(versionId)
})

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, url) => {
    if (url !== contents.getURL()) event.preventDefault()
  })
})
