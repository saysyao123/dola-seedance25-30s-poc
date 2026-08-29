'use strict';

const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DOLA_HOME = 'https://www.dola.com/chat/';

function accountFile() {
  return path.join(app.getPath('userData'), 'accounts.json');
}

function readAccounts() {
  try {
    const value = JSON.parse(fs.readFileSync(accountFile(), 'utf8'));
    return Array.isArray(value) ? value.filter(Boolean) : [];
  } catch (_) {
    return [];
  }
}

function writeAccounts(accounts) {
  fs.mkdirSync(path.dirname(accountFile()), { recursive: true });
  fs.writeFileSync(accountFile(), JSON.stringify(accounts, null, 2), 'utf8');
}

function cleanName(value) {
  const name = String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 60);
  return name || 'Dola Account';
}

function publicAccount(account) {
  return {
    id: account.id,
    name: account.name,
    partition: account.partition,
    enabled: account.enabled !== false,
    createdAt: account.createdAt || 0
  };
}

function createAccountRecord(name) {
  const id = crypto.randomUUID();
  return {
    id,
    name: cleanName(name),
    partition: `persist:seedance-account-${id}`,
    enabled: true,
    createdAt: Date.now()
  };
}

async function clearAccountStorage(account) {
  if (!account || !account.partition) return;
  const ses = session.fromPartition(account.partition);
  await ses.clearStorageData();
  await ses.clearCache();
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1120,
    minHeight: 700,
    backgroundColor: '#111318',
    title: 'Seedance Desktop Studio — D0',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: true
    }
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  return win;
}

function installIpc() {
  ipcMain.handle('accounts:list', async () => readAccounts().map(publicAccount));

  ipcMain.handle('accounts:create', async (_event, input) => {
    const accounts = readAccounts();
    const account = createAccountRecord(input && input.name);
    accounts.push(account);
    writeAccounts(accounts);
    return publicAccount(account);
  });

  ipcMain.handle('accounts:rename', async (_event, input) => {
    const accounts = readAccounts();
    const account = accounts.find(item => item && item.id === String(input && input.id || ''));
    if (!account) return { ok: false, message: 'Account not found' };
    account.name = cleanName(input && input.name);
    writeAccounts(accounts);
    return { ok: true, account: publicAccount(account) };
  });

  ipcMain.handle('accounts:remove', async (_event, input) => {
    const id = String(input && input.id || '');
    const accounts = readAccounts();
    const index = accounts.findIndex(item => item && item.id === id);
    if (index < 0) return { ok: false, message: 'Account not found' };
    const [account] = accounts.splice(index, 1);
    writeAccounts(accounts);
    if (input && input.clearLocalSession === true) {
      await clearAccountStorage(account);
    }
    return { ok: true };
  });

  ipcMain.handle('accounts:clear-session', async (_event, input) => {
    const account = readAccounts().find(item => item && item.id === String(input && input.id || ''));
    if (!account) return { ok: false, message: 'Account not found' };
    await clearAccountStorage(account);
    return { ok: true };
  });

  ipcMain.handle('app:info', async () => ({
    dolaHome: DOLA_HOME,
    userDataPath: app.getPath('userData')
  }));
}

app.whenReady().then(() => {
  installIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
