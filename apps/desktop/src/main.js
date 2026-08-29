'use strict';

const { app, BrowserWindow, ipcMain, session } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { startControlServer } = require('./control-server');

let mainWindow = null;
let controlRuntime = null;

function accountsPath() {
  return path.join(app.getPath('userData'), 'accounts.json');
}

function tasksPath() {
  return path.join(app.getPath('userData'), 'tasks.json');
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
    const parsed = JSON.parse(fs.readFileSync(accountsPath(), 'utf8'));
    if (!Array.isArray(parsed.accounts)) return [];
    return parsed.accounts.map(normalizeAccount).filter(Boolean);
  } catch (_) {
    return [];
  }
}

function saveAccounts(accounts) {
  const clean = accounts.map(normalizeAccount).filter(Boolean);
  fs.mkdirSync(path.dirname(accountsPath()), { recursive: true });
  fs.writeFileSync(accountsPath(), JSON.stringify({ accounts: clean }, null, 2), 'utf8');
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
  emit('accounts:changed', accounts);
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
  emit('accounts:changed', after);
  return account || null;
}

function loadTasks() {
  try {
    const parsed = JSON.parse(fs.readFileSync(tasksPath(), 'utf8'));
    return Array.isArray(parsed.tasks) ? parsed.tasks.filter(Boolean) : [];
  } catch (_) {
    return [];
  }
}

function saveTasks(tasks) {
  fs.mkdirSync(path.dirname(tasksPath()), { recursive: true });
  fs.writeFileSync(tasksPath(), JSON.stringify({ tasks }, null, 2), 'utf8');
  emit('tasks:changed', tasks);
  return tasks;
}

function listProviders() {
  return [
    {
      id: 'dola-web',
      label: 'Dola Web',
      state: 'experimental',
      dispatchReady: false,
      gate: 'D2',
      capabilities: { t2v: true, i2v: 'unknown', durationSeconds: [10, 30] },
      note: 'Account/session control is ready. Automatic Seedance submission stays disabled until the real D2 request lifecycle is observed and verified.'
    },
    {
      id: 'byteplus-seedance',
      label: 'BytePlus Seedance',
      state: 'planned',
      dispatchReady: false,
      gate: 'provider-config',
      capabilities: { t2v: true, i2v: true, durationRangeSeconds: [4, 30] },
      note: 'Official provider adapter placeholder; API credential configuration is not implemented in this branch.'
    }
  ];
}

function badRequest(message) {
  return Object.assign(new Error(message), { statusCode: 400, code: 'bad_request' });
}

function normalizeTask(input) {
  if (!input || typeof input !== 'object') throw badRequest('Task body is required.');
  const accountId = String(input.accountId || '').trim();
  if (!loadAccounts().some(item => item.id === accountId)) throw badRequest('Unknown accountId.');
  const prompt = String(input.prompt || '').trim();
  if (!prompt || prompt.length > 20000) throw badRequest('prompt must contain 1-20000 characters.');
  const duration = Number(input.duration || 10);
  if (!Number.isInteger(duration) || duration < 4 || duration > 30) throw badRequest('duration must be an integer from 4 to 30 seconds.');
  const ratio = String(input.ratio || '9:16').trim();
  if (!/^\d{1,3}:\d{1,3}$/.test(ratio)) throw badRequest('ratio must look like 9:16 or 16:9.');
  const mode = String(input.mode || 't2v');
  if (!['t2v', 'i2v', 'multi'].includes(mode)) throw badRequest('mode must be t2v, i2v, or multi.');
  const provider = String(input.provider || 'dola-web');
  if (!listProviders().some(item => item.id === provider)) throw badRequest('Unknown provider.');
  const now = Date.now();
  return {
    id: crypto.randomUUID().replace(/-/g, ''),
    accountId,
    provider,
    mode,
    model: String(input.model || 'seedance-v2.5').slice(0, 120),
    duration,
    ratio,
    prompt,
    state: 'queued',
    blockedReason: provider === 'dola-web' ? 'D2_GATE_NOT_PASSED' : 'PROVIDER_NOT_CONFIGURED',
    createdAt: now,
    updatedAt: now
  };
}

