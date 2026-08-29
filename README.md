# Dola Seedance 2.5 30s Desktop POC

公开测试仓库，用于验证：在**用户本人合法登录且账户本身具有对应生成权益的会话**中，识别并验证 Seedance 2.5 原生 30 秒 T2V，并逐步形成一个可长期使用、可由 Codex 直接操作的 Windows 多账号桌面工作台。

## 2026-08-29 架构更新

通过对用户提供的“小柴多开器”Windows 安装包进行 clean-room 静态分析，确认其真正的产品架构是：

- Electron 桌面容器
- 每账号独立 persistent session partition
- 每账号独立 Dola WebView/WebContents
- 30 秒 Seedance 2.5 使用独立 desktop/native task lifecycle，而不是只修改网页 `duration`
- SSE acknowledgement → conversation id → conversation chain polling → media result

项目现在进一步加入 **Codex Control Plane**：

```text
Codex / CLI
↓
127.0.0.1 local control plane
↓
Electron Desktop
↓
Account Manager
↓
每账号独立 Dola persistent session
↓
用户首次手动登录
↓
Seedance Task Manager
↓
Provider Adapter
↓
SSE / conversation-chain / result
↓
Queue / History / Download
```

详细分析与控制协议：

- `docs/XIAOCHAI_STATIC_ANALYSIS.md`
- `docs/MULTI_ACCOUNT_DESKTOP_ARCHITECTURE.md`
- `docs/CODEX_CONTROL_PLANE.md`

## 当前阶段

**Phase D0/D1 — Desktop Shell + Codex Control Plane，等待 Windows 人工 Gate。**

当前代码已经实现：

- 多账号 Electron 桌面壳
- 每账号 persistent Chromium partition
- 独立 Dola WebView
- 本地任务队列
- 右侧 Seedance 任务面板
- 仅监听 127.0.0.1 的 Codex Control Plane
- JSON CLI：账号、Provider、任务创建/查询/取消/dispatch

但真实 Dola 自动提交仍然受 D2 Gate 保护：在一个真实账号完成正常 Seedance 2.5 10s 请求生命周期观测前，`dola-web` Provider 不会假装已经实现。

## Desktop Gate

- [ ] D0：Windows 实机启动 Electron 主窗口 + Account Manager + Control Plane
- [ ] D1：Account A 手动登录后重启仍保持登录；Account B 完全隔离
- [ ] D2：捕获 Seedance 2.5 10s T2V baseline，并接入 verified Dola Provider
- [ ] D3：在账户本身允许时验证 30s T2V；权限/额度拒绝则记录并停止
- [ ] D4：SSE / conversation chain / result 生命周期跑通
- [ ] D5：多账号任务队列真实调度
- [ ] D6：Windows x64 打包，普通用户双击使用

只有真实 evidence 才能标记 Gate PASS。

## Codex 快速入口

进入 `apps/desktop`：

```powershell
npm install
npm run check
npm start
```

桌面程序运行后，在第二个终端：

```powershell
npm run studio -- health
npm run studio -- accounts list
npm run studio -- accounts add --name "Dola A"
npm run studio -- accounts open --account "Dola A"
npm run studio -- providers list
npm run studio -- tasks create --account "Dola A" --duration 30 --ratio 9:16 --prompt "..."
npm run studio -- tasks list
```

完整说明见 `docs/CODEX_CONTROL_PLANE.md`。

## 明确不做

- 自动/批量注册账号
- CAPTCHA / MFA / 人机验证绕过
- Google 密码或 TOTP 自动托管
- 指纹伪造规避风控
- 自动轮换账户规避额度、速率或付费限制
- 伪造账户 entitlement
- 上传 Cookie、Token、Session、原始 HAR、浏览器 Profile

## Provider 方向

长期保留两条 Provider：

1. **Dola Web Provider**：多账号 Session、网页能力、任务观察与结果管理；
2. **BytePlus Seedance Provider**：未来作为官方 Seedance 2.5 API 稳定生产线路。

Codex 永远面向统一任务接口，不直接依赖某一版 Dola 页面内部实现。
