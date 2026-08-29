'use strict';

const api = window.seedanceDesktop;
const accountsNode = document.getElementById('accounts');
const webviewsNode = document.getElementById('webviews');
const emptyBrowser = document.getElementById('empty-browser');
const activeAccountNode = document.getElementById('active-account');
const addButton = document.getElementById('add-account');
const reloadButton = document.getElementById('reload-account');
const clearButton = document.getElementById('clear-session');

let accounts = [];
let activeId = '';
let dolaHome = 'https://www.dola.com/chat/';
const webviews = new Map();

function byId(id) {
  return accounts.find(account => account.id === id) || null;
}

function renderAccounts() {
  accountsNode.replaceChildren();
  for (const account of accounts) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = `account-row${account.id === activeId ? ' active' : ''}`;

    const dot = document.createElement('span');
    dot.className = 'account-dot';
    const label = document.createElement('span');
    label.className = 'account-label';
    label.textContent = account.name;

    row.append(dot, label);
    row.addEventListener('click', () => activate(account.id));
    row.addEventListener('contextmenu', async event => {
      event.preventDefault();
      const next = window.prompt('修改账号名称', account.name);
      if (next == null) return;
      const result = await api.accounts.rename(account.id, next);
      if (result && result.ok) await refreshAccounts(false);
    });
    accountsNode.append(row);
  }
}

function ensureWebview(account) {
  if (webviews.has(account.id)) return webviews.get(account.id);

  const webview = document.createElement('webview');
  webview.className = 'dola-webview';
  webview.setAttribute('partition', account.partition);
  webview.setAttribute('allowpopups', '');
  webview.setAttribute('webpreferences', 'contextIsolation=yes,nodeIntegration=no,sandbox=yes');
  webview.src = dolaHome;
  webview.dataset.accountId = account.id;

  webview.addEventListener('did-start-loading', () => {
    if (activeId === account.id) activeAccountNode.textContent = `${account.name} · 加载中…`;
  });
  webview.addEventListener('did-stop-loading', () => {
    if (activeId === account.id) activeAccountNode.textContent = `${account.name} · Dola`;
  });
  webview.addEventListener('did-fail-load', event => {
    if (event.errorCode === -3) return;
    if (activeId === account.id) {
      activeAccountNode.textContent = `${account.name} · 加载失败 (${event.errorCode})`;
    }
  });

  webviewsNode.append(webview);
  webviews.set(account.id, webview);
  return webview;
}

function activate(id) {
  const account = byId(id);
  if (!account) return;
  activeId = id;
  emptyBrowser.hidden = true;
  for (const [accountId, webview] of webviews.entries()) {
    webview.classList.toggle('visible', accountId === id);
  }
  const current = ensureWebview(account);
  current.classList.add('visible');
  activeAccountNode.textContent = `${account.name} · Dola`;
  renderAccounts();
}

async function refreshAccounts(chooseFirst = true) {
  accounts = await api.accounts.list();
  if (activeId && !byId(activeId)) activeId = '';
  if (!activeId && chooseFirst && accounts.length) activeId = accounts[0].id;
  renderAccounts();
  if (activeId) activate(activeId);
  else {
    activeAccountNode.textContent = '尚未选择账号';
    emptyBrowser.hidden = false;
  }
}

addButton.addEventListener('click', async () => {
  const suggested = `Dola ${accounts.length + 1}`;
  const name = window.prompt('给这个账号起个名字', suggested);
  if (name == null) return;
  const account = await api.accounts.create(name);
  await refreshAccounts(false);
  activate(account.id);
});

reloadButton.addEventListener('click', () => {
  const webview = webviews.get(activeId);
  if (webview) webview.reload();
});

clearButton.addEventListener('click', async () => {
  const account = byId(activeId);
  if (!account) return;
  const ok = window.confirm(`确认清除「${account.name}」在本机保存的 Dola 登录态？\n这不会删除 Dola 账号，只会清除此软件中的本地 Session。`);
  if (!ok) return;
  await api.accounts.clearSession(account.id);
  const webview = webviews.get(account.id);
  if (webview) webview.src = dolaHome;
});

(async () => {
  if (!api) throw new Error('Desktop preload API unavailable');
  const info = await api.appInfo();
  if (info && info.dolaHome) dolaHome = info.dolaHome;
  await refreshAccounts(true);
})();
