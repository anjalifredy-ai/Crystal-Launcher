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
import { ensureJava } from './javaRuntime'
import { launchGame } from './launcher'
import {
  listContent,
  setContentEnabled,
  deleteContent,
  openContentFolder,
  modrinthInstall,
  ContentType,
} from './contentManager'
import { installLoaderProfile, LoaderKind } from './loaders'
import {
  listProfiles,
  getActiveProfile,
  upsertProfile,
  setActiveProfile,
  setProfileLaunchVersion,
} from './profiles'
import {
  getBedrockStatus,
  launchBedrock,
  openBedrockStorePage,
  openXboxApp,
} from './bedrock'

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
    backgroundColor: '#070a10',
    show: false,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (isDev) mainWindow.loadURL('http://localhost:5173')
  else mainWindow.loadFile(join(__dirname, '../dist/index.html'))

  mainWindow.once('ready-to-show', () => mainWindow?.show())
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

ipcMain.handle('window:minimize', () => mainWindow?.minimize())
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.handle('window:close', () => mainWindow?.close())
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false)

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
    return { success: false, error: err.message || 'Failed' }
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

ipcMain.handle('accounts:list', () => listAccounts())
ipcMain.handle('accounts:active', () => getActiveAccount())
ipcMain.handle('accounts:addOffline', (_e, username: string) => {
  try {
    return { success: true, account: addOfflineAccount(username) }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})
ipcMain.handle('accounts:setActive', (_e, id: string) => ({ success: true, account: setActiveAccount(id) }))
ipcMain.handle('accounts:remove', (_e, id: string) => {
  removeAccount(id)
  return { success: true }
})

ipcMain.handle('java:find', async () => {
  const info = await findJava(8)
  return info ? { success: true, ...info } : { success: false, error: 'Java not found' }
})
ipcMain.handle('java:ensure', async (_e, major: number) => {
  try {
    const info = await ensureJava(major || 17, (stage, pct) => {
      mainWindow?.webContents.send('java:progress', { stage, percent: pct })
    })
    return info ? { success: true, ...info } : { success: false, error: 'Failed' }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('game:launch', async (_e, versionId: string) => {
  return launchGame(versionId, (stage, pct) => {
    mainWindow?.webContents.send('game:progress', { stage, percent: pct })
  })
})

ipcMain.handle('content:list', (_e, type: ContentType) => listContent(type))
ipcMain.handle('content:setEnabled', (_e, type: ContentType, name: string, enabled: boolean) =>
  setContentEnabled(type, name, enabled)
)
ipcMain.handle('content:delete', (_e, type: ContentType, name: string) => deleteContent(type, name))
ipcMain.handle('content:openFolder', (_e, type: ContentType) => {
  openContentFolder(type)
  return { success: true }
})
ipcMain.handle(
  'content:modrinthInstall',
  async (_e, projectId: string, gameVersion: string | null, loader: string, type: ContentType) => {
    return modrinthInstall(projectId, gameVersion, loader, type, (stage, pct) => {
      mainWindow?.webContents.send('content:installProgress', { stage, percent: pct })
    })
  }
)

ipcMain.handle(
  'loader:install',
  async (_e, loader: LoaderKind, mcVersion: string, loaderVersion: string | null) => {
    const result = await installLoaderProfile(loader, mcVersion, loaderVersion, (stage, percent) => {
      mainWindow?.webContents.send('loader:progress', { stage, percent })
    })
    return result
  }
)

ipcMain.handle('profiles:list', () => listProfiles())
ipcMain.handle('profiles:active', () => getActiveProfile())
ipcMain.handle('profiles:upsert', (_e, data: any) => ({ success: true, profile: upsertProfile(data) }))
ipcMain.handle('profiles:setActive', (_e, id: string) => ({ success: true, profile: setActiveProfile(id) }))
ipcMain.handle('profiles:setLaunchVersion', (_e, id: string, launchVersionId: string) => ({
  success: true,
  profile: setProfileLaunchVersion(id, launchVersionId),
}))

// Bedrock + Microsoft overlay
ipcMain.handle('bedrock:status', () => getBedrockStatus())
ipcMain.handle('bedrock:launch', (_e, preview?: boolean) => launchBedrock({ preview: !!preview }))
ipcMain.handle('bedrock:openStore', () => openBedrockStorePage())
ipcMain.handle('bedrock:openXbox', () => openXboxApp())

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
