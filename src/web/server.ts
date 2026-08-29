import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import type { BrowserContext } from 'playwright';
import { startObserver } from '../browser/observe.js';

const host = '127.0.0.1';
const port = Number(process.env.WEB_PORT ?? 3210);
const dashboardUrl = `http://${host}:${port}`;

let browserContext: BrowserContext | null = null;
let captureFile: string | null = null;
let lastError: string | null = null;

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

function sendHtml(res: ServerResponse, html: string) {
  res.writeHead(200, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(html);
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

function openDefaultBrowser(url: string) {
  const platform = process.platform;
  if (platform === 'win32') {
    spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
    return;
  }
  if (platform === 'darwin') {
    spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
    return;
  }
  spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
}

function dashboardHtml() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Dola Seedance 2.5 POC</title>
<style>
  body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;background:#f6f7f9;color:#171717;margin:0;padding:32px}
  .wrap{max-width:760px;margin:0 auto}
  .card{background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:24px;box-shadow:0 8px 30px rgba(0,0,0,.05)}
  h1{font-size:26px;margin:0 0 8px}.muted{color:#666;line-height:1.7}
  .status{margin:22px 0;padding:16px;border-radius:12px;background:#f3f4f6;line-height:1.8}
  button{border:0;border-radius:12px;padding:13px 18px;font-size:16px;cursor:pointer;margin-right:10px;margin-bottom:10px}
  .primary{background:#111;color:#fff}.secondary{background:#e5e7eb;color:#111}
  .ok{color:#087c38;font-weight:700}.off{color:#8a3d00;font-weight:700}.err{color:#b42318;white-space:pre-wrap}
  code{background:#f3f4f6;padding:2px 6px;border-radius:6px;word-break:break-all}
  ol{line-height:1.8;padding-left:22px}
</style>
</head>
<body><div class="wrap"><div class="card">
<h1>Dola Seedance 2.5 测试控制台</h1>
<p class="muted">不需要在这里输入 Cookie、Token 或账号密码。点击按钮后会打开一个由本机 Chrome 承载的 Dola 窗口，你只需在那里正常登录和生成视频。</p>
<div id="status" class="status">正在读取状态…</div>
<button id="open" class="primary">打开 Dola 登录 / 测试</button>
<button id="stop" class="secondary">关闭 Dola 观察器</button>
<h3>第一次怎么做</h3>
<ol>
<li>点击“打开 Dola 登录 / 测试”。</li>
<li>在新弹出的 Chrome 窗口里正常登录 Dola。</li>
<li>先正常生成一条 Seedance 2.5 的 10 秒文生视频。</li>
<li>保持本控制台开着；后台只保存本机原始抓取，Git 默认忽略这些文件。</li>
</ol>
<p id="error" class="err"></p>
</div></div>
<script>
async function api(path, options={}){
  const r=await fetch(path,{...options,headers:{'content-type':'application/json',...(options.headers||{})}});
  const j=await r.json();
  if(!r.ok) throw new Error(j.error||('HTTP '+r.status));
  return j;
}
async function refresh(){
  try{
    const s=await api('/api/status');
    document.getElementById('status').innerHTML=
      '<div>观察器：<span class="'+(s.browserRunning?'ok':'off')+'">'+(s.browserRunning?'运行中':'未启动')+'</span></div>'+
      '<div>浏览器：<code>'+(s.browserChannel||'chrome')+'</code></div>'+
      '<div>本地抓取：<code>'+(s.captureFile||'尚未创建')+'</code></div>';
    document.getElementById('error').textContent=s.lastError||'';
  }catch(e){document.getElementById('error').textContent=String(e)}
}
document.getElementById('open').onclick=async()=>{
  document.getElementById('open').disabled=true;
  try{await api('/api/browser/open',{method:'POST',body:'{}'});await refresh()}catch(e){document.getElementById('error').textContent=String(e)}
  finally{document.getElementById('open').disabled=false}
};
document.getElementById('stop').onclick=async()=>{
  try{await api('/api/browser/stop',{method:'POST',body:'{}'});await refresh()}catch(e){document.getElementById('error').textContent=String(e)}
};
refresh();setInterval(refresh,2000);
</script></body></html>`;
}

async function openDolaBrowser() {
  if (browserContext) return;
  lastError = null;
  const dolaUrl = process.env.DOLA_URL ?? 'https://www.dola.com/';
  const profileDir = process.env.DOLA_PROFILE_DIR ?? './user-data/dola-poc';
  const captureDir = process.env.CAPTURE_DIR ?? './captures/raw';
  const browserChannel = process.env.DOLA_BROWSER_CHANNEL ?? 'chrome';
  captureFile = resolve(captureDir, `dola-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`);

  try {
    browserContext = await startObserver({ dolaUrl, profileDir, captureFile, browserChannel });
    browserContext.on('close', () => {
      browserContext = null;
    });
  } catch (error) {
    browserContext = null;
    lastError = error instanceof Error ? error.message : String(error);
    throw error;
  }
}

async function stopDolaBrowser() {
  if (!browserContext) return;
  const current = browserContext;
  browserContext = null;
  await current.close();
}

const server = createServer(async (req, res) => {
  try {
    const method = req.method ?? 'GET';
    const url = new URL(req.url ?? '/', dashboardUrl);

    if (method === 'GET' && url.pathname === '/') {
      sendHtml(res, dashboardHtml());
      return;
    }
    if (method === 'GET' && url.pathname === '/api/status') {
      sendJson(res, 200, {
        browserRunning: Boolean(browserContext),
        browserChannel: process.env.DOLA_BROWSER_CHANNEL ?? 'chrome',
        captureFile,
        lastError,
      });
      return;
    }
    if (method === 'POST' && url.pathname === '/api/browser/open') {
      await readBody(req);
      await openDolaBrowser();
      sendJson(res, 200, { ok: true });
      return;
    }
    if (method === 'POST' && url.pathname === '/api/browser/stop') {
      await readBody(req);
      await stopDolaBrowser();
      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    lastError = error instanceof Error ? error.message : String(error);
    sendJson(res, 500, { error: lastError });
  }
});

server.listen(port, host, () => {
  console.log(`Dola POC dashboard: ${dashboardUrl}`);
  openDefaultBrowser(dashboardUrl);
});

async function shutdown() {
  try { await stopDolaBrowser(); } catch {}
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
