#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function discoveryPath() {
  const base = process.env.SEEDANCE_STUDIO_CONTROL_DIR
    || process.env.LOCALAPPDATA
    || process.env.APPDATA
    || path.join(os.homedir(), '.seedance-desktop-studio');
  return path.join(base, 'SeedanceDesktopStudio', 'control.json');
}

function readDiscovery() {
  try {
    const parsed = JSON.parse(fs.readFileSync(discoveryPath(), 'utf8'));
    if (!parsed.port || !parsed.token) throw new Error('Incomplete control discovery file.');
    return parsed;
  } catch (error) {
    fail('Seedance Desktop Studio is not running or its control file is unavailable.', { cause: error.message });
  }
}

async function request(method, route, body) {
  const discovery = readDiscovery();
  const response = await fetch(`http://127.0.0.1:${discovery.port}${route}`, {
    method,
    headers: {
      authorization: `Bearer ${discovery.token}`,
      ...(body === undefined ? {} : { 'content-type': 'application/json' })
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    fail(payload.message || payload.error || `HTTP ${response.status}`, { status: response.status, ...payload });
  }
  return payload;
}

function parseFlags(tokens) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!token.startsWith('--')) {
      positional.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = tokens[i + 1];
    if (next === undefined || next.startsWith('--')) flags[key] = true;
    else {
      flags[key] = next;
      i += 1;
    }
  }
  return { flags, positional };
}

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function fail(message, detail = {}) {
  process.stderr.write(`${JSON.stringify({ ok: false, error: message, ...detail }, null, 2)}\n`);
  process.exit(1);
}

function requireFlag(flags, key) {
  const value = flags[key];
  if (value === undefined || value === true || String(value).trim() === '') fail(`Missing --${key}`);
  return String(value);
}

async function resolveAccount(value) {
  const { accounts } = await request('GET', '/v1/accounts');
  const exact = accounts.find(item => item.id === value);
  if (exact) return exact;
  const byName = accounts.filter(item => item.name.toLowerCase() === value.toLowerCase());
  if (byName.length === 1) return byName[0];
  if (byName.length > 1) fail('Account name is ambiguous; use the account id.', { matches: byName });
  fail('Account not found.', { account: value });
}

async function watchTask(id, intervalMs) {
  const terminal = new Set(['success', 'failed', 'cancelled']);
  while (true) {
    const payload = await request('GET', `/v1/tasks/${encodeURIComponent(id)}`);
    print(payload);
    if (terminal.has(payload.task.state)) return;
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
}

async function main() {
  const args = process.argv.slice(2);
  const [group, action, ...rest] = args;
  const { flags, positional } = parseFlags(rest);

  if (group === 'health') return print(await request('GET', '/health'));
  if (group === 'providers' && action === 'list') return print(await request('GET', '/v1/providers'));

  if (group === 'accounts' && action === 'list') return print(await request('GET', '/v1/accounts'));
  if (group === 'accounts' && action === 'add') {
    const name = flags.name === undefined ? positional.join(' ') : String(flags.name);
    if (!name.trim()) fail('Usage: accounts add --name "Dola A"');
    return print(await request('POST', '/v1/accounts', { name }));
  }
  if (group === 'accounts' && action === 'open') {
    const selector = String(flags.account || positional[0] || '').trim();
    if (!selector) fail('Usage: accounts open --account <id-or-name>');
    const account = await resolveAccount(selector);
    return print(await request('POST', `/v1/accounts/${encodeURIComponent(account.id)}/activate`, {}));
  }

  if (group === 'tasks' && action === 'list') return print(await request('GET', '/v1/tasks'));
  if (group === 'tasks' && action === 'get') {
    const id = String(flags.id || positional[0] || '').trim();
    if (!id) fail('Usage: tasks get --id <task-id>');
    return print(await request('GET', `/v1/tasks/${encodeURIComponent(id)}`));
  }
  if (group === 'tasks' && action === 'create') {
    const selector = requireFlag(flags, 'account');
    const account = await resolveAccount(selector);
    const prompt = requireFlag(flags, 'prompt');
    const body = {
      accountId: account.id,
      provider: String(flags.provider || 'dola-web'),
      mode: String(flags.mode || 't2v'),
      model: String(flags.model || 'seedance-v2.5'),
      duration: Number(flags.duration || 10),
      ratio: String(flags.ratio || '9:16'),
      prompt
    };
    return print(await request('POST', '/v1/tasks', body));
  }
  if (group === 'tasks' && action === 'dispatch') {
    const id = String(flags.id || positional[0] || '').trim();
    if (!id) fail('Usage: tasks dispatch --id <task-id>');
    return print(await request('POST', `/v1/tasks/${encodeURIComponent(id)}/dispatch`, {}));
  }
  if (group === 'tasks' && action === 'cancel') {
    const id = String(flags.id || positional[0] || '').trim();
    if (!id) fail('Usage: tasks cancel --id <task-id>');
    return print(await request('POST', `/v1/tasks/${encodeURIComponent(id)}/cancel`, {}));
  }
  if (group === 'tasks' && action === 'watch') {
    const id = String(flags.id || positional[0] || '').trim();
    if (!id) fail('Usage: tasks watch --id <task-id> [--interval 5000]');
    const interval = Math.max(1000, Number(flags.interval || 5000));
    return watchTask(id, interval);
  }

  fail('Unknown command.', {
    commands: [
      'health',
      'providers list',
      'accounts list',
      'accounts add --name "Dola A"',
      'accounts open --account "Dola A"',
      'tasks list',
      'tasks create --account "Dola A" --duration 30 --ratio 9:16 --prompt "..."',
      'tasks get --id <task-id>',
      'tasks dispatch --id <task-id>',
      'tasks cancel --id <task-id>',
      'tasks watch --id <task-id>'
    ]
  });
}

main().catch(error => fail(error.message || String(error), { stack: error.stack }));