function createTask(input) {
  const tasks = loadTasks();
  const task = normalizeTask(input);
  tasks.unshift(task);
  saveTasks(tasks.slice(0, 1000));
  return task;
}

function getTask(id) {
  return loadTasks().find(item => item.id === String(id || '')) || null;
}

function cancelTask(id) {
  const tasks = loadTasks();
  const index = tasks.findIndex(item => item.id === String(id || ''));
  if (index < 0) return null;
  const task = tasks[index];
  if (['success', 'failed', 'cancelled'].includes(task.state)) return task;
  tasks[index] = { ...task, state: 'cancelled', blockedReason: null, updatedAt: Date.now() };
  saveTasks(tasks);
  return tasks[index];
}

function dispatchTask(id) {
  const task = getTask(id);
  if (!task) return { ok: false, statusCode: 404, error: 'task_not_found' };
  const provider = listProviders().find(item => item.id === task.provider);
  if (!provider || provider.dispatchReady !== true) {
    return {
      ok: false,
      statusCode: 409,
      error: task.provider === 'dola-web' ? 'D2_GATE_NOT_PASSED' : 'PROVIDER_NOT_CONFIGURED',
      message: task.provider === 'dola-web'
        ? 'Dola automatic submission is intentionally blocked until the D2 10s baseline lifecycle is observed and verified on the user session.'
        : 'This provider is not configured yet.',
      task
    };
  }
  return { ok: false, statusCode: 501, error: 'provider_dispatch_not_implemented', task };
}

function emit(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload);
}

function activateAccount(id) {
  const account = loadAccounts().find(item => item.id === String(id || ''));
  if (!account) throw Object.assign(new Error('Unknown accountId.'), { statusCode: 404, code: 'account_not_found' });
  emit('control:activate-account', account.id);
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show();
  return account;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1560,
    height: 920,
    minWidth: 1180,
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

function registerIpc() {
  ipcMain.handle('accounts:list', () => loadAccounts());
  ipcMain.handle('accounts:add', (_event, name) => createAccount(name));
  ipcMain.handle('accounts:remove', async (_event, id, clearSession) => {
    if (clearSession === true) await clearAccountSession(id);
    return deleteAccount(id);
  });
  ipcMain.handle('accounts:clear-session', (_event, id) => clearAccountSession(id));
  ipcMain.handle('accounts:activate', (_event, id) => activateAccount(id));
  ipcMain.handle('providers:list', () => listProviders());
  ipcMain.handle('tasks:list', () => loadTasks());
  ipcMain.handle('tasks:create', (_event, input) => createTask(input));
  ipcMain.handle('tasks:get', (_event, id) => getTask(id));
  ipcMain.handle('tasks:cancel', (_event, id) => cancelTask(id));
  ipcMain.handle('tasks:dispatch', (_event, id) => dispatchTask(id));
}

async function startCodexControlPlane() {
  controlRuntime = await startControlServer({
    health: async () => ({
      ok: true,
      service: 'seedance-desktop-studio',
      version: 1,
      pid: process.pid,
      gates: { D0: 'implemented-not-user-verified', D1: 'pending-user-test', D2: 'pending', D3: 'pending' }
    }),
    listAccounts: async () => loadAccounts(),
    createAccount: async (name) => createAccount(name),
    activateAccount: async (id) => activateAccount(id),
    listProviders: async () => listProviders(),
    listTasks: async () => loadTasks(),
    createTask: async (input) => createTask(input),
    getTask: async (id) => getTask(id),
    cancelTask: async (id) => cancelTask(id),
    dispatchTask: async (id) => dispatchTask(id)
  });
  console.log(`[Seedance Desktop] Codex control plane: http://${controlRuntime.info.host}:${controlRuntime.info.port}`);
}

app.whenReady().then(async () => {
  registerIpc();
  createWindow();
  await startCodexControlPlane();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  if (controlRuntime) controlRuntime.stop().catch(() => {});
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
