import { app, BrowserWindow, nativeTheme, Menu, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

// Must be set before app.whenReady() to affect macOS menu bar
app.name = 'SuperTools'

const iconPath = path.join(process.env.VITE_PUBLIC, 'icon.png')

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    width: 1024,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    title: 'SuperTools',
    icon: iconPath,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1a1a2e' : '#f8fafc',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false,
  })

  win.once('ready-to-show', () => {
    win?.show()
    if (process.platform === 'darwin') {
      app.dock.setIcon(iconPath)
    }
    // In dev mode: watch icon file and refresh Dock icon on change
    if (VITE_DEV_SERVER_URL && process.platform === 'darwin') {
      fs.watch(iconPath, () => {
        try { app.dock.setIcon(iconPath) } catch {}
      })
    }
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// ── Notes IPC handlers ─────────────────────────────────────────────────────────

function getNotesDir() {
  const dir = path.join(app.getPath('userData'), 'supertools-notes')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

ipcMain.handle('notes:list', () => {
  const dir = getNotesDir()
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'))
      } catch {
        return null
      }
    })
    .filter(Boolean)
})

ipcMain.handle('notes:save', (_e, note) => {
  const dir = getNotesDir()
  fs.writeFileSync(path.join(dir, `${note.id}.json`), JSON.stringify(note, null, 2), 'utf-8')
  return true
})

ipcMain.handle('notes:delete', (_e, id: string) => {
  const filePath = path.join(getNotesDir(), `${id}.json`)
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  return true
})

// ── App ready ──────────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  app.setAboutPanelOptions({ applicationName: 'SuperTools', applicationVersion: '1.0.0' })

  // Replace default "Electron" menu with SuperTools menu on macOS
  if (process.platform === 'darwin') {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'SuperTools',
        submenu: [
          { role: 'about', label: 'About SuperTools' },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide', label: 'Hide SuperTools' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit', label: 'Quit SuperTools' },
        ],
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
          { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' },
        ],
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' }, { role: 'forceReload' },
          { type: 'separator' },
          { role: 'togglefullscreen' },
        ],
      },
      {
        label: 'Window',
        submenu: [{ role: 'minimize' }, { role: 'zoom' }, { role: 'front' }],
      },
    ]
    Menu.setApplicationMenu(Menu.buildFromTemplate(template))
  }

  createWindow()
})
