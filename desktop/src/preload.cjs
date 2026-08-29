'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('seedanceDesktop', {
  accounts: {
    list: () => ipcRenderer.invoke('accounts:list'),
    create: (name) => ipcRenderer.invoke('accounts:create', { name }),
    rename: (id, name) => ipcRenderer.invoke('accounts:rename', { id, name }),
    remove: (id, clearLocalSession = false) => ipcRenderer.invoke('accounts:remove', { id, clearLocalSession }),
    clearSession: (id) => ipcRenderer.invoke('accounts:clear-session', { id })
  },
  appInfo: () => ipcRenderer.invoke('app:info')
});
