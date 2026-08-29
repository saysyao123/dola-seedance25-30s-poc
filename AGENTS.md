# AGENTS.md

本文件约束 ChatGPT / Codex / 其他代码 Agent 在本仓库中的执行方式。

## 原始目标

在用户本人合法持有并可正常使用的账号范围内，验证 Dola Seedance 2.5 原生 30 秒 T2V 的提交、SSE、conversation chain、结果获取，并最终形成一个用户可操作、可由 Codex 直接调用的 Windows 多账号桌面工具。

## 当前架构（2026-08-29 更新）

通过对用户提供的“小柴多开器”安装包进行 clean-room 静态分析，已经确认：真正适合多账号 + 30 秒 POC 的产品形态是 **Electron Desktop**，而不是单纯 Chrome Extension。

新的默认产品路径：

```text
Electron Desktop
→ Account Manager
→ 每账号独立 persistent session partition
→ 每账号一个 Dola WebView/WebContents
→ 用户逐账号手动登录一次
→ Codex Control Plane / CLI
→ Dola request observer / CDP
→ Seedance task lifecycle
→ result/history/download
```

原 `extension/` 保留为协议观察 / Debug 工具，不再是最终产品架构。

## Codex 默认操作方式

从 `apps/desktop` 运行：

```powershell
npm run check
npm start
```

桌面程序运行后，Codex 优先通过本地 CLI 操作，不要优先使用鼠标/DOM 自动化：

```powershell
npm run studio -- health
npm run studio -- accounts list
npm run studio -- accounts open --account "Dola A"
npm run studio -- providers list
npm run studio -- tasks create --account "Dola A" --duration 30 --ratio 9:16 --prompt "..."
npm run studio -- tasks list
npm run studio -- tasks dispatch --id <TASK_ID>
```

完整协议见 `docs/CODEX_CONTROL_PLANE.md`。

控制服务只能绑定 `127.0.0.1`，必须使用随机 Bearer Token；Agent 不得读取、打印或提交 discovery file 中的 token。

## 为什么改变

静态分析表明目标软件的 Seedance 2.5 30 秒链路不只是修改 `duration`：它将 Dola 页面作为登录/UI层，同时由桌面主进程处理独立的 request envelope、SSE 与 conversation-chain 生命周期。

详见：

- `docs/XIAOCHAI_STATIC_ANALYSIS.md`
- `docs/MULTI_ACCOUNT_DESKTOP_ARCHITECTURE.md`
- `docs/CODEX_CONTROL_PLANE.md`

## 安全与产品边界

1. 不自动注册或批量注册账号。
2. 不绕过 CAPTCHA、人机验证、MFA、账户额度、付费限制或服务端访问控制。
3. 不实现用于规避风控的指纹伪造。
4. 不实现自动账号轮换来逃避单账号额度/速率限制。
5. 不保存 Google 密码或 TOTP Secret。
6. 每个账号由用户在可见 WebView 中首次手动登录。
7. 登录态由对应 Chromium persistent partition 本地持久化。
8. 不把 Cookie、Token、Session、浏览器 Profile、原始 HAR 或未脱敏响应提交到 Git。
9. 若服务端对 30 秒返回 `permission / quota / entitlement` 拒绝，记录失败并停止，不尝试绕过。
10. 任何未知字段标记 `UNKNOWN`，未实测能力标记 `EXPERIMENTAL`。
11. Codex Control Plane 只能操作账号元数据、任务元数据和已验证 Provider；不得暴露浏览器凭据。
12. 在 D2 未通过前，`dola-web` 的 `tasks dispatch` 必须保持 Gate 阻断，不允许通过猜测隐藏字段直接启用。

## 开发 Gate

### D0 — Electron shell

- Electron 主窗口启动
- Account Manager UI
- 创建/删除/切换账号
- 每账号 persistent partition
- 本地 Codex Control Plane / CLI 启动

### D1 — Manual login persistence

- Account A 手动登录 Dola
- 重启后仍登录
- Account B 与 A Session 完全隔离
- Codex CLI 可以切换/打开指定账号，但不能代填 Google 密码/MFA

### D2 — 10s baseline observation

- 用户正常用 Dola UI 生成 Seedance 2.5 10s T2V
- 捕获并标准化 model / duration / ratio / conversation 生命周期
- 实现 `dola-web` Provider 的第一版 verified dispatch adapter

### D3 — 30s capability POC

- 仅在账户本身允许的情况下尝试 Seedance 2.5 30s T2V
- 成功则保存 SSE/conversation/task evidence
- 服务端拒绝则记录真实错误并停止

### D4 — Result lifecycle

- conversation chain polling
- 终态识别
- 媒体结果解析
- 本地任务历史

### D5 — Multi-account task queue

- 用户明确为任务选择账号
- 默认每账号同时 1 个生成任务
- Codex 可通过 CLI 创建/查询/取消/观察任务
- 不自动依据剩余额度轮换账号

### D6 — Windows package

- 打包 portable/installable Windows x64 应用
- 普通用户无需安装 Node.js
- 打包后仍保留本地 Codex CLI/Control Plane 契约

任何 Gate 未通过，都不能写成“已实现”。

## 技术栈建议

- Electron
- TypeScript（后续重构目标；当前 POC 可继续 JS）
- Renderer：轻量 HTML/React 均可，以可维护性优先
- Electron persistent `session` partitions
- WebContents / WebView
- Chrome DevTools Protocol，仅用于当前账号自己的页面观察与正常任务集成
- SQLite 或本地 JSON（第一版优先 JSON）
- 本地 loopback HTTP Control Plane + CLI
- Vitest

`playwright` 只允许作为测试/Debug 工具，不作为账号长期运行容器。

## Provider 设计

不要把业务完全写死在 Dola：

```text
VideoProvider
├── DolaWebProvider
└── BytePlusSeedanceProvider (future / official)
```

Codex 面向稳定的任务接口调用 Provider，不直接依赖 Dola 页面内部字段。

## 修改纪律

- 小步提交；一次提交只解决一个明确 Gate。
- 协议字段来源必须写清：`observed` / `inferred` / `verified`。
- 实测结果同步写入 `docs/TEST_LOG.md`。
- 不复制用户上传商业软件的专有源码；只依据 clean-room 行为/架构结论自行实现。
- 不把平台安全签名、反滥用字段、真实身份令牌提交到仓库。
- 修改 Provider 内部实现时，尽量保持 `docs/CODEX_CONTROL_PLANE.md` 中的 CLI/HTTP 控制契约稳定。

## 安全自检

每次提交前搜索以下内容：

- `sessionid`
- `ttwid`
- `s_v_web_id`
- `cookie:` / `Cookie:`
- `authorization:` / `Authorization:`
- 真实 access/refresh token
- 真实用户 ID、会话 ID、设备 ID
- Google password / TOTP Secret
- Control Plane 实际 bearer token

发现真实值时，立即删除或替换为 `<REDACTED>`。
