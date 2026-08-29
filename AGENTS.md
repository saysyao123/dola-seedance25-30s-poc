# AGENTS.md

本文件约束 ChatGPT / Codex / 其他代码 Agent 在本仓库中的执行方式。

## 原始目标

验证 Dola 账户在其自身合法权限范围内，是否可通过本地浏览器会话完成 Seedance 2.5 原生 30 秒 T2V 的提交、轮询与结果下载，并形成可复用的最小工程。

## 当前阶段

只推进 POC Gate G0–G6。未经明确批准，不升级为账号池、代理池、批量注册或商业化管理软件。

## 锁定规则

1. 不自动注册或批量注册账号。
2. 不绕过验证码、人机验证、账户额度或服务端访问控制。
3. 仅使用用户本人已登录且合法可用的账户会话。
4. 不把 Cookie、Token、Session、浏览器 Profile、原始 HAR 或未脱敏响应提交到 Git。
5. 优先连接用户本地已经登录的 Chrome/Chromium；不要要求用户把完整 Cookie 粘贴到聊天或源码。
6. 任何网络抓取都先做观察与记录；在未理解请求前，不直接重放未知请求。
7. 所有样本进入仓库前必须脱敏，并能说明脱敏规则。
8. 先证明核心链路，再做 UI、批量、并发和工程美化。

## 验收顺序

- G1：浏览器连接
- G2：网络捕获与脱敏
- G3：提交/轮询/结果链识别
- G4：10s/30s Request Diff
- G5：30s T2V 实际提交（账户本身允许时）
- G6：最终 MP4 获取与记录

任何 Gate 未通过，都不能写成“已实现”。

## 推荐技术栈

- Node.js 20+
- TypeScript
- Playwright / Chrome DevTools Protocol
- Vitest 或 Node test runner

## 修改纪律

- 小步提交；一次提交只解决一个明确问题。
- 新增协议字段前，必须在 `docs/REQUEST_ANALYSIS.md` 写清来源：观察值 / 推断值 / 已验证值。
- 实测结果同步写入 `docs/TEST_LOG.md`。
- 未验证的信息必须标记为 hypothesis，不得固化成事实。

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
