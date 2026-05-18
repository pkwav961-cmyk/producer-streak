const { app, BrowserWindow, ipcMain, protocol } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';
const fs = require('fs');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'public/favicon.ico'), // Add an icon if you have one
    show: false
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173'); // Vite dev server
    mainWindow.webContents.openDevTools();
  } else {
    // In production, use file protocol to safely load the built index.html
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    mainWindow.loadURL(`file://${indexPath}`).catch((err) => {
      console.error('Failed to load index.html:', err);
    });

    // Open DevTools in production temporarily to capture renderer errors
    // (remove this in final release)
    try {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    } catch (err) {
      console.warn('Could not open DevTools:', err);
    }

    // Listen for renderer console messages and load failures to help debug white screen
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      console.log(`Renderer console [${level}] ${message} (${sourceId}:${line})`);
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      console.error('Renderer failed to load:', { errorCode, errorDescription, validatedURL, isMainFrame });
    });
    mainWindow.webContents.on('render-process-gone', (event, details) => {
      console.error('Render process gone:', details);
    });
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

app.whenReady().then(() => {
  // Register file protocol for safe file:// loading in packaged app
  protocol.registerFileProtocol('file', (request, callback) => {
    const pathname = decodeURI(request.url.replace('file:///', ''));
    callback(pathname);
  });
  createWindow();
});

// Listen for renderer logs and append them to a file in userData
ipcMain.on('renderer-log', (event, payload) => {
  try {
    const logDir = app.getPath('userData');
    const logFile = path.join(logDir, 'renderer-errors.log');
    const entry = `[${new Date().toISOString()}] ${typeof payload === 'string' ? payload : JSON.stringify(payload)}\n`;
    fs.appendFileSync(logFile, entry, { encoding: 'utf8' });
  } catch (err) {
    console.error('Failed to write renderer log:', err);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});