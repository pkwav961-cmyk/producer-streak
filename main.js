const { app, BrowserWindow } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

const express = require('express');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    autoHideMenuBar: true,
    title: 'Producer Streak',
    icon: path.join(__dirname, 'build', 'icon.png')
  });

  // Start local server to fix Firebase Unauthorized Domain error (file:// protocol issue)
  const server = express();
  server.use(express.static(path.join(__dirname, 'dist')));
  server.use(express.json());

  // Proxy resend emails to bypass CORS in Electron
  server.post('/api/resend', async (req, res) => {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': req.headers.authorization,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(req.body)
      });
      const data = await response.text();
      res.status(response.status).send(data);
    } catch (e) {
      res.status(500).send(e.message);
    }
  });

  // Handle React Router fallback
  server.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });

  const listener = server.listen(0, '127.0.0.1', () => {
    const port = listener.address().port;
    win.loadURL(`http://127.0.0.1:${port}`);
  });

  // Automatically check for updates and notify the user
  autoUpdater.checkForUpdatesAndNotify();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});