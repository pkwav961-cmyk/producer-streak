const { contextBridge, ipcRenderer } = require('electron');

// Expose a minimal logging API to the renderer and capture global errors
contextBridge.exposeInMainWorld('electronAPI', {
  log: (payload) => ipcRenderer.send('renderer-log', payload),
});

// Catch uncaught errors in the renderer and forward to main for persistence
window.addEventListener('error', (event) => {
  try {
    ipcRenderer.send('renderer-log', {
      level: 'error',
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error ? event.error.stack : null,
      ts: Date.now(),
    });
  } catch (e) {
    // ignore
  }
});

window.addEventListener('unhandledrejection', (event) => {
  try {
    ipcRenderer.send('renderer-log', {
      level: 'error',
      message: event.reason?.message || String(event.reason),
      stack: event.reason?.stack || null,
      ts: Date.now(),
    });
  } catch (e) {
    // ignore
  }
});