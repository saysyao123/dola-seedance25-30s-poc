'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('seedanceDesktop', {
  listAccounts: () => ipcRenderer.invoke('accounts:list'),
  addAccount: (name) => ipcRenderer.invoke('accounts:add', String(name || '')),
  removeAccount: (id, clearSession = false) => ipcRenderer.invoke('accounts:remove', String(id || ''), clearSession === true),
  clearAccountSession: (id) => ipcRenderer.invoke('accounts:clear-session', String(id || ''))
});
