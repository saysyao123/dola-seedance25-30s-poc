# AGENTS.md

本文件约束 ChatGPT / Codex / 其他代码 Agent 在本仓库中的执行方式。

## 原始目标

验证用户本人当前 Chrome 中已正常登录的 Dola 会话，在账户自身合法权限范围内，是否可以完成 Seedance 2.5 原生 30 秒 T2V 的协议识别、提交、轮询与结果获取，并形成可复用的最小工程。

## 当前默认架构（锁定）

默认用户路径必须是：

```text
用户当前正在使用的 Chrome
→ 保留现有 Google / Dola 登录状态
→ 安装 extension/
→ 打开 Dola 官方页面
→ 页面右侧出现 Seedance Inspector
→ 直接在 Dola 原页面操作
```

**不得默认启动新的 Chrome，不得默认创建新的 user-data-dir，不得默认要求重新登录 Google。**

`src/browser`、`src/web`、Playwright、localhost 只允许作为 Debug fallback。

## 当前阶段

只推进 POC Gate G0–G6。未经明确批准，不升级为账号池、代理池、批量注册或商业化管理软件。

## 锁定规则

1. 不自动注册或批量注册账号。
2. 不绕过验证码、人机验证、账户额度或服务端访问控制。
3. 仅使用用户本人已登录且合法可用的账户会话。
4. 不把 Cookie、Token、Session、浏览器 Profile、原始 HAR 或未脱敏响应提交到 Git。
5. 首选 Chrome Extension Manifest V3 + MAIN world page hook，直接工作在用户当前 Chrome 会话。
6. 不得把 Playwright `launchPersistentContext` 作为默认产品路径；只有扩展无法观察特定链路时才能作为调试备用。
7. 任何网络抓取都先做观察与记录；在未理解请求前，不直接重放未知请求。
8. 所有样本进入仓库前必须脱敏，并能说明脱敏规则。
9. 先证明真实协议，再做 UI、批量、并发和工程美化。
10. 不知道的字段写 `UNKNOWN`，未实际验证的能力写 `EXPERIMENTAL`。

## 验收顺序

- G1：当前 Chrome 扩展注入成功，页面右侧 Inspector 出现
- G2：捕获正常 Seedance 2.5 10s 请求/响应并完成脱敏
- G3：submit / polling / result 链识别
- G4：10s / 30s Request Diff
- G5：30s T2V 实际提交（账户本身允许时）
- G6：最终 MP4 获取与记录

任何 Gate 未通过，都不能写成“已实现”。

## 推荐技术栈

### 默认

- Chrome Extension Manifest V3
- `world: MAIN` page hook
- isolated-world content script UI
- `chrome.storage.local`
- fetch / XMLHttpRequest observation

### Debug fallback

- Node.js 20+
- TypeScript
- Playwright / Chrome DevTools Protocol
- Vitest

## 修改纪律

- 小步提交；一次提交只解决一个明确问题。
- 协议字段来源必须写清：`observed` / `inferred` / `verified`。
- 实测结果同步写入 `docs/TEST_LOG.md`。
- 未验证的信息必须标记为 hypothesis，不得固化成事实。
- 修改 extension 后至少执行：
  - `npm run typecheck`
  - `npm test`
  - `node --check extension/content.js`
  - `node --check extension/page-hook.js`
  - JSON parse `extension/manifest.json`

## 安全自检

每次提交前搜索以下内容：

- `sessionid`
- `ttwid`
- `s_v_web_id`
- `cookie:` / `Cookie:`
- `authorization:` / `Authorization:`
- 长随机 token
- 真实用户 ID、会话 ID、设备 ID

发现真实值时，先删除或替换为 `<REDACTED>`。
