'use strict';

const accountsEl = document.getElementById('accounts');
const webviewsEl = document.getElementById('webviews');
const emptyEl = document.getElementById('empty');
const addButton = document.getElementById('addAccount');
const reloadButton = document.getElementById('reload');
const clearButton = document.getElementById('clearSession');
const activeNameEl = document.getElementById('activeName');
const statusEl = document.getElementById('status');

const views = new Map();
let accounts = [];
let activeId = '';

function accountById(id) {
  return accounts.find(item => item.id === id) || null;
}

function ensureWebview(account) {
  if (views.has(account.id)) return views.get(account.id);

  const wrapper = document.createElement('div');
  wrapper.className = 'webview-wrapper';
  wrapper.dataset.accountId = account.id;

  const webview = document.createElement('webview');
  webview.src = 'https://www.dola.com/chat/';
  webview.partition = account.partition;
  webview.setAttribute('allowpopups', '');
  webview.setAttribute('webpreferences', 'contextIsolation=yes');

  webview.addEventListener('did-start-loading', () => {
    if (activeId === account.id) statusEl.textContent = 'Dola 页面加载中…';
  });
  webview.addEventListener('did-stop-loading', () => {
    if (activeId === account.id) statusEl.textContent = 'Dola 会话已加载；请直接在页面内登录或使用。';
  });
  webview.addEventListener('did-fail-load', (event) => {
    if (activeId === account.id && Number(event.errorCode) !== -3) {
      statusEl.textContent = `Dola 页面加载失败：${event.errorDescription || event.errorCode}`;
    }
  });

  wrapper.appendChild(webview);
  webviewsEl.appendChild(wrapper);
  views.set(account.id, { wrapper, webview });
  return views.get(account.id);
}

function setActiveAccount(id) {
  activeId = id;
  const account = accountById(id);
  document.querySelectorAll('.account-card').forEach(el => {
    el.classList.toggle('active', el.dataset.accountId === id);
  });
  for (const [accountId, view] of views.entries()) {
    view.wrapper.classList.toggle('active', accountId === id);
  }

  if (!account) {
    emptyEl.hidden = false;
    activeNameEl.textContent = '尚未选择账号';
    statusEl.textContent = '添加账号后即可在独立 Dola 会话中登录';
    reloadButton.disabled = true;
    clearButton.disabled = true;
    return;
  }

  emptyEl.hidden = true;
  const view = ensureWebview(account);
  view.wrapper.classList.add('active');
  activeNameEl.textContent = account.name;
  statusEl.textContent = '独立 Dola 会话已打开；登录状态由 Chromium partition 持久保存。';
  reloadButton.disabled = false;
  clearButton.disabled = false;
}

function renderAccounts() {
  accountsEl.replaceChildren();
  for (const account of accounts) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'account-card';
    card.dataset.accountId = account.id;
    card.innerHTML = `<span class="dot"></span><span class="account-copy"><strong></strong><small>独立会话</small></span>`;
    card.querySelector('strong').textContent = account.name;
    card.addEventListener('click', () => setActiveAccount(account.id));
    accountsEl.appendChild(card);
    ensureWebview(account);
  }
  if (activeId && accountById(activeId)) setActiveAccount(activeId);
  else if (accounts[0]) setActiveAccount(accounts[0].id);
  else setActiveAccount('');
}

async function refreshAccounts() {
  accounts = await window.seedanceDesktop.listAccounts();
  renderAccounts();
}

addButton.addEventListener('click', async () => {
  const suggested = `Dola ${accounts.length + 1}`;
  const name = window.prompt('给这个 Dola 账号起个名字：', suggested);
  if (name == null) return;
  const account = await window.seedanceDesktop.addAccount(name);
  await refreshAccounts();
  setActiveAccount(account.id);
});

reloadButton.addEventListener('click', () => {
  const view = views.get(activeId);
  if (view) view.webview.reload();
});

clearButton.addEventListener('click', async () => {
  const account = accountById(activeId);
  if (!account) return;
  const confirmed = window.confirm(`确定清除“${account.name}”的本地 Dola 登录会话吗？\n\n不会删除其他账号。`);
  if (!confirmed) return;
  await window.seedanceDesktop.clearAccountSession(account.id);
  const view = views.get(account.id);
  if (view) view.webview.loadURL('https://www.dola.com/chat/');
  statusEl.textContent = '该账号本地会话已清除，请重新登录。';
});

refreshAccounts().catch(error => {
  console.error(error);
  statusEl.textContent = '无法读取账号配置。';
});
