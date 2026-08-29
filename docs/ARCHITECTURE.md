# Architecture

## 当前锁定架构

默认路径已经从 Playwright 独立浏览器切换为：

```text
User's existing Chrome
        │
        │ keeps existing Google / Dola login state
        ▼
Dola official page
        │
        ├── page-hook.js (MAIN world, document_start)
        │       ├── observe fetch
        │       ├── observe XMLHttpRequest
        │       ├── sanitize request bodies
        │       └── sanitize text/json response bodies
        │
        └── content.js (extension isolated world)
                ├── right-side Inspector UI
                ├── local event buffer
                ├── chrome.storage.local
                └── sanitized JSON export
                        │
                        ▼
              Protocol discovery
                        │
                        ├── request classifier
                        ├── submit/poll/result mapper
                        └── 10s vs 30s structured diff
```

## 为什么采用当前 Chrome Extension

### 1. 直接复用用户现有登录态

用户不需要打开新的 Chrome，也不需要重新登录 Google。Dola 登录仍然发生在用户正在使用的 Chrome 和 Dola 官方页面中。

### 2. MAIN world 直接观察页面网络调用

`page-hook.js` 通过 Manifest V3 `world: MAIN` 在页面 JavaScript 上下文中运行，而不是通过 `<script>` 标签动态注入，因此减少页面 CSP 阻止注入的风险。

### 3. UI 与页面 hook 分离

`content.js` 保持在扩展 isolated world，只负责 UI、本地状态与导出。页面协议观察与扩展 UI 互不直接共享 JavaScript 对象，通过 `window.postMessage` 传递已脱敏事件。

### 4. Observe before replay

当前扩展只观察，不修改 Dola 请求。只有真实协议被识别并形成 evidence 后，才讨论 submit adapter。

## 安全策略

默认不采集：

- Cookie header
- Authorization header
- Chrome Cookie store
- localStorage/sessionStorage
- Google/Dola 密码

默认脱敏：

- token
- session/sessionid
- signature/sign
- ttwid
- s_v_web_id
- csrf
- verify
- fingerprint/fp
- device_id
- password/credential/secret

仓库中不得提交真实凭据或原始 HAR。

## Extension 模块

### `extension/manifest.json`

- Manifest V3
- 仅申请 `storage`
- host 仅限 Dola 页面
- `page-hook.js`：MAIN world / document_start
- `content.js`：页面 Inspector / document_idle

### `extension/page-hook.js`

当前负责：

- fetch request observation
- fetch response clone + sanitized text/json body capture
- XMLHttpRequest request/response observation
- 候选视频/API请求筛选
- URL / body 自动脱敏

当前不负责：

- 修改 duration
- 重放请求
- 自动生成
- WebSocket/SSE 深度协议解析（只有确有 evidence 需要时再增加）

### `extension/content.js`

负责：

- Dola 页面右侧 Inspector
- 首次默认自动记录
- request/response count
- 模型/duration 粗识别
- sanitized export

## Debug fallback

以下模块保留，但不是默认入口：

- `src/browser`
- `src/web`
- `src/cli.ts`
- Playwright / CDP

只有在 Chrome Extension 无法观察某个明确链路、且有 evidence 证明需要 DevTools-level 调试时才使用。

## Evidence levels

每个协议字段必须标注：

- `observed`：真实请求中出现
- `inferred`：根据多样本差异推断
- `verified`：已通过实际任务验证

## 下一阶段

1. G1：用户当前 Chrome 安装 extension 并验证 Inspector 出现。
2. G2：正常生成一次 Seedance 2.5 10s T2V，确认 request/response 捕获。
3. G3：从脱敏事件中识别 submit / polling / result。
4. G4：获得可信 30s 样本后再做结构化 Diff。
