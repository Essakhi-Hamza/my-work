import { app, BrowserWindow, shell } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import electronUpdater from 'electron-updater'
const { autoUpdater } = electronUpdater

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#f4f5f7',
    title: 'LuxRent',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

   if (app.isPackaged) {
    void window.loadFile(path.join(__dirname, '../dist/index.html'))
  } else {
    void window.loadURL('http://localhost:5173')
  }
}

function setupAutoUpdater() {
  if (!app.isPackaged) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('error', (error) => {
    console.error('LuxRent update error:', error)
  })

  autoUpdater.on('update-available', (info) => {
    console.log('LuxRent update available:', info.version)
  })

  autoUpdater.on('update-downloaded', (info) => {
    console.log('LuxRent update downloaded:', info.version)
  })

  autoUpdater.checkForUpdates().catch((error) => {
    console.error('LuxRent update check failed:', error)
  })
}





app.whenReady().then(() => {
  setupAutoUpdater()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
