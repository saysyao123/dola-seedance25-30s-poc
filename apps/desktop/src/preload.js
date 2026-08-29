'use strict';

const { contextBridge, ipcRenderer } = require('electron');

function subscribe(channel, callback) {
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('seedanceDesktop', {
  listAccounts: () => ipcRenderer.invoke('accounts:list'),
  addAccount: (name) => ipcRenderer.invoke('accounts:add', String(name || '')),
  removeAccount: (id, clearSession = false) => ipcRenderer.invoke('accounts:remove', String(id || ''), clearSession === true),
  clearAccountSession: (id) => ipcRenderer.invoke('accounts:clear-session', String(id || '')),
  activateAccount: (id) => ipcRenderer.invoke('accounts:activate', String(id || '')),
  listProviders: () => ipcRenderer.invoke('providers:list'),
  listTasks: () => ipcRenderer.invoke('tasks:list'),
  createTask: (input) => ipcRenderer.invoke('tasks:create', input || {}),
  getTask: (id) => ipcRenderer.invoke('tasks:get', String(id || '')),
  cancelTask: (id) => ipcRenderer.invoke('tasks:cancel', String(id || '')),
  dispatchTask: (id) => ipcRenderer.invoke('tasks:dispatch', String(id || '')),
  onActivateAccount: (callback) => subscribe('control:activate-account', callback),
  onAccountsChanged: (callback) => subscribe('accounts:changed', callback),
  onTasksChanged: (callback) => subscribe('tasks:changed', callback)
});
