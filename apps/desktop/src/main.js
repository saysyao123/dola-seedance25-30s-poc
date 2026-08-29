'use strict';

const { app, BrowserWindow, ipcMain, session } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let mainWindow = null;

function dataPath() {
  return path.join(app.getPath('userData'), 'accounts.json');
}

function normalizeAccount(value) {
  if (!value || typeof value !== 'object') return null;
  const id = String(value.id || '').trim();
  if (!/^[a-zA-Z0-9_-]{6,80}$/.test(id)) return null;
  const name = String(value.name || 'Dola Account').replace(/[\r\n\t]/g, ' ').trim().slice(0, 80) || 'Dola Account';
  return {
    id,
    name,
    partition: `persist:dola_${id}`,
    createdAt: Number(value.createdAt) || Date.now()
  };
}

function loadAccounts() {
  try {
    const parsed = JSON.parse(fs.readFileSync(dataPath(), 'utf8'));
    if (!Array.isArray(parsed.accounts)) return [];
    return parsed.accounts.map(normalizeAccount).filter(Boolean);
  } catch (_) {
    return [];
  }
}

function saveAccounts(accounts) {
  const clean = accounts.map(normalizeAccount).filter(Boolean);
  fs.mkdirSync(path.dirname(dataPath()), { recursive: true });
  fs.writeFileSync(dataPath(), JSON.stringify({ accounts: clean }, null, 2), 'utf8');
  return clean;
}

function createAccount(name) {
  const accounts = loadAccounts();
  const account = normalizeAccount({
    id: crypto.randomUUID().replace(/-/g, ''),
    name,
    createdAt: Date.now()
  });
  accounts.push(account);
  saveAccounts(accounts);
  return account;
}

async function clearAccountSession(accountId) {
  const account = loadAccounts().find(item => item.id === String(accountId || ''));
  if (!account) return false;
  const ses = session.fromPartition(account.partition);
  await ses.clearStorageData();
  await ses.clearCache();
  return true;
}

function deleteAccount(accountId) {
  const id = String(accountId || '');
  const before = loadAccounts();
  const account = before.find(item => item.id === id);
  const after = before.filter(item => item.id !== id);
  saveAccounts(after);
  return account || null;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1050,
    minHeight: 700,
    title: 'Seedance Desktop Studio',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  ipcMain.handle('accounts:list', () => loadAccounts());
  ipcMain.handle('accounts:add', (_event, name) => createAccount(name));
  ipcMain.handle('accounts:remove', async (_event, id, clearSession) => {
    if (clearSession === true) await clearAccountSession(id);
    return deleteAccount(id);
  });
  ipcMain.handle('accounts:clear-session', (_event, id) => clearAccountSession(id));

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
