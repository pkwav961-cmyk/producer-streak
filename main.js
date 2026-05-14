import { app, BrowserWindow } from 'electron';
import { autoUpdater } from "electron-updater";
import path from 'path';

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false // Required for some older updater logic
    }
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    win.loadURL('http://localhost:3000');
  } else {
    win.loadFile(path.join(app.getAppPath(), 'dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();
  
  // Only check for updates if the app is actually installed/packaged
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify();
  }
});