'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('seedanceDesktop', {
  listAccounts: () => ipcRenderer.invoke('accounts:list'),
  addAccount: (name) => ipcRenderer.invoke('accounts:add', String(name || '')),
  removeAccount: (id, clearSession = false) => ipcRenderer.invoke('accounts:remove', String(id || ''), clearSession === true),
  clearAccountSession: (id) => ipcRenderer.invoke('accounts:clear-session', String(id || '')),
  capacityReport: () => ipcRenderer.invoke('capacity:report'),
  recordCapacityJob: (payload) => ipcRenderer.invoke('capacity:record-job', payload),
  recordCapacityProviderState: (payload) => ipcRenderer.invoke('capacity:provider-state', payload),
  nextCapacityAccount: (afterAccountId) => ipcRenderer.invoke('capacity:next-account', String(afterAccountId || ''))
});
