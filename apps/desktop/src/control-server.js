'use strict';

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

function controlDiscoveryPath() {
  const base = process.env.SEEDANCE_STUDIO_CONTROL_DIR
    || process.env.LOCALAPPDATA
    || process.env.APPDATA
    || path.join(os.homedir(), '.seedance-desktop-studio');
  return path.join(base, 'SeedanceDesktopStudio', 'control.json');
}

function writeJson(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store'
  });
  res.end(body);
}

function readJson(req, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(Object.assign(new Error('Request body too large'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (chunks.length === 0) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (_) {
        reject(Object.assign(new Error('Invalid JSON body'), { statusCode: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function routeParts(url) {
  const parsed = new URL(url, 'http://127.0.0.1');
  return parsed.pathname.split('/').filter(Boolean).map(decodeURIComponent);
}

async function startControlServer(handlers) {
  const token = crypto.randomBytes(32).toString('hex');
  const discoveryFile = controlDiscoveryPath();

  const server = http.createServer(async (req, res) => {
    const pathname = new URL(req.url || '/', 'http://127.0.0.1').pathname;
    if (pathname === '/health') {
      return writeJson(res, 200, await handlers.health());
    }

    const auth = String(req.headers.authorization || '');
    if (auth !== `Bearer ${token}`) {
      return writeJson(res, 401, { error: 'unauthorized' });
    }

    try {
      const parts = routeParts(req.url || '/');
      if (req.method === 'GET' && parts.join('/') === 'v1/accounts') {
        return writeJson(res, 200, { accounts: await handlers.listAccounts() });
      }
      if (req.method === 'POST' && parts.join('/') === 'v1/accounts') {
        const body = await readJson(req);
        return writeJson(res, 201, { account: await handlers.createAccount(body.name) });
      }
      if (req.method === 'POST' && parts.length === 4 && parts[0] === 'v1' && parts[1] === 'accounts' && parts[3] === 'activate') {
        return writeJson(res, 200, { account: await handlers.activateAccount(parts[2]) });
      }
      if (req.method === 'GET' && parts.join('/') === 'v1/providers') {
        return writeJson(res, 200, { providers: await handlers.listProviders() });
      }
      if (req.method === 'GET' && parts.join('/') === 'v1/tasks') {
        return writeJson(res, 200, { tasks: await handlers.listTasks() });
      }
      if (req.method === 'POST' && parts.join('/') === 'v1/tasks') {
        const body = await readJson(req);
        return writeJson(res, 201, { task: await handlers.createTask(body) });
      }
      if (parts.length === 3 && parts[0] === 'v1' && parts[1] === 'tasks' && req.method === 'GET') {
        const task = await handlers.getTask(parts[2]);
        if (!task) return writeJson(res, 404, { error: 'task_not_found' });
        return writeJson(res, 200, { task });
      }
      if (parts.length === 4 && parts[0] === 'v1' && parts[1] === 'tasks' && parts[3] === 'cancel' && req.method === 'POST') {
        const task = await handlers.cancelTask(parts[2]);
        if (!task) return writeJson(res, 404, { error: 'task_not_found' });
        return writeJson(res, 200, { task });
      }
      if (parts.length === 4 && parts[0] === 'v1' && parts[1] === 'tasks' && parts[3] === 'dispatch' && req.method === 'POST') {
        const result = await handlers.dispatchTask(parts[2]);
        return writeJson(res, result.ok ? 200 : (result.statusCode || 409), result);
      }

      return writeJson(res, 404, { error: 'not_found' });
    } catch (error) {
      return writeJson(res, Number(error.statusCode) || 500, {
        error: error.code || 'control_error',
        message: error.message || String(error)
      });
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  const info = {
    host: '127.0.0.1',
    port: address.port,
    token,
    pid: process.pid,
    version: 1,
    startedAt: Date.now()
  };

  fs.mkdirSync(path.dirname(discoveryFile), { recursive: true });
  fs.writeFileSync(discoveryFile, JSON.stringify(info, null, 2), { encoding: 'utf8', mode: 0o600 });

  function stop() {
    try {
      const current = JSON.parse(fs.readFileSync(discoveryFile, 'utf8'));
      if (Number(current.pid) === process.pid) fs.unlinkSync(discoveryFile);
    } catch (_) {}
    return new Promise((resolve) => server.close(resolve));
  }

  return { server, info, discoveryFile, stop };
}

module.exports = { startControlServer, controlDiscoveryPath };
