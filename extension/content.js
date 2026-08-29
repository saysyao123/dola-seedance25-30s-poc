(() => {
  if (window.__DOLA_SEEDANCE_POC_PANEL__) return;
  window.__DOLA_SEEDANCE_POC_PANEL__ = true;

  const state = {
    capturing: false,
    events: [],
    collapsed: false,
  };

  const MAX_EVENTS = 500;

  const hook = document.createElement('script');
  hook.src = chrome.runtime.getURL('page-hook.js');
  hook.async = false;
  (document.documentElement || document.head).appendChild(hook);
  hook.onload = () => hook.remove();

  function loadState() {
    chrome.storage.local.get(['dolaPocCapturing', 'dolaPocEvents'], (result) => {
      state.capturing = Boolean(result.dolaPocCapturing);
      state.events = Array.isArray(result.dolaPocEvents) ? result.dolaPocEvents.slice(-MAX_EVENTS) : [];
      render();
    });
  }

  function persist() {
    chrome.storage.local.set({
      dolaPocCapturing: state.capturing,
      dolaPocEvents: state.events.slice(-MAX_EVENTS),
    });
  }

  function count(kind) {
    return state.events.filter((e) => e.kind === kind).length;
  }

  function latestVideoRequest() {
    return [...state.events].reverse().find((e) => e.kind === 'request');
  }

  function summarizeRequest(event) {
    if (!event) return '暂无记录';
    const body = event.body && typeof event.body === 'object' ? event.body : {};
    const text = JSON.stringify(body);
    const model = text.match(/seedance[^"\\]*|seedance_v[^"\\]*/i)?.[0] || '未识别';
    const duration = text.match(/"duration"\s*:\s*"?(\d+)/i)?.[1] || '未识别';
    return `模型：${model} · 时长：${duration}s`;
  }

  function downloadJson() {
    const payload = {
      exportedAt: new Date().toISOString(),
      page: location.origin,
      note: 'Sanitized POC capture. No cookies or authorization headers are collected by this extension.',
      events: state.events,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dola-seedance25-sanitized-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function ensurePanel() {
    if (document.getElementById('dola-poc-panel')) return;
    const panel = document.createElement('section');
    panel.id = 'dola-poc-panel';
    panel.setAttribute('aria-label', 'Dola Seedance 2.5 测试控制台');
    panel.innerHTML = `
      <div class="dola-poc-head">
        <div>
          <div class="dola-poc-title">Seedance 2.5 控制台</div>
          <div class="dola-poc-sub">直接在 Dola 页面测试</div>
        </div>
        <button type="button" id="dola-poc-collapse" class="dola-poc-icon" aria-label="收起面板">−</button>
      </div>
      <div id="dola-poc-body">
        <div class="dola-poc-state">
          <span id="dola-poc-dot"></span>
          <strong id="dola-poc-state-text">未开始记录</strong>
        </div>
        <div class="dola-poc-actions">
          <button type="button" id="dola-poc-toggle" class="dola-poc-primary">开始记录</button>
          <button type="button" id="dola-poc-clear">清空</button>
          <button type="button" id="dola-poc-export">导出记录</button>
        </div>
        <div class="dola-poc-grid">
          <div><span>请求</span><strong id="dola-poc-req">0</strong></div>
          <div><span>响应</span><strong id="dola-poc-res">0</strong></div>
        </div>
        <div class="dola-poc-latest">
          <div class="dola-poc-label">最近一次候选视频请求</div>
          <div id="dola-poc-latest-text">暂无记录</div>
        </div>
        <div class="dola-poc-tip">
          先点“开始记录”，然后在 Dola 正常生成一条 Seedance 2.5 视频。当前阶段只观察，不修改请求。
        </div>
      </div>`;
    (document.body || document.documentElement).appendChild(panel);

    panel.querySelector('#dola-poc-toggle').addEventListener('click', () => {
      state.capturing = !state.capturing;
      persist();
      render();
    });
    panel.querySelector('#dola-poc-clear').addEventListener('click', () => {
      state.events = [];
      persist();
      render();
    });
    panel.querySelector('#dola-poc-export').addEventListener('click', downloadJson);
    panel.querySelector('#dola-poc-collapse').addEventListener('click', () => {
      state.collapsed = !state.collapsed;
      render();
    });
  }

  function render() {
    ensurePanel();
    const panel = document.getElementById('dola-poc-panel');
    const body = panel.querySelector('#dola-poc-body');
    body.hidden = state.collapsed;
    panel.querySelector('#dola-poc-collapse').textContent = state.collapsed ? '+' : '−';
    panel.querySelector('#dola-poc-toggle').textContent = state.capturing ? '停止记录' : '开始记录';
    panel.querySelector('#dola-poc-state-text').textContent = state.capturing ? '正在记录候选请求' : '未开始记录';
    panel.querySelector('#dola-poc-dot').className = state.capturing ? 'on' : '';
    panel.querySelector('#dola-poc-req').textContent = String(count('request'));
    panel.querySelector('#dola-poc-res').textContent = String(count('response'));
    panel.querySelector('#dola-poc-latest-text').textContent = summarizeRequest(latestVideoRequest());
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window || event.origin !== location.origin) return;
    if (event.data?.source !== 'dola-seedance25-poc') return;
    if (!state.capturing) return;
    const payload = event.data.payload;
    if (!payload || typeof payload !== 'object') return;
    state.events.push(payload);
    if (state.events.length > MAX_EVENTS) state.events.splice(0, state.events.length - MAX_EVENTS);
    persist();
    render();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { ensurePanel(); loadState(); }, { once: true });
  } else {
    ensurePanel();
    loadState();
  }
})();
